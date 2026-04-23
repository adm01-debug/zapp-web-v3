

## Logs e métricas de retry do Evolution API

Instrumentar o retry server-side com logs estruturados e uma tabela de métricas agregadas, expostos no painel de Saúde do Webhook.

### Backend

#### 1. Nova tabela `evolution_retry_metrics` (Lovable Cloud)

```
id uuid pk
action text not null              -- ex.: 'send-text', 'send-media'
method text not null              -- 'POST' | 'GET' | ...
instance_name text
idempotency_key text              -- null quando ausente
attempt_count int not null        -- número de tentativas feitas
final_status text not null        -- 'success' | 'failed' | 'exhausted'
final_http_status int             -- último status devolvido
retry_reasons jsonb               -- array: [{attempt, status, reason}]
total_duration_ms int
created_at timestamptz default now()
```

- RLS: SELECT `is_admin_or_supervisor`, INSERT apenas via `service_role`.
- Índices: `(created_at desc)`, `(action, created_at desc)`, `(final_status, created_at desc)`.
- Cron de cleanup: purgar >30 dias (reusar padrão `cleanup_old_evolution_incidents`).

#### 2. Instrumentação em `_shared/evolution-api-proxy.ts`

- Adicionar coleta de métricas dentro do loop de retry:
  - `attempt`, `status`, `reason` (ex.: `"http_503"`, `"timeout"`, `"network_error"`).
  - `startedAt` para calcular `total_duration_ms`.
- Ao fim de cada chamada (sucesso, falha ou exaustão), gravar uma linha em `evolution_retry_metrics` via helper novo `_shared/log-retry-metric.ts` (silencioso, service role, não relança erro).
- Logs estruturados `console.info` com prefixo `[retry-metric]` contendo o mesmo payload (para `supabase--edge_function_logs`).
- Métricas só são gravadas quando `attempt_count > 1` **ou** `final_status !== 'success'` (reduz volume).

#### 3. Nova edge function `evolution-retry-metrics` (GET, admin-only)

- Query params: `?hours=24&action=&instance=&status=`.
- Devolve:
  - Lista paginada (50) dos retries recentes.
  - Agregados: total de retries, taxa de sucesso após retry, top 5 ações com mais retry, top 5 motivos, p50/p95 de `attempt_count`, duração média.
  - Comparação janela atual vs anterior (delta %).

### Frontend

#### 4. Hook `src/hooks/monitoring/useRetryMetrics.ts`

- Padrão idêntico ao `useEvolutionIncidents`: React Query + realtime em `evolution_retry_metrics` (staleTime 15s, refetch 30s).

#### 5. Componente novo `src/components/monitoring/RetryMetricsPanel.tsx`

Dentro de `MonitoringWebhookPanel.tsx`, adicionar terceiro card abaixo de Secret + Incidentes:

**Resumo (KPIs)**
- Total de retries (24h)
- Taxa de sucesso após retry (%)
- p95 tentativas
- Duração média

**Tabela detalhada** (colunas):
- horário | ação | instância | tentativas | status final | http | motivos (chip) | idempotencyKey (truncado + copiar) | duração

**Filtros:** ação (select), status (todos | success | failed | exhausted), janela (1h/6h/24h/7d).

**Empty state:** `GenericEmptyState` "Sem retries registrados no período".

### Critérios de aceite

- Retry de `send-text` que teve 503 → 200 aparece com `attempt_count=2`, `final_status='success'`, motivos `["http_503"]`.
- Retry exaurido (3 tentativas 503) aparece com `final_status='exhausted'` e 3 entradas em `retry_reasons`.
- Envio de primeira-tentativa bem-sucedido **não** polui a tabela.
- `idempotencyKey` exibido truncado; botão "copiar" copia o valor completo.
- Não-admin: 403 na edge function e 0 linhas na tabela (RLS).
- Painel atualiza em tempo real via postgres_changes.

### Arquivos

**Novos**
- `supabase/migrations/<ts>_evolution_retry_metrics.sql`
- `supabase/functions/_shared/log-retry-metric.ts`
- `supabase/functions/evolution-retry-metrics/index.ts`
- `src/hooks/monitoring/useRetryMetrics.ts`
- `src/components/monitoring/RetryMetricsPanel.tsx`

**Editados**
- `supabase/functions/_shared/evolution-api-proxy.ts` — captura e grava métrica
- `src/components/monitoring/MonitoringWebhookPanel.tsx` — monta `RetryMetricsPanel`

### Riscos & mitigação

- **Volume de gravações:** filtrar apenas `attempt_count>1 || !success` + cron de cleanup 30d.
- **Overhead no hot path:** gravação async "fire-and-forget" com `catch` silencioso; nunca bloqueia a resposta ao usuário.
- **Leak de payload sensível:** `retry_reasons` armazena somente status e motivo — nunca o body da mensagem.

