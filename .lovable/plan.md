

## Gráfico de tendência 7 dias: recebimento + % assinatura validada

### Contexto

A página `AdminWebhookSecretStatusPage` hoje mostra status **instantâneo** (último evento, 5min, 1h de latência) e breakdown por instância, mas não tem visão **histórica**. Falta um gráfico que mostre, dia a dia ao longo dos últimos 7 dias:

1. **Volume diário** de eventos recebidos (barras).
2. **Taxa de validação HMAC** (linha sobreposta, eixo Y secundário 0-100%).

Permite identificar tendências (ex.: "% caiu de 99% pra 80% na quarta — algo mudou") e correlacionar volume com qualidade.

### O que vai ser construído

#### 1. Helper de agregação `weeklyTrendAggregations.ts`

Funções puras espelhando o padrão de `instanceAggregations.ts`:

- `aggregateDailyTrend(rows, days = 7)` → `DailyTrendPoint[]` com 7 buckets diários (preenche dias sem eventos com zeros), cada um contendo:
  - `dateLabel` (`dd/MM`)
  - `dateIso` (para sort)
  - `total` — eventos recebidos no dia
  - `validated` / `invalid` / `unsigned`
  - `validationRate` (0-100, `null` quando `total === 0` para a linha não cair pra zero falso)
  - `errored` (eventos com `error_message`)
- Respeita o filtro de instância já vigente na página (recebe `rows` já filtrados).

#### 2. Componente `WeeklyTrendChart.tsx`

Composed chart Recharts:

- `<Bar dataKey="total">` — eixo Y esquerdo, cor `hsl(var(--chart-1))`.
- `<Bar dataKey="errored" stackId="a">` opcional sobreposto pra destacar erros.
- `<Line dataKey="validationRate">` — eixo Y direito (0-100%), cor `hsl(var(--success))`, com `connectNulls={false}` pra dias sem dados não distorcerem a média.
- `<ReferenceLine y={95}>` no eixo direito — meta visual ("≥95% validado").
- Tooltip custom mostrando: total, validados, inválidos, % e erros do dia.
- Legend compacta no topo.
- Skeleton enquanto carrega; empty state se 7 dias sem nenhum evento.
- Header do card com label dinâmico: "Tendência 7 dias — Todas instâncias" ou "Tendência 7 dias — wpp2".

#### 3. Nova query de 7 dias

A query principal da página hoje pega 500 rows da última hora — não cobre 7 dias. Adicionar **query separada** via `useQuery`:

- Key: `['webhook-weekly-trend', instance]`
- `queryExternalProxy('evolution_webhook_events', { ... created_at >= now-7d, instance_name (se filtrado), order desc, limit 5000 })`.
- `staleTime: 5 * 60_000` (5min — não precisa polling agressivo pra histórico).
- Limit 5000 cobre ~700 ev/dia; se ultrapassar, render banner "amostra parcial — peça RPC `rpc_webhook_trend_daily`".

#### 4. Integração na página

- `AdminWebhookSecretStatusPage` renderiza `<WeeklyTrendChart>` **abaixo dos `InstanceStatusCards`** e acima da seção HMAC já existente.
- Reutiliza o mesmo filtro de instância (`useUrlFilters`) — gráfico re-renderiza automaticamente ao trocar instância.

### Detalhes técnicos

**Arquivos a criar:**

- `src/pages/admin-webhook-secret-status/weeklyTrendAggregations.ts` — funções puras + tipos.
- `src/pages/admin-webhook-secret-status/WeeklyTrendChart.tsx` — componente Recharts com tooltip custom e empty state.
- `src/pages/admin-webhook-secret-status/__tests__/weeklyTrendAggregations.test.ts` — Vitest cobrindo:
  - Bucketização com timezone local (sem off-by-one).
  - 7 buckets sempre, mesmo sem dados.
  - `validationRate = null` quando `total === 0`.
  - Soma de `validated + invalid + unsigned === total`.

**Arquivos a editar:**

- `src/pages/AdminWebhookSecretStatusPage.tsx`:
  - Adicionar `useQuery` para janela 7 dias.
  - Renderizar `<WeeklyTrendChart>` com dados agregados via `useMemo`.

**Padrões respeitados:**

- Tokens semânticos (`hsl(var(--chart-1))`, `hsl(var(--success))`, `hsl(var(--destructive))`); zero hardcoded color.
- Reuso de `CHART_STYLES`, `TOOLTIP_STYLE` e helpers de `src/lib/chartColors.ts`.
- Sem export CSV (Zero Export).
- Respeita filtro `?instance=` da URL.
- `log.warn` se a query exceder o limite de 5000 rows.
- Tipagem estrita, max ~340 linhas/arquivo.

### Fora de escopo

- RPC `rpc_webhook_trend_daily` no FATOR X (futuro lote — atual usa agregação client-side).
- Janelas customizáveis (14d/30d) — mantém 7d fixo nesta entrega; toggle pode entrar depois.
- Comparação semana atual vs semana anterior — fora do escopo.
- Drill-down clicando num dia para ver eventos daquele dia — fora do escopo.

