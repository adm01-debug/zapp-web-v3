# Sincronização de conversas WhatsApp no Inbox

## Diagnóstico

A sincronização **já está totalmente implementada** no projeto (ver `useExternalEvolution`, `useRealtimeInbox`, `useMessageStatus`, `ChatPanel`, `ConversationList`, `ConversationHistory`, `useAgentReassignment`, RPCs `rpc_list_conversations` / `rpc_list_messages` no FATOR X). O motivo do inbox estar vazio agora é operacional, não de feature:

1. **Env do FATOR X ausente no preview** — `VITE_EXTERNAL_SUPABASE_URL` e `VITE_EXTERNAL_SUPABASE_ANON_KEY` não estão definidas, gerando o crash `Uncaught Error: External Supabase is not configured` e travando hooks que usam `getExternalSupabase()`.
2. **Cascata de "Failed to fetch"** — vista nos runtime errors, vinda do `external-db-proxy` que perde a base por causa do erro acima e do recente CORS.
3. **Edge function `external-db-proxy` precisa estar servindo as RPCs do FATOR X** que o inbox consome (`rpc_list_conversations`, `rpc_list_messages`, `rpc_get_contact`).

## O que vou fazer

### 1. Corrigir crash do `externalClient`
- `src/integrations/supabase/externalClient.ts`: tornar `getExternalSupabase()` tolerante (logar warning + retornar `null`) em vez de lançar, para os hooks fallback-arem para o proxy server-side em vez de derrubar a aplicação.
- Hooks que ainda chamam `getExternalSupabase()` direto passam por `queryExternalProxy` (que usa o edge function com service role).

### 2. Garantir que o inbox usa 100% o caminho server-side
- Auditar `useExternalEvolution`, `useRealtimeInbox` e `externalMessageSender` para que toda leitura/escrita de `evolution_*` vá pelo `external-db-proxy` (já é o padrão; corrigir qualquer ponto que ainda use cliente direto).
- Reaproveitar `invokeViaFetch` (correção de proxy + CORS já aplicada nas mensagens anteriores).

### 3. Validar pipeline ponta-a-ponta
- Conferir o `external-db-proxy/index.ts` aceita `rpc_list_conversations`, `rpc_list_messages`, `rpc_get_contact` e `rpc_insert_message`.
- Smoke test via `supabase--curl_edge_functions` para `rpc_list_conversations({instance:'wpp2', limit:50})` confirmar retorno.
- Garantir que `useRealtimeInbox` assina os canais `evolution_messages` e `evolution_contacts` via `externalClient` (quando configurado) **ou** via polling cursor-forward já existente (`useMessagesCursor`) quando não.

### 4. Inbox UI por atendente
Já existente, apenas validar funcionando após fix:
- **Lista de conversas** (`ConversationListSidebar`) com filtro por `assigned_to = userEmail` (sticky agent).
- **Mensagens + status** (`ChatMessageBubble` + `useMessageStatus`) com sent/delivered/read/played.
- **Histórico do atendente** (`ConversationHistory` + abas Atendendo/Aguardando/Resolvidos do `inbox/navigation-and-ticket-tabs`).
- **Reatribuição** (`AgentReassignmentPanel`) usando `rpc_upsert_contact` com `assigned_to`.

### 5. Painel de status de sync
- Verificar `AdminInboxSyncStatusPage` mostra `v_webhook_health` + last sync timestamp para o operador validar.

## Arquivos que devo tocar

- `src/integrations/supabase/externalClient.ts` — tornar tolerante a env ausente.
- `src/hooks/useExternalEvolution.ts` — confirmar 100% via `queryExternalProxy`; remover qualquer `getExternalSupabase()` direto.
- `src/hooks/useRealtimeInbox.ts` — guardar realtime subscribe atrás de `isExternalConfigured`.
- `supabase/functions/external-db-proxy/index.ts` — verificar allowlist das RPCs.
- (opcional) `src/pages/admin/AdminInboxSyncStatusPage.tsx` — banner amarelo quando env do FATOR X faltar.

## Validação

1. Recarregar `/inbox` — não deve haver mais `Uncaught Error: External Supabase is not configured`.
2. Conversas listam via `rpc_list_conversations`.
3. Abrir um chat → mensagens carregam via `rpc_list_messages` com cursor.
4. Status sent/delivered/read aparece nos balões.
5. `AdminInboxSyncStatusPage` mostra última sync e webhook health verde.

## Pergunta operacional (não bloqueia o plano)

Após a correção de código, vou precisar que você forneça (ou confirme já estarem cadastradas em Lovable Cloud) as variáveis `VITE_EXTERNAL_SUPABASE_URL=https://tdprnylgyrogbbhgdoik.supabase.co` e `VITE_EXTERNAL_SUPABASE_ANON_KEY=<anon do FATOR X>` para o realtime subscribe funcionar 100%. Sem elas o sistema funciona via proxy (polling), mas perde realtime push.
