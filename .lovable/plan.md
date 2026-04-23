

## Alertas de degradação no painel de retries

### Estado atual

`RetryMetricsPanel` já mostra `p95Attempts` e `successRate` agregados. Falta:
- thresholds configuráveis pelo usuário
- detecção por instância (hoje agregado é global na janela)
- feedback visual + toast quando ultrapassa

### Mudanças

**1. `src/hooks/monitoring/useRetryMetrics.ts`** — adicionar agregado por instância
- Calcular `byInstance: Array<{ instance, total, p95Attempts, failureRate, successAfterRetry }>` no `aggregates`.
- `failureRate` = (failed + exhausted) / total × 100 (somente runs com retry).
- Agrupa por `instance_name ?? '(global)'`.

**2. `src/lib/retryAlerts.ts`** (novo) — utilitário puro
- `RetryThresholds = { p95Attempts: number; failureRatePct: number; minSampleSize: number }`.
- `DEFAULT_THRESHOLDS = { p95Attempts: 3, failureRatePct: 20, minSampleSize: 5 }`.
- `evaluateInstance(metrics, thresholds): { breached: boolean; reasons: string[] }` — só dispara se `total >= minSampleSize` (evita ruído).
- Persistência: `loadThresholds()` / `saveThresholds(t)` em `localStorage` (`zappweb:retry-alert-thresholds`).
- Testes em `src/lib/__tests__/retryAlerts.test.ts`.

**3. `src/components/monitoring/RetryAlertsConfig.tsx`** (novo) — popover com inputs numéricos
- 3 campos: `p95 máximo`, `% falha máxima`, `amostra mínima`.
- Botão "Restaurar padrão".
- Salva em localStorage e propaga via callback.

**4. `src/components/monitoring/RetryAlertsBanner.tsx`** (novo)
- Recebe `breaches: Array<{ instance, reasons[], metrics }>`.
- Renderiza um `Alert` (variant destructive) por instância violada, com badges dos motivos.
- Esconde quando vazio.

**5. `src/components/monitoring/RetryMetricsPanel.tsx`** — integração
- Hook `useRetryAlertEvaluator(byInstance, thresholds)` retorna `breaches`.
- Header ganha botão `RetryAlertsConfig` ao lado do refresh.
- Banner renderizado abaixo dos KPIs e antes do gráfico.
- `useEffect` dispara `toast.error(…)` **uma vez por (instance, hours)** quando uma nova violação aparece (dedupe via `Set` em ref). Reset ao mudar `hours`.

### Comportamento

| Cenário | Resultado |
|---|---|
| Instância wpp2 com 12 retries, p95=4, falha=8% | Alerta: "p95=4 ≥ 3" (failure OK) |
| Instância wpp3 com 3 retries (< minSample) | Sem alerta (ruído) |
| Sem violação | Banner oculto |
| Usuário muda threshold p95 para 5 | Alerta de wpp2 some |

### Arquivos editados/criados

- `src/lib/retryAlerts.ts` (novo)
- `src/lib/__tests__/retryAlerts.test.ts` (novo)
- `src/hooks/monitoring/useRetryMetrics.ts`
- `src/components/monitoring/RetryAlertsConfig.tsx` (novo)
- `src/components/monitoring/RetryAlertsBanner.tsx` (novo)
- `src/components/monitoring/RetryMetricsPanel.tsx`

### Fora de escopo

- Sem persistência server-side dos thresholds (escopo per-user, localStorage suficiente).
- Sem alerta por email/webhook — apenas UI + toast in-app.
- Sem trend (variação) — análise é da janela atual.

