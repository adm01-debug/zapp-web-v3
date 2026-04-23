

## Filtros por instância: Webhook Status + Assinatura validada

### Contexto

Hoje temos duas páginas admin separadas:

- **`AdminWebhookSecretStatusPage`** — mostra a saúde da assinatura HMAC (taxa de validação) **agregada globalmente**, sem fatiar por instância.
- **`AdminWebhookOverviewPage`** — mostra contagem de eventos processados/pendentes/errored, com filtro de instância já existente.

Falta: poder filtrar a página de **assinatura validada** por instância específica (ex.: "qual a taxa de validação só para `wpp2`?") e exibir, na mesma tela, o status atual do webhook (último evento, erros recentes, latência) também fatiado por instância.

### O que vai ser construído

#### 1. Filtro de instância em `AdminWebhookSecretStatusPage`

- Adicionar `<Select>` no header da página com lista de instâncias (carregadas via `aggregateByTypeAndInstance` sobre `evolution_webhook_events` recentes, igual ao Overview já faz) + opção "Todas".
- Persistir seleção via `useUrlFilters` (param `?instance=wpp2`) para permitir compartilhar URL.
- Aplicar o filtro nas queries que alimentam:
  - **Taxa de validação HMAC** — filtrar `evolution_webhook_events.instance_name = X` antes de calcular `validated/total`.
  - **Distribuição por header de assinatura** — mesma filtragem.
  - **Janela 24h vs 7d** — manter, mas já fatiada por instância.

#### 2. Novo painel "Status atual do webhook" (por instância)

Adicionar Card no topo da página com 3 KPIs vivos:

- **Último evento recebido** — timestamp + tipo + relativo ("há 12s").
- **Eventos últimos 5min** — com mini-sparkline processed vs errored.
- **Latência média de processamento** — `avg(processed_at - created_at)` da última hora.

Tudo fatiado pela instância selecionada (ou "todas" se nenhum filtro).

Fonte: query única em `evolution_webhook_events` filtrada por `created_at > now() - interval '1 hour'`, agregação client-side (mesmo padrão do Overview, dentro do limite de 500 rows).

#### 3. Tabela "Por instância" (quando filtro = "Todas")

Quando nenhuma instância específica estiver selecionada, mostrar tabela compacta:

```text
Instance   | Total 24h | Validados | % Válido | Último evento | Status
wpp2       | 12.430    | 12.428    | 99.98%   | há 3s         | 🟢
wpp_backup | 0         | 0         | —        | há 6h         | 🔴
```

Clicar numa linha aplica o filtro daquela instância (atualiza `?instance=` na URL).

### Detalhes técnicos

**Arquivos a criar:**

- `src/pages/admin-webhook-secret-status/instanceAggregations.ts` — funções puras `aggregateValidationByInstance(rows)`, `computeInstanceStatus(rows, instance)`, `computeLatencyStats(rows)`. Espelha o padrão de `admin-webhook-overview/aggregations.ts` (testável isoladamente).
- `src/pages/admin-webhook-secret-status/InstanceFilterSelect.tsx` — Select com lista de instâncias derivada da query principal + opção "Todas".
- `src/pages/admin-webhook-secret-status/InstanceStatusCards.tsx` — 3 cards de KPI (último evento / 5min / latência).
- `src/pages/admin-webhook-secret-status/InstanceBreakdownTable.tsx` — tabela "Por instância" com sort por % válido.
- `src/pages/admin-webhook-secret-status/__tests__/instanceAggregations.test.ts` — Vitest para as funções puras.

**Arquivos a editar:**

- `src/pages/AdminWebhookSecretStatusPage.tsx`:
  - Importar `useUrlFilters` para ler/gravar `?instance=`.
  - Aplicar filtro `instance_name = X` na query principal de `evolution_webhook_events` quando definido.
  - Renderizar `InstanceFilterSelect` no header, `InstanceStatusCards` acima da seção HMAC, `InstanceBreakdownTable` quando filtro = "Todas".
  - Atualizar título de seções existentes para refletir escopo ("Taxa de validação HMAC — wpp2" vs "Taxa global").

**Padrões respeitados:**

- Reuso de `useUrlFilters` (memória `architecture/data-fetching`) para sincronia URL ↔ estado.
- RPC-first (memória `integrations/fator-x/data-access-standard`): se houver volume, considerar pedir RPC `rpc_webhook_health_by_instance` ao operador FATOR X num próximo lote — por ora, agregação client-side dentro do limite de 500 rows como no Overview.
- Sem export CSV (Zero Export).
- Sem hardcoded colors — usar tokens semânticos (`text-success`, `text-warning`, `text-destructive`).
- Tipagem estrita, max ~340 linhas/arquivo, `log` de `@/lib/logger` para erros.

### Fora de escopo

- Criação de RPC dedicada no FATOR X (mantém agregação client-side; revisitar se virar gargalo).
- Alertas automáticos quando uma instância cai abaixo de threshold de validação (próximo lote pode plugar em `useWarRoomAlerts`).
- Histórico longitudinal por instância (>7d) — fora do escopo desta página.
- Comparação multi-instância em gráfico empilhado — pode virar enhancement futuro.

