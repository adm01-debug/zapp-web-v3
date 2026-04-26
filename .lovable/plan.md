## Conector Evolution API "Modo Oficial" (WhatsApp Cloud API / Meta)

Hoje o sistema já tem o **flag** `api_type = 'official' | 'evolution'` em `whatsapp_connections` e a UI permite alternar, mas **não existe integração real** com a API oficial. Toda mensagem outbound passa pela Evolution (`evolution-api` edge function → `send-text`/`send-media`) e toda mensagem inbound chega pelo `evolution-webhook`. O modelo de dados (`evolution_messages`, `evolution_contacts`, `evolution_conversations` no FATOR X) é o ponto de unificação.

O objetivo é plugar o WhatsApp Cloud API oficial (Meta Graph) **sem mudar uma linha** dos hooks/UI do Inbox: toda mensagem oficial cai no mesmo schema FATOR X, a UI continua agnóstica.

### Arquitetura

```text
                 ┌─────────────── Inbox UI / hooks ───────────────┐
                 │  (sem mudanças — fala apenas em "rpc_*"        │
                 │   e em "evolution-api" via supabase.functions) │
                 └────────────────────┬───────────────────────────┘
                                      │
                       ┌──────────────▼───────────────┐
                       │   provider-router (existe,    │
                       │   estendido)                  │
                       │   lê api_type da connection   │
                       └──────┬───────────────┬───────┘
                              │               │
                  api_type=evolution     api_type=official
                              │               │
                  ┌───────────▼───┐   ┌───────▼─────────┐
                  │ evolution-api │   │ whatsapp-cloud- │
                  │   (atual)     │   │  api  (NOVO)    │
                  └───────┬───────┘   └────────┬────────┘
                          │                    │
                Evolution server          graph.facebook.com
                          │                    │
                evolution-webhook        whatsapp-cloud-webhook (NOVO)
                          │                    │
                          └────────┬───────────┘
                                   ▼
                       FATOR X — evolution_messages
                       (mesmo schema, mesma tabela)
```

### O que será criado

1. **Tabela `whatsapp_official_credentials`** (Lovable Cloud)
   - `connection_id` (FK → whatsapp_connections, unique)
   - `phone_number_id`, `waba_id`, `business_account_id`
   - `access_token` (criptografado — service role only via RLS)
   - `app_secret` (para validar webhook X-Hub-Signature)
   - `verify_token` (para handshake do webhook Meta)
   - RLS: SELECT/UPDATE só admin; service_role acessa nas edge functions

2. **Edge function `whatsapp-cloud-api`** (NOVA)
   - Mesma assinatura externa que `evolution-api` (`{ action, instanceName, number, text, ... }`)
   - Ações suportadas: `send-text`, `send-media`, `send-audio`, `send-sticker`, `send-template`, `mark-read`, `send-reaction`, `presence`
   - Traduz para Graph API: `POST https://graph.facebook.com/v21.0/{phone_number_id}/messages`
   - Após resposta OK, **insere via `rpc_insert_message`** no FATOR X com mesmo formato (`from_me=true`, `direction=outbound`, `message_id` = wamid retornado pela Meta)
   - Mesmo envelope de resposta usado pela `evolution-api` (`{ key: { id }, status }`) para que `externalMessageSender.ts` continue funcionando sem if/else

3. **Edge function `whatsapp-cloud-webhook`** (NOVA)
   - GET → handshake (echo `hub.challenge` quando `hub.verify_token` bate)
   - POST → valida `X-Hub-Signature-256` com `app_secret`
   - Normaliza payload Meta → mesmo shape que os handlers Evolution já usam (`messages.upsert`, `messages.update`, `contacts.upsert`)
   - Reusa `handleIncomingMessage` de `_shared/evolution-webhook-messages.ts` (refatorado para aceitar payload já normalizado) → grava em `evolution_messages` via `rpc_insert_message`
   - Grava status delivery (`sent` / `delivered` / `read` / `failed`) atualizando `evolution_messages.status`

4. **Roteador de envio** — pequeno wrapper em `src/hooks/realtime/messageSender.ts`
   - Antes de invocar `evolution-api`, lê `connection.api_type`
   - Se `official` → invoca `whatsapp-cloud-api` (mesma shape de body)
   - Se `evolution` → comportamento atual
   - **Nada mais muda** no hook/UI

5. **UI de configuração da credencial oficial**
   - Em `ConnectionsView`, quando `api_type='official'` e sem credencial, mostrar botão "Configurar Cloud API"
   - Dialog com campos: Phone Number ID, WABA ID, Access Token, App Secret, Verify Token
   - Botão "Testar conexão" → chama `whatsapp-cloud-api` action `ping` (faz GET no `phone_number_id` na Graph API)
   - Mostra a URL do webhook a configurar no painel da Meta

### Detalhes técnicos

- **Mapping Meta → modelo unificado** (gravado em `evolution_messages`):
  - `wamid` (Meta) → `message_id`
  - `from` (E.164) → `remote_jid` = `<numero>@s.whatsapp.net`
  - `text.body` → `content`, `message_type='text'`
  - `image/audio/video/document` → baixar via `media_id` Graph API → upload no bucket `whatsapp-media` (já existente) → URL persistida em `media_url`
  - `interactive` / `button_reply` / `list_reply` → `message_type='interactive'`, payload completo em `metadata`
  - Status callbacks → UPDATE em `evolution_messages.status`
- **Idempotência**: usar `wamid` como chave (já é unique no schema), retry seguro
- **Templates**: action `send-template` para mensagens fora da janela 24h (obrigatório na Cloud API)
- **Rate limit**: respeitar `429` da Meta com backoff, mesmo padrão do `external-db-proxy`
- **Telemetria**: registrar em `provider_call_logs` (já existe) com `provider_type='whatsapp_cloud'`
- **CORS / auth**: `verify_jwt = false` no webhook (Meta não envia JWT); validação por HMAC obrigatória

### Arquivos

**Criar:**
- `supabase/functions/whatsapp-cloud-api/index.ts` — proxy para Graph API
- `supabase/functions/whatsapp-cloud-webhook/index.ts` — receiver Meta
- `supabase/functions/_shared/whatsapp-cloud-normalizer.ts` — Meta payload → modelo Evolution
- `src/components/connections/OfficialApiConfigDialog.tsx` — UI de credenciais
- `supabase/config.toml` — adicionar bloco `verify_jwt = false` para o webhook
- Migração: tabela `whatsapp_official_credentials` + RLS + função `get_official_credentials(connection_id)` security definer

**Editar:**
- `src/hooks/realtime/messageSender.ts` — escolher edge function por `api_type`
- `src/hooks/realtime/externalMessageSender.ts` — idem
- `src/components/connections/ConnectionCard.tsx` — botão "Configurar Cloud API" quando oficial
- `supabase/functions/_shared/evolution-webhook-messages.ts` — extrair `handleIncomingMessage` para receber payload pré-normalizado (refator mínimo)

### O que NÃO muda

- Schema `evolution_messages` / `evolution_contacts` no FATOR X
- Nenhum componente do Inbox, Kanban, CRM, Reports
- RPCs FATOR X (continuam sendo chamadas pelas mesmas edges)
- Sticky agent, roteamento, SLA, CSAT — todos agnósticos

### Critério de aceite

1. Criar conexão com `api_type='official'`, configurar credenciais Meta, clicar "Testar" → toast de sucesso
2. Enviar texto pelo Inbox numa conversa dessa conexão → mensagem aparece no FATOR X com `message_type='text'`, `from_me=true`, `message_id=wamid`
3. Receber texto da Meta no webhook → conversa nova/atualizada no Inbox em <2s, igual ao fluxo Evolution
4. Receber callback de status `delivered`/`read` → checkmarks atualizam em tempo real (realtime já existente)
5. Conexões `evolution` continuam funcionando sem regressão
