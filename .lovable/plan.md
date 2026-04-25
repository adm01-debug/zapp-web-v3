# Tela de Monitoramento em Tempo Real

Nova rota admin (`view=realtime-monitor`) consolidando, em um único painel auto-atualizado, a saúde operacional do WhatsApp/Evolution: status de conexões, throughput de eventos e falhas de dispatch agrupadas por agente e por canal.

## O que o usuário verá

Layout em 3 blocos verticais, cada bloco refresca sozinho (sem F5):

1. **Status de Conexões** (topo)
   - Cards compactos por instância (`channel_connections` + `channel_connections_safe`): nome, canal, badge de status (`connected`, `disconnected`, `qrcode`, `degraded`), última atualização e último erro.
   - Indicador agregado: X de Y instâncias online + alerta visual se alguma estiver `disconnected` há > 5 min.
   - Reaproveita `EvolutionFallbackStatusCard` (já existente) na lateral para mostrar se o cluster está em modo primário ou fallback.

2. **Eventos Recebidos (webhook live)**
   - KPIs da janela selecionável (15 min / 1h / 6h / 24h): total recebidos, processados, com erro, eventos/min, latência média.
   - Mini-chart de área (recharts) com volume por minuto/hora — mesmo agregador `aggregateHourly` já usado em `AdminWebhookOverviewPage`.
   - Tabela compacta dos últimos 20 eventos com tipo, instância e status. Linha clicável → deep link para `AdminWebhookEventsPage` com filtros pré-aplicados.

3. **Erros de Dispatch por Agente / Canal**
   - Fonte: `failed_messages` (Lovable Cloud) via RPC já existente `rpc_list_failed_messages` na janela escolhida.
   - Duas tabelas lado-a-lado:
     - **Por agente**: agente, total falhas, % do total, últimos motivos top-3, último erro (timestamp relativo).
     - **Por canal/instância**: instância, canal, total falhas, taxa vs eventos recebidos no período, último erro.
   - Botão “Reprocessar” por linha quando o usuário tem permissão (reusa fluxo de `BulkReprocessGuidedDialog`).

Header com: seletor de janela, toggle "Auto-refresh", botão Atualizar manual, badge "ao vivo" pulsando quando realtime ativo.

## Tempo real

- Realtime do Supabase (canal `postgres_changes`) inscrito em `channel_connections` (UPDATE) e `failed_messages` (INSERT) — invalida as queries do React Query correspondentes ao receber eventos.
- Para `evolution_webhook_events` (FATOR X, sem realtime cross-projeto): polling via `useQuery` com `refetchInterval` de 15 s quando o auto-refresh estiver ON, alinhado ao padrão de `AdminWebhookOverviewPage`.

## Arquivos a criar / alterar

**Criar**
- `src/pages/AdminRealtimeMonitorPage.tsx` — composição do layout e header.
- `src/pages/admin-realtime-monitor/ConnectionsHealthBlock.tsx`
- `src/pages/admin-realtime-monitor/EventsLiveBlock.tsx`
- `src/pages/admin-realtime-monitor/DispatchErrorsBlock.tsx`
- `src/pages/admin-realtime-monitor/aggregations.ts` — helpers para agrupar `failed_messages` por agente e por canal.
- `src/hooks/useRealtimeMonitor.ts` — assina realtime e expõe `lastEventAt` para o badge "ao vivo".
- Testes: `src/pages/admin-realtime-monitor/__tests__/aggregations.test.ts`.

**Alterar**
- `src/pages/lazyViews.ts` — registrar lazy `AdminRealtimeMonitorPage`.
- `src/pages/ViewRouter.tsx` — adicionar rota `'realtime-monitor'`.
- `src/config/sidebarNavConfig.ts` (ou equivalente) — adicionar entrada "Monitoramento em Tempo Real" na seção Admin, ícone `Activity`, gated por `admin`/`supervisor`/`dev` via padrão existente em `mem://auth/roles-and-visibility`.

## Detalhes técnicos

- **Connections**: `supabase.from('channel_connections_safe').select(...)` (view sanitizada) — sem credenciais.
- **Webhook events / volume**: `queryExternalProxy` chamando `evolution_webhook_events` com `since`, mesmo padrão de `AdminWebhookOverviewPage` (HARD_LIMIT 200).
- **Failed messages**: `supabase.rpc('rpc_list_failed_messages', { p_since, p_limit: 500 })`. Agregações feitas em memória (volumes esperados <500/janela de 24h conforme histórico).
- **Permissões**: gated por hook existente `useUserRole` (mesmo guard das outras páginas admin); página retorna `<NoAccess />` para `agent`.
- **Performance**: cada bloco em seu próprio `useQuery` com `staleTime` curto (10 s) e `refetchInterval` configurável; chave inclui janela e instância para cache estável.
- **Acessibilidade**: cards e tabelas seguem `GenericEmptyState` quando vazio; badges com `aria-label` explícito; foco visível mantido.
- **i18n**: textos em pt-BR seguindo o padrão das outras páginas admin.

## Fora do escopo

- Não implementa novas RPCs (usa as já catalogadas no FATOR X).
- Não altera schema do banco.
- Não substitui `AdminWebhookOverviewPage` nem `AdminFailedMessagesPage` — esta tela é uma visão consolidada e linka para as páginas de drill-down existentes.
