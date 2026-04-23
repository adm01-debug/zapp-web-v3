

## Dead-Letter Queue automática para envios da Evolution API

A tabela `failed_messages`, a edge function `reprocess-failed-messages` e o cron de 15 min **já existem**. Faltam três peças para fechar o ciclo: **enqueue automático**, **RLS correto para service role**, **painel admin** e **cleanup**.

### O que muda

#### 1. Backend — enqueue automático

**A. Helper novo `supabase/functions/_shared/enqueue-failed-message.ts`**
- Função `enqueueFailedMessage({ instance_name, remote_jid, path, payload, http_status, error_code, error_message })`.
- Usa service role, fire-and-forget, nunca relança erro.
- Filtro: só enquileira se for **POST de envio** (`/message/*`) **e** o erro for **transitório** (`5xx`, `429`, timeout, `network_error`). Nunca enquileira `400/401/403/404/422` — esses falham permanentemente.
- Persiste `payload` com chave extra `__path` para o reprocesso saber a rota original.

**B. Instrumentar `_shared/evolution-api-proxy.ts`**
- Nos pontos onde já existe métrica de retry (`final_status === 'failed'` em POST com `/message/`, e `final_status === 'exhausted'`), chamar `enqueueFailedMessage(...)`.
- `max_retries=5`, `next_attempt_at = now() + 60s` (primeira tentativa rápida).

#### 2. Banco — RLS + cleanup

**Migração nova:**
- Adicionar policy: `INSERT/UPDATE` permitido também via `service_role` (atualmente só admin pode inserir, então as edge functions falham silenciosamente).
- Adicionar policy `SELECT` para supervisores (não só admins).
- Função `cleanup_old_failed_messages()` — purga linhas com `status IN ('succeeded','abandoned')` há mais de **30 dias**.
- Cron diário (3:15 UTC) chama o cleanup.

#### 3. Edge function `reprocess-failed-messages` (já existe)

Pequenos ajustes:
- Garantir que devolva contagem por status no JSON (já faz).
- Logar com prefixo `[dlq-reprocess]` cada item processado para auditoria via `edge_function_logs`.

#### 4. Frontend — Painel admin

**Hook novo `src/hooks/monitoring/useFailedMessages.ts`**
- React Query, lista paginada (50), filtros: status, instância, janela (1h/24h/7d).
- Realtime via `postgres_changes` na tabela.
- Mutation `retryNow(id)` → seta `next_attempt_at = now()`, `status = 'retrying'`.
- Mutation `abandon(id)` → seta `status = 'abandoned'`.
- Mutation `triggerReprocess()` → invoca a edge function manualmente.

**Componente novo `src/components/monitoring/DLQPanel.tsx`**
- 4 KPIs: pendentes, em retry, abandonadas (24h), taxa de sucesso pós-retry.
- Tabela: instância | destinatário | tipo (derivado de `payload.__path`) | tentativas | status | erro (truncado) | última tentativa | próxima tentativa | ações (Retry agora / Abandonar).
- Botão global **"Reprocessar agora"** (chama a edge function).
- Linha expandível para ver `payload` formatado e mensagem de erro completa.
- Empty state padrão `GenericEmptyState`.

**Integração**
- Adicionar `DLQPanel` em `MonitoringWebhookPanel.tsx`, abaixo do `RetryMetricsPanel`.

### Critérios de aceite

- POST `send-text` que falha com 503 três vezes (retry server-side esgotado) cria automaticamente uma linha em `failed_messages` com `status='pending'`, `payload` contendo o body original + `__path`.
- Erros 401/403/400 **não** geram linha (são permanentes, já capturados no painel de incidentes).
- Cron `reprocess-failed-messages-15min` retoma o item; se Evolution responder 200, `status` vira `succeeded`.
- Após 5 tentativas → `status='abandoned'`; admin vê na tabela e pode reabrir manualmente.
- Não-admin/não-supervisor não acessa o painel (RLS + UI já protegida pela rota `/admin`).
- Cleanup remove sucessos/abandonados >30 dias.

### Arquivos

**Novos**
- `supabase/migrations/<ts>_failed_messages_rls_cleanup.sql`
- `supabase/functions/_shared/enqueue-failed-message.ts`
- `src/hooks/monitoring/useFailedMessages.ts`
- `src/components/monitoring/DLQPanel.tsx`

**Editados**
- `supabase/functions/_shared/evolution-api-proxy.ts` — chamar `enqueueFailedMessage` nos pontos de falha de POST `/message/*`
- `supabase/functions/reprocess-failed-messages/index.ts` — logs `[dlq-reprocess]`
- `src/components/monitoring/MonitoringWebhookPanel.tsx` — montar `<DLQPanel />`

### Riscos & mitigação

- **Volume excessivo** se Eco cair longamente → filtro restritivo (só transitórios) + `max_retries=5` + cleanup 30d.
- **Mensagens duplicadas** se Eco processar mas timeout no retorno → reprocesso usa o mesmo payload sem `messageId` novo; Evolution já dedup por janela curta. Aceitável dado que é DLQ (último recurso).
- **Loop com cron** → `next_attempt_at` com backoff exponencial (já implementado na função existente); cron só processa itens com `next_attempt_at <= now()`.
- **Vazamento de payload sensível** → `failed_messages` só leitura admin/supervisor (RLS). Painel admin já está atrás de `/admin`.

