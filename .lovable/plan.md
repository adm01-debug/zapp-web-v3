

## Sincronização frontend ↔ backend — RPCs novas e instrumentação

### Diagnóstico

Backend trouxe RPCs novas que ainda **não estão integradas** no frontend. Inventário:

| RPC backend | Status frontend | Ação |
|---|---|---|
| `rpc_dlq_*` (4) | ✅ Já wired em `useFailedMessages.ts` | OK |
| `rpc_dlq_log_reprocess_trigger` | ✅ Wired (com `as any`) | Limpar cast |
| `rpc_instance_auth_event_summary/trend` | ✅ Wired em `AuthEventTrendChart` | OK |
| `rpc_list_failed_messages` (overload novo com `last_attempt_at`) | ⚠️ Hook usa overload antigo | Migrar para novo |
| `rpc_log_search_event` | ❌ Não usado | **Integrar em GlobalSearch** |
| `rpc_record_search_click` | ❌ Não usado | **Integrar em GlobalSearch** |
| `rpc_search_insights` | ❌ Sem painel admin | **Criar painel admin** |
| `rpc_record_event_key_usage` | ❌ Não usado | **Integrar no webhook edge function** |

Também observado: warning no console — `VirtualizedRealtimeList` passa ref para `ConversationPreviewLine` que não usa `forwardRef`. É uma regressão simples a corrigir junto.

### O que vai ser construído

#### 1. Telemetria de busca global (`rpc_log_search_event` + `rpc_record_search_click`)

Em `src/components/inbox/useGlobalSearchData.ts`:
- Após cada `performSearch` bem-sucedido (com `cleanQuery.length >= 2`), chamar `supabase.rpc('rpc_log_search_event', { p_query, p_entities: Array.from(types), p_result_count: searchResults.length, p_used_vector: false })`.
- Guardar o `searchEventId` retornado em `useRef` para correlação com clique.
- `fire-and-forget` (não bloqueia UI, captura erro via `log.warn`).

Em `src/components/inbox/GlobalSearch.tsx`:
- No `handleSelect(result)`, chamar `supabase.rpc('rpc_record_search_click', { p_query: search, p_result_id: result.id, p_result_type: result.type })` antes de fechar.

#### 2. Painel admin de Search Insights

Nova rota `/admin/search-insights` (apenas admin):
- `src/pages/AdminSearchInsightsPage.tsx` — orquestra fetch via `useQuery(['search-insights', days])` chamando `rpc_search_insights({ p_days })`.
- Seletor de janela (1d / 7d / 30d).
- Cards KPI: total de buscas, % vector, click-through rate, zero-result rate.
- Tabela "Top queries" (query, count, avg_results).
- Tabela "Zero result queries" (query, count, last_at) — base para curar Knowledge Base.
- Empty state via `GenericEmptyState` quando `total_searches === 0`.
- Adicionar entrada em `sidebarNavConfig.ts` (seção admin) e rota em `ViewRouter.tsx` com role-gate `admin`.

#### 3. Migrar `useFailedMessages` para o overload novo

A função tem **dois overloads** no banco. Frontend usa o antigo (`p_status` text). O novo aceita `p_status text[]` e retorna `last_attempt_at`. Em `src/hooks/monitoring/useFailedMessages.ts`:
- Já passa `p_status: status ? [status] : null` (array) — `types.ts` reflete os 2 overloads, o TS escolhe automaticamente. Validar via `tsc --noEmit` que está pegando o overload de array.
- Expor `last_attempt_at` no tipo `FailedMessage` e renderizar coluna "Última tentativa" em `FailedMessagesTable.tsx` (badge "há Xmin" via `formatDistanceToNow`).
- Remover `as any` do call de `rpc_dlq_log_reprocess_trigger` (RPC já tipada em `types.ts`).

#### 4. Instrumentação `rpc_record_event_key_usage` na edge function de webhook

Em `supabase/functions/evolution-webhook/index.ts` (ou a que valida HMAC):
- Após validar `x-evolution-signature` com sucesso usando uma chave de `system_event_keys`, chamar `supabase.rpc('rpc_record_event_key_usage', { p_key_id: keyId })` em fire-and-forget.
- Permite tracking de uso/last-seen para rotação de chaves.

#### 5. Correção do warning de ref

Em `src/components/inbox/VirtualizedRealtimeList.tsx` ou `ConversationPreviewLine`:
- Envolver `ConversationPreviewLine` em `React.forwardRef<HTMLDivElement, Props>` e propagar a ref para o div raiz.
- Elimina warning no console (compliance com Core: "Direct children of `AnimatePresence` must use `React.forwardRef()`").

### Detalhes técnicos

**Arquivos a criar:**
- `src/pages/AdminSearchInsightsPage.tsx` (~250 linhas)
- `src/pages/admin-search-insights/SearchInsightsKPICards.tsx` (~80 linhas)
- `src/pages/admin-search-insights/SearchInsightsTables.tsx` (~120 linhas)
- `src/hooks/useSearchInsights.ts` (~50 linhas) — wrapper de `useQuery`

**Arquivos a editar:**
- `src/components/inbox/useGlobalSearchData.ts` — log search event
- `src/components/inbox/GlobalSearch.tsx` — record click
- `src/hooks/monitoring/useFailedMessages.ts` — remover `as any`, expor `last_attempt_at`
- `src/components/admin/dlq/FailedMessagesTable.tsx` (ou equivalente) — coluna "Última tentativa"
- `src/components/inbox/VirtualizedRealtimeList.tsx` ou `ConversationPreviewLine.tsx` — forwardRef
- `src/config/sidebarNavConfig.ts` — entrada "Search Insights" (admin)
- `src/pages/ViewRouter.tsx` — rota lazy + role-gate
- `supabase/functions/evolution-webhook/index.ts` — chamar `rpc_record_event_key_usage` quando keyId conhecido

**Padrões respeitados:**
- Telemetria fire-and-forget (nunca bloqueia UI).
- Role-gate duplo: RPC já tem `has_role('admin')` + `ProtectedRoute` no frontend.
- `useQuery` com `staleTime: 60_000`, refetch on focus desabilitado em painel pesado.
- Tokens semânticos, `GenericEmptyState`, max ~340 linhas/arquivo.
- Sem `console.log`, usar `log` de `@/lib/logger`.
- Sem `as any` (manter padrão consolidado da última correção de tipos).

### Fora de escopo

- Migrar `useGlobalSearchData` para usar a edge function `semantic-search` com vetor real (lote separado — hoje busca direto em `messages`/`contacts`, então `p_used_vector: false` é honesto).
- Rotação automatizada de `system_event_keys` (UI de gestão de chaves) — requer lote próprio.
- Outros RPCs que já estão integrados (`rpc_dlq_*`, `rpc_instance_auth_event_*`).

