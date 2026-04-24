

## Objetivo

Permitir que o reprocesso manual da DLQ (`failed_messages`) use **backoff específico por motivo** (root cause) em vez do exponencial único atual. Ex.: `429 rate_limit` espera mais tempo que `503 unavailable`, e `timeout`/`network` reprocessam mais rápido.

Hoje todos os reagendamentos usam `computeBackoffMs(attempt+1)` (60s→1h, exponencial cego), independente do motivo. Isso desperdiça janela em erros transientes leves e bombardeia APIs em rate-limit.

## Design

### 1. Nova tabela de helpers — `supabase/functions/_shared/dlq-backoff.ts`

Adicionar **sem quebrar** a função existente:

```ts
export type RetryReason =
  | 'rate_limit' | 'unavailable' | 'timeout'
  | 'network'   | 'server_error' | 'auth'
  | 'invalid_payload' | 'not_found' | 'unknown';

// Multiplicadores aplicados sobre o backoff base já calculado.
// Cap final continua sendo MAX_DELAY_MS (1h).
const REASON_PROFILE: Record<RetryReason, { multiplier: number; minDelayMs: number }> = {
  rate_limit:      { multiplier: 4.0, minDelayMs: 120_000 }, // 2min mínimo, escala forte
  unavailable:     { multiplier: 2.0, minDelayMs:  60_000 }, // 1min mínimo
  server_error:    { multiplier: 2.0, minDelayMs:  60_000 },
  timeout:         { multiplier: 1.0, minDelayMs:  30_000 }, // mais agressivo
  network:         { multiplier: 1.0, minDelayMs:  30_000 },
  auth:            { multiplier: 1.5, minDelayMs:  90_000 }, // raro, mas espera p/ refresh
  invalid_payload: { multiplier: 1.0, minDelayMs:  60_000 }, // não vai resolver, mas respeita
  not_found:       { multiplier: 1.0, minDelayMs:  60_000 },
  unknown:         { multiplier: 1.0, minDelayMs:  60_000 }, // = comportamento atual
};

export function classifyRetryReason(httpStatus: number | null, errorMessage: string | null): RetryReason { /* ... */ }

export function computeBackoffMsByReason(
  attempt: number,
  reason: RetryReason,
  withJitter = true,
): number {
  const base = computeBackoffMs(attempt, false); // sem jitter ainda
  const profile = REASON_PROFILE[reason];
  const scaled = Math.max(profile.minDelayMs, base * profile.multiplier);
  const capped = Math.min(scaled, 3_600_000);
  if (!withJitter) return capped;
  const jitter = capped * 0.15 * (Math.random() * 2 - 1);
  return Math.max(1_000, Math.round(capped + jitter));
}
```

`classifyRetryReason` espelha a lógica de `src/lib/failureRootCause.ts` (status > heurística por mensagem). Mantemos os dois sincronizados via teste compartilhado.

### 2. `reprocess-failed-messages/index.ts`

Trocar **todas as chamadas** `computeBackoffMs(attempt + 1)` por:

```ts
const reason = classifyRetryReason(resp.status, respText);
const backoffMs = computeBackoffMsByReason(attempt + 1, reason);
```

E persistir o `reason` no row para visibilidade:

```ts
await supabase.from('failed_messages').update({
  // ... campos existentes
  last_retry_reason: reason,           // NOVA coluna
  next_attempt_at: new Date(Date.now() + backoffMs).toISOString(),
}).eq('id', row.id);
```

No `catch` (exceção sem `resp`), classificar como `'network'` ou `'timeout'` por inspeção da mensagem do erro.

### 3. Migração — adicionar coluna `last_retry_reason`

```sql
ALTER TABLE public.failed_messages
  ADD COLUMN IF NOT EXISTS last_retry_reason text;

CREATE INDEX IF NOT EXISTS idx_failed_messages_last_retry_reason
  ON public.failed_messages(last_retry_reason)
  WHERE status IN ('pending', 'retrying');
```

Backfill opcional via UPDATE (deixa NULL para entradas antigas, sem dor).

### 4. `enqueue-failed-message.ts` (primeira inserção)

Já recebe `http_status`/`error_code`/`error_message`. Calcula reason e usa `computeBackoffMsByReason(1, reason)` para o **primeiro** `next_attempt_at`. Persiste `last_retry_reason` no insert inicial.

### 5. UI — `RetryConfigPanel` / DLQ admin (read-only)

Acrescentar **tabela informativa** "Backoff por motivo" no painel de retry, listando cada `RetryReason` com `min` e `multiplier`. Sem campos editáveis nesta entrega — primeiro provar a hipótese; tornar configurável vira backlog.

Na lista da DLQ (se houver UI hoje, ou o painel de métricas), mostrar coluna `last_retry_reason` com badge colorido reusando `getRootCauseMeta()` de `src/lib/failureRootCause.ts`.

### 6. Testes

`supabase/functions/_shared/__tests__/dlq-backoff.test.ts` — adicionar:

- `classifyRetryReason(429, ...) → 'rate_limit'`
- `classifyRetryReason(503, ...) → 'unavailable'`
- `classifyRetryReason(null, 'request timeout') → 'timeout'`
- `computeBackoffMsByReason(1, 'rate_limit', false) >= 120_000`
- `computeBackoffMsByReason(1, 'timeout', false) <= computeBackoffMsByReason(1, 'rate_limit', false)`
- Cap em `MAX_DELAY_MS` para `attempt=10, multiplier=4`
- `attempt=1, unknown` → equivalente a `computeBackoffMs(1)` (compat com comportamento antigo)

`reprocess-failed-messages/__tests__/contract.test.ts` — adicionar regex assertions:
- `classifyRetryReason\(`
- `computeBackoffMsByReason\(`
- `last_retry_reason:`

## Arquivos tocados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/_shared/dlq-backoff.ts` | + `RetryReason`, `classifyRetryReason`, `computeBackoffMsByReason` |
| `supabase/functions/reprocess-failed-messages/index.ts` | usar reason-aware backoff em sucesso/falha/exceção; persistir `last_retry_reason` |
| `supabase/functions/_shared/enqueue-failed-message.ts` | usar reason-aware no primeiro agendamento; persistir `last_retry_reason` |
| `supabase/functions/_shared/__tests__/dlq-backoff.test.ts` | +6 cases |
| `supabase/functions/reprocess-failed-messages/__tests__/contract.test.ts` | +3 asserts |
| Migração SQL | `+ column last_retry_reason`, índice parcial |
| `src/components/admin/RetryConfigPanel.tsx` | tabela "Backoff por motivo" (read-only) |

## Garantias

- **Backwards compatible**: `computeBackoffMs` antigo permanece exportado e usado por `unknown`. Nenhum chamador externo quebra.
- **Sem regressão de TTL**: cap continua 1h, jitter ±15% mantido.
- **Determinístico nos testes**: `withJitter=false` em todos os asserts.
- **Sem PII nova**: `last_retry_reason` é enum curto, não vaza payload.

## Não objetivos

- Não tornar os perfis editáveis via UI/`global_settings` nesta entrega.
- Não trocar a fórmula base exponencial (`2^attempt`).
- Não mexer no client-side `withRetry` (`src/lib/retry.ts`); ele já tem timeout próprio e roda fora da DLQ.

