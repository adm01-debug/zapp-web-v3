## Diagnóstico

A tela mostra **wpp2 — Conectado / Saudável (798ms)**, mas na prática a Evolution API não está realmente conectada ao WhatsApp.

A causa está em `supabase/functions/connection-health-check/index.ts`:

```text
GET /instance/connectionState/{instance}
  → state === 'open'   ⇒ status = 'connected', health = 'healthy'
  → state === 'close'  ⇒ disconnected
  → outro              ⇒ degraded
```

**Problema:** `state === 'open'` na Evolution significa apenas que **a instância existe e o socket interno está aberto** — não garante que o número esteja pareado nem que o WhatsApp Web esteja entregando eventos. Cenários comuns que retornam `open` mas estão "fantasmas":

- Pareamento perdido no celular sem o servidor detectar ainda
- Sessão expirada (Baileys mantém o socket aberto até o próximo erro)
- Banimento/bloqueio temporário do número
- Webhook quebrado (o servidor "acha" que está bem mas nada chega ao FATOR X)

Hoje o sistema só descobre o problema quando o usuário tenta enviar e falha.

## Solução: Health check de 3 camadas

Substituir o critério único (`state === 'open'`) por uma validação combinada que reflete o estado real:

### Camada 1 — Socket (já existe)
`GET /instance/connectionState/{instance}` → `state === 'open'`

### Camada 2 — Identidade do número (NOVA)
`GET /instance/fetchInstances?instanceName={instance}` deve retornar:
- `instance.owner` (JID do número conectado, ex.: `5511...@s.whatsapp.net`) **presente e não vazio**
- `instance.profileName` ou `instance.profilePicUrl` populados

Se `state === 'open'` mas `owner` está vazio → conexão **fantasma** → marcar como `degraded` com motivo `phantom_session`.

### Camada 3 — Atividade recente do webhook (NOVA)
Consultar no FATOR X via RPC a última mensagem/evento da instância:
- Se a última mensagem é de **> 30 min atrás** E o último webhook event também → marcar como `degraded` com motivo `webhook_silent` (não derruba para `disconnected` porque pode ser baixo tráfego, mas alerta).
- Se a última mensagem é de **> 6 horas atrás** → marcar como `disconnected` mesmo com socket open.

### Mapeamento final de `health_status`

| Socket | Owner JID | Atividade webhook | health_status | status DB |
|---|---|---|---|---|
| open | presente | < 30min | `healthy` | connected |
| open | presente | 30min–6h | `degraded` (webhook_silent) | connected |
| open | presente | > 6h | `disconnected` (stale) | disconnected |
| open | **ausente** | qualquer | `degraded` (phantom_session) | disconnected |
| close | — | — | `disconnected` | disconnected |
| timeout / error | — | — | `timeout`/`error` | disconnected |

## Mudanças

### 1. Edge function `connection-health-check`
Adicionar:
- Chamada paralela a `fetchInstances?instanceName=...` para obter `owner`/`profileName`
- Chamada ao FATOR X (`externalClient` via service role) para `MAX(created_at)` em `evolution_messages` e/ou tabela de webhook events da instância
- Lógica combinada acima, gravando o motivo em `connection_health_logs.error_message` (ex.: `"phantom_session: socket open but no ownerJid"`)

### 2. Persistir motivo de degradação
Adicionar coluna `health_reason TEXT` em `whatsapp_connections` (migration) para o frontend exibir o porquê. Valores: `phantom_session`, `webhook_silent`, `stale_session`, `socket_closed`, `timeout`, `null`.

### 3. UI — `ConnectionCard.tsx`
- Quando `health_status === 'degraded'` ou houver `health_reason`, exibir tooltip explicativo ao lado do badge "Saudável/Degradado" (ex.: "Socket aberto mas número não pareado — reconecte via QR").
- Quando `phantom_session`, mudar o badge "Conectado" para "Atenção" (cor amber) e habilitar o botão "Ver QR Code" mesmo com `status === 'connected'`.

### 4. Botão manual "Verificar agora"
No `ConnectionCard`, adicionar um item de menu "Verificar conexão" que chama `connection-health-check` para a instância específica (passar `instanceName` no body) e atualiza só aquela linha — útil para o usuário forçar uma reavaliação imediata.

### 5. Teste
Edge function test em `supabase/functions/connection-health-check/__tests__/` cobrindo:
- socket open + owner ausente → degraded/phantom
- socket open + owner ok + sem mensagens > 6h → disconnected/stale
- socket open + owner ok + mensagem recente → healthy
- socket close → disconnected

## Detalhes técnicos

- A query no FATOR X usa `externalClient` com service role (já configurado em `_shared/`); precisamos uma RPC nova `rpc_last_activity_for_instance(p_instance text)` retornando `{ last_message_at, last_event_at }` — peça ao operador do FATOR X criar, ou no curto prazo fazemos `externalClient.from('evolution_messages').select('created_at').eq('instance_name', instance).order('created_at', { ascending: false }).limit(1)` (RLS bloqueia, então precisa rodar via service-role na edge function — usar `EXTERNAL_SUPABASE_SERVICE_ROLE_KEY` se disponível; caso contrário criar a RPC).
- A migration adiciona somente `health_reason TEXT NULL` — sem CHECK constraint (validação na edge function).
- A `health_reason` entra no realtime payload existente (já escutado pelo `useConnectionsManager`).

## Resultado esperado

Após o deploy, em ~5 min (próximo cron do health-check) o card do `wpp2` deve refletir o estado real: se a Evolution está realmente conversando com o WhatsApp, continua "Saudável"; se for sessão fantasma, vira "Atenção / Reconecte" com o motivo visível.
