

## Estado de UI para envios com retry por conversa

Hoje o status de envio só tem `pending|sent|delivered|read|failed` (vide `MessageStatus.tsx` e `useMessageStatus.ts`). Quando `invokeEvolutionWithRetry` faz backoff, o usuário não vê "tentando 2/3", e quando falha por 401/403 o motivo fica escondido em `failed` genérico. Vamos ampliar o vocabulário de status e expor isso no balão de mensagem.

### Novos estados

| Status | Quando |
|---|---|
| `sending` | Insert no DB, antes da chamada Evolution |
| `retrying` | `onRetry` do `invokeEvolutionWithRetry` disparou (1ª/2ª tentativa) |
| `failed_auth` | Resposta 401/403 da Evolution (não-transitório) |
| `failed_retries` | Esgotou `maxRetries` em erro transitório |
| `failed` | Falha definitiva genérica (mantém compat) |
| `sent` / `delivered` / `read` | Inalterados |

### Camadas a tocar

**1. Bus client-side de status de envio** (novo `src/hooks/realtime/sendStatusBus.ts`)
- `Map<messageId, { status, attempt?, totalRetries?, errorCode?, errorReason? }>`
- Pub/sub simples (`subscribe(messageId, cb)` + `emit`).
- Necessário porque `retrying` é estado *transiente* que não vai para o DB (não queremos sobrescrever `status` final). Persistência fica só para estados terminais.

**2. `messageSender.ts`**
- Emitir no bus em cada transição:
  - Após insert → `emit(id, { status: 'sending' })`.
  - Dentro de `onRetry(attempt, total)` → `emit(id, { status: 'retrying', attempt, totalRetries: total })`.
  - Em sucesso → `emit(id, { status: 'sent' })` (e DB já atualiza).
  - Em erro: detectar 401/403 olhando `apiError.status` e mensagens (`unauthorized`, `forbidden`) → `emit(id, { status: 'failed_auth', errorCode: 401|403, errorReason })` e gravar `status='failed_auth'` no DB.
  - Em erro transitório que esgotou retries → `failed_retries` + DB.
- Toast atual de "Conexão instável" continua, mas pula se já houver outro toast no minuto (dedup leve via timestamp por contato).

**3. Schema (migration)**
- Ampliar enum/check de `messages.status` para incluir `sending`, `retrying`, `failed_auth`, `failed_retries`. Hoje a coluna é texto livre conforme `useMessageStatus` (sem CHECK), confirmar via `read_query` antes — se houver CHECK, migrar; se não, só atualizar tipos TS.
- Adicionar colunas opcionais: `error_code text`, `error_reason text` em `messages` (úteis para o painel admin de failed_messages já existente).

**4. `useMessageStatus.ts`**
- Tipo `MessageUIStatus = 'sending'|'retrying'|'sent'|'delivered'|'read'|'failed'|'failed_auth'|'failed_retries'`.
- Merge: status do bus (transiente) tem prioridade sobre status do DB para `retrying`/`sending`; estados terminais vêm do DB (via realtime já existente).
- Expor `getMessageStatusDetail(id)` retornando `{ status, attempt?, totalRetries?, errorCode?, errorReason? }`.

**5. `MessageStatus.tsx`**
- Estender `statusConfig` com:
  - `retrying`: ícone `RefreshCw` animado (spin), cor `text-warning`, label `Tentando ${attempt}/${total}…`.
  - `failed_auth`: ícone `ShieldAlert`, cor `text-destructive`, label `Falha de autenticação (${code})`.
  - `failed_retries`: ícone `AlertCircle`, cor `text-destructive`, label `Falhou após ${total} tentativas`.
- Aceitar prop opcional `detail?: { attempt?, totalRetries?, errorCode? }` para compor o tooltip.

**6. Ação "Reenviar" no balão**
- Em `MessageBubble` (consumidor de `MessageStatus`), quando status ∈ {`failed`, `failed_auth`, `failed_retries`}, mostrar botão pequeno "Reenviar" que chama `sendMessageToContact` novamente com o conteúdo original e marca a mensagem antiga como substituída (não regravar — apenas novo insert).
- Para `failed_auth`, o botão abre dica: "Verifique a conexão WhatsApp" (link para `/admin/instance-pauses`).

**7. Indicador agregado por conversa/telefone**
- Em `useRealtimeMessages` adicionar derivado `conversationSendState[contactId]`:
  - `retrying` se houver qualquer mensagem `retrying` agora.
  - senão `failed` se a última outbound terminou em qualquer falha.
  - senão `idle`.
- Consumido em `ChatPanelHeader` para uma micro-pílula ao lado do nome ("Tentando reenviar…" / "Última mensagem falhou").

### Detalhes técnicos

- Detecção de auth no Evolution: `apiResult.status` 401/403, ou string `unauthorized`/`forbidden`/`invalid token` no `apiResult.message`. Reaproveitar lógica do `instance-pause` shared não é necessário no client.
- `evolutionSendRetry.ts` não muda: já chama `onRetry`. Apenas o caller passa um callback mais rico (com `attempt`/`total`).
- Bus é em memória (perdido em reload). Estados terminais persistem no DB → após reload o usuário vê `failed_auth`/`failed_retries` corretamente.
- Performance: bus usa `Set<callback>` por `messageId`; cleanup no `unmount` da bolha.

### Arquivos

Criar:
- `src/hooks/realtime/sendStatusBus.ts`
- `supabase/migrations/<ts>_extend_message_status.sql`

Editar:
- `src/hooks/realtime/messageSender.ts` (emit + classificação de erro)
- `src/hooks/useMessageStatus.ts` (merge bus + DB, novo tipo)
- `src/components/inbox/MessageStatus.tsx` (3 novos estados + tooltip detalhado)
- `src/components/inbox/chat/MessageBubble.tsx` (botão Reenviar + uso da nova prop)
- `src/components/inbox/chat/ChatPanelHeader.tsx` (pílula agregada)
- `src/hooks/useRealtimeMessages.ts` (derivado `conversationSendState`)
- `src/integrations/supabase/types.ts` (auto após migration)

### Fora de escopo
- Não mudo `evolutionSendRetry.ts` nem o backoff.
- Não mexo no painel `failed_messages` (já existe e continuará lendo `error_reason`/`error_code` quando preenchidos).
- Sem alteração nas edge functions.

