
## Objetivo

Adicionar **logs estruturados + contadores de performance** no cliente para chamadas ao FATOR X (`externalSupabase` e `external-db-proxy`), expondo: `durationMs`, `limit` efetivo, filtros aplicados, `recordCount` retornado, e classificação de severidade (ok/slow/very_slow/timeout/error). Permite detectar timeouts e queries lentas em DevTools sem precisar abrir a edge function.

## Contexto

Hoje:
- `externalProxy.ts` chama `supabase.functions.invoke('external-db-proxy')` sem instrumentação client-side. A edge function já registra telemetria server-side em `query_telemetry`, mas o frontend fica cego.
- `loadOlderMetrics.ts` é o padrão estabelecido: contadores + snapshot exposto em `window.__loadOlderMetrics`. Vamos replicar para o proxy.
- `useMessagesCursor` (recém-criado) e `useExternalEvolution` chamam RPCs sem timing visível.
- `getLogger('module')` é o logger estruturado padrão (com correlation IDs).

Lacuna: nenhum ponto único agrega `(operation, table/rpc, durationMs, limit, filters, recordCount, severity)` no cliente.

## Mudança proposta

### 1. Novo módulo: `src/lib/clientTelemetry.ts`

Singleton em memória, espelhando o padrão de `loadOlderMetrics`:

```ts
export type Severity = 'ok' | 'slow' | 'very_slow' | 'timeout' | 'error';

export interface QueryEvent {
  operation: 'select' | 'rpc' | 'insert' | 'update' | 'delete';
  source: 'externalProxy' | 'externalSupabase' | 'lovableCloud';
  target: string;             // table name or rpc name
  durationMs: number;
  limit: number | null;
  offset: number | null;
  filters: Record<string, unknown> | null;
  recordCount: number | null;
  severity: Severity;
  errorMessage?: string;
  startedAt: number;
}

export interface TelemetrySnapshot {
  total: number;
  bySeverity: Record<Severity, number>;
  bySource: Record<string, number>;
  avgDurationMs: number;
  p95DurationMs: number;
  recentEvents: QueryEvent[];     // últimos 50
  slowEvents: QueryEvent[];        // últimos 20 com severity != 'ok'
}

export function recordQueryEvent(ev: Omit<QueryEvent, 'severity'> & { severity?: Severity }): QueryEvent;
export function getTelemetrySnapshot(): TelemetrySnapshot;
export function resetTelemetry(): void;
export function classifySeverity(durationMs: number, hasError: boolean, isTimeout: boolean): Severity;
```

Thresholds: `slow >= 1500ms`, `very_slow >= 4000ms`, `timeout` quando o caller marca explicitamente (AbortError com reason `TimeoutError`).

Cada `recordQueryEvent`:
- Calcula severidade se não passada.
- Faz log estruturado via `getLogger('clientTelemetry')`:
  - `ok` → `log.debug`
  - `slow` → `log.info`
  - `very_slow` / `timeout` / `error` → `log.warn`
- Publica snapshot em `window.__queryTelemetry` (espelho do padrão `__loadOlderMetrics`).
- Mantém `recentEvents` (50) e `slowEvents` (20) com shift quando excede.

### 2. Instrumentar `src/lib/externalProxy.ts`

Envolver a chamada `supabase.functions.invoke` com timing + record:

```ts
const startedAt = performance.now();
const filters = body.filters ?? null;
const limit = body.limit ?? null;
const offset = body.offset ?? null;
const target = body.rpcName ?? body.table ?? 'unknown';
const operation = body.rpcName ? 'rpc' : (body.operation ?? 'select');

try {
  const result = await supabase.functions.invoke('external-db-proxy', { body, signal });
  const durationMs = Math.round(performance.now() - startedAt);
  const recordCount = Array.isArray(result.data?.data) ? result.data.data.length : null;
  recordQueryEvent({
    operation, source: 'externalProxy', target,
    durationMs, limit, offset, filters, recordCount,
    startedAt,
  });
  return result;
} catch (err) {
  const durationMs = Math.round(performance.now() - startedAt);
  const isTimeout = (err as Error)?.name === 'TimeoutError';
  recordQueryEvent({
    operation, source: 'externalProxy', target,
    durationMs, limit, offset, filters, recordCount: null,
    severity: isTimeout ? 'timeout' : 'error',
    errorMessage: (err as Error)?.message,
    startedAt,
  });
  throw err;
}
```

Sem mudar a API pública — instrumentação puramente passiva.

### 3. Helper opcional para chamadas diretas: `src/lib/instrumentedExternal.ts`

Wrapper utilitário para `externalSupabase.rpc(...)` que faz a mesma instrumentação, sem forçar refactor de todos os call sites:

```ts
export async function timedRpc<T>(
  rpcName: string,
  params: Record<string, unknown>,
  opts?: { signal?: AbortSignal }
): Promise<{ data: T | null; error: unknown }> {
  const startedAt = performance.now();
  const limit = (params.p_limit as number) ?? null;
  const offset = (params.p_offset as number) ?? null;
  // ... mesmo fluxo que o proxy, mas chamando externalSupabase.rpc
}
```

Adoção opcional — pontos críticos (ex.: `useMessagesCursor.fetchPage`) podem migrar incrementalmente.

### 4. Pequeno painel admin: `src/pages/admin-telemetria/ClientTelemetryPanel.tsx`

Aba/seção dentro de `/admin/telemetria` que renderiza:
- 4 KPI cards reusando `TelemetryStatsCards`: total, slow, very_slow+timeout, avgDurationMs.
- Tabela dos `slowEvents` (últimos 20) reusando layout de `TelemetryTable` (colunas: quando, source, operation, target, duração, limit, offset, recordCount, severity, erro).
- Botão "Limpar contadores" → `resetTelemetry()`.
- Auto-refresh a cada 2s lendo `getTelemetrySnapshot()` (sem network, é puro in-memory).

Adicionar tab à página `/admin/telemetria` existente (server-side telemetry vs client-side telemetry side-by-side).

### 5. Testes

`src/lib/__tests__/clientTelemetry.test.ts`:
1. `classifySeverity` retorna `ok | slow | very_slow` conforme thresholds.
2. `recordQueryEvent` aplica severity automaticamente quando omitida.
3. Snapshot mantém apenas últimos 50 em `recentEvents` e 20 em `slowEvents`.
4. `bySeverity` e `bySource` agregam corretamente.
5. `p95DurationMs` é calculado sobre os recents.
6. `resetTelemetry()` zera tudo.
7. `window.__queryTelemetry` é atualizado após cada record.

`src/lib/__tests__/externalProxy.telemetry.test.ts`:
1. Sucesso emite evento com `durationMs`, `recordCount`, `severity: 'ok'`.
2. Erro emite evento com `severity: 'error'` e `errorMessage`.
3. AbortError com `name=TimeoutError` emite `severity: 'timeout'`.
4. Filters/limit/offset do body são propagados ao evento.

## Arquivos

| Ação | Arquivo |
|---|---|
| Criar | `src/lib/clientTelemetry.ts` |
| Editar | `src/lib/externalProxy.ts` (instrumentar) |
| Criar | `src/lib/instrumentedExternal.ts` (helper opcional) |
| Criar | `src/pages/admin-telemetria/ClientTelemetryPanel.tsx` |
| Editar | `src/pages/admin-telemetria/index.tsx` (adicionar tab/seção) |
| Criar | `src/lib/__tests__/clientTelemetry.test.ts` |
| Criar | `src/lib/__tests__/externalProxy.telemetry.test.ts` |

## Não-objetivos

- Não enviar telemetria client-side para o backend (manter 100% in-memory; servidor já tem `query_telemetry`).
- Não migrar todos os call sites para `timedRpc` neste plano — apenas disponibilizar o helper.
- Não tocar em `useMessages` (Lovable Cloud) — escopo é FATOR X / proxy.
- Não criar alertas/toasts automáticos — só logs + painel inspecionável.

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Overhead de `performance.now()` em alta frequência | Negligível (<10µs). Sem JSON.stringify no hot path — só ao snapshot. |
| `window.__queryTelemetry` polui escopo global | Usar prefixo `__` consistente com `__loadOlderMetrics`; documentado como dev-only. |
| Filtros podem conter PII (ex.: telefone em `remote_jid`) | Painel é admin-only via rota `/admin/telemetria`. Logs respeitam o nível do logger (warn em prod). |
| P95 sobre janela pequena (50 eventos) é instável | Aceitável — objetivo é diagnóstico ad-hoc, não métrica de produção. |
