

## Painel: Consolidação de eventos de webhook (24h) por tipo + instance

### Contexto

Hoje temos `AdminWebhookEventsPage` (log auditável evento-a-evento) e `AdminWebhookSecretStatusPage` (saúde da assinatura). Falta uma **visão de overview agregada**: quantos eventos de cada tipo (`MESSAGES_UPSERT`, `PRESENCE_UPDATE`, `CALL`, etc.) processados nas últimas 24h, com fatiamento por `instance_name` — útil para ver volume, distribuição e gargalos sem ler 500 linhas.

### Decisão

Criar `AdminWebhookOverviewPage` (rota nova `webhook-overview`) que:
- Lê de `evolution_webhook_events` via `queryExternalProxy` (mesma stack do log existente).
- Agrega client-side: contagem por `event_type` × `instance_name`, processados vs erros, série temporal por hora.
- Filtros: período (1h / 6h / 24h / 7d, default 24h), instance (`all` ou seleção), incluir/excluir `processed=false`.
- Auto-refresh 60s (mesmo do log).

### Arquivos

**Criados (2):**

1. `src/pages/AdminWebhookOverviewPage.tsx` (~280 linhas) — página principal:
   - Header com título, refresh button e seletor de período + instance.
   - **4 KPIs no topo** (cards): total de eventos, processados, com erro (com %), instâncias ativas.
   - **Gráfico 1 — Barras horizontais** "Top eventos por tipo": usa `recharts BarChart` com lista de `event_type` ordenada por contagem desc, cores por categoria (mensagens=primary, conexão=warning, presença=muted, erro=destructive).
   - **Gráfico 2 — Heatmap/tabela** "Tipo × Instance": tabela densa com `event_type` nas linhas e `instance_name` nas colunas, célula com contagem + cor de intensidade (`bg-primary/[opacidade]`). Para 1 instância só, vira coluna única.
   - **Gráfico 3 — Série temporal** "Volume por hora": `AreaChart` empilhado mostrando processados vs erros nas últimas N horas (bucket de 1h se ≤24h, 6h se 7d).
   - **Tabela "Detalhamento por tipo"**: `event_type`, total, processados, erros, % erro, último evento (timestamp), com badge colorido de severidade quando erro >5%.
   - Estado vazio padrão (`GenericEmptyState`) e loading com skeleton.

2. `src/pages/admin-webhook-overview/aggregations.ts` (~80 linhas) — helpers puros testáveis:
   - `aggregateByType(rows): Array<{type, total, processed, errored, lastAt}>`.
   - `aggregateByTypeAndInstance(rows): { types: string[]; instances: string[]; matrix: Record<string, Record<string, number>> }`.
   - `aggregateHourly(rows, hours): Array<{ bucket: string; processed: number; errored: number }>`.
   - `categoryColor(eventType): string` — mapa para tokens semânticos (sem cores hardcoded).

**Editados (3):**

3. `src/pages/ViewRouter.tsx` — adicionar `'webhook-overview': Views.AdminWebhookOverviewPage`.

4. `src/pages/index.ts` (ou onde `Views.*` é exportado — confirmar via search) — exportar lazy `AdminWebhookOverviewPage`.

5. `src/config/sidebarNavConfig.ts` — adicionar item de navegação no grupo Admin/Monitoring (depois de "Eventos do Webhook"), label "Overview Webhook", icon `BarChart3`, role `admin/supervisor`.

**Criado (1) — testes:**

6. `src/pages/admin-webhook-overview/__tests__/aggregations.test.ts` — vitest:
   - `aggregateByType` conta corretamente, separa processed/errored, pega último timestamp.
   - `aggregateByTypeAndInstance` cria matriz correta com instâncias dedupadas.
   - `aggregateHourly` cria buckets corretos (24 buckets para 24h, 7 para 7d).
   - `categoryColor` retorna tokens conhecidos por grupo.
   - Edge cases: array vazio retorna estruturas vazias válidas.

### Detalhes técnicos

- **Fonte de dados**: `queryExternalProxy({ table: 'evolution_webhook_events', ..., limit: 500 })` — mesma fonte do log auditável. Limite de 500 é suficiente para 24h em volume normal; quando filtro for 7d, sinalizar com aviso "amostra das 500 mais recentes" se `rows.length === 500`.
- **Filtro por instance**: lista de instâncias é derivada do próprio resultado (`Array.from(new Set(rows.map(r => r.instance_name)))`) — sem query extra. Default: `'all'`.
- **Cores**: usar tokens semânticos (`primary`, `warning`, `destructive`, `muted`) via Tailwind. Sem cores hardcoded (memória `style/design-system-and-skins`).
- **Recharts**: já está no projeto (`TelemetryCharts` usa). Reuso de padrões do `TelemetryCharts.tsx` (formatBucketTime, AreaChart stacked).
- **Acessibilidade**: tabela heatmap com `<caption>` para screen readers, células com `title` mostrando "TIPO em INSTANCE: N eventos". Teclado natural.
- **Performance**: agregações em `useMemo`, dados de Recharts só recalculados quando `data` muda. Sem realtime (auto-refresh 60s já é responsivo).
- **RLS**: `evolution_webhook_events` é leitura via proxy admin existente — sem mudança de policy.
- **Sem mudanças em edge functions**: 100% frontend.

### Fora de escopo

- Não substituir `AdminWebhookEventsPage` (log auditável continua sendo a referência drill-down).
- Não criar RPC dedicada de agregação (`rpc_webhook_stats`) — manter agregação client-side enquanto volume couber em 500 rows. Se virar gargalo, vira lote dedicado pedindo RPC ao operador FATOR X.
- Sem alertas/notificações automáticas (próximo lote pode plugar no `useWarRoomAlerts`).
- Sem export CSV (regra Zero Export do projeto — memória `security/data-export-and-protection-policy`).
- Sem dashboard combinado com `useEvolutionMonitoring` — esse é específico de webhook events; conexões/health continuam em `EvolutionMonitoringDashboard`.

