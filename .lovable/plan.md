## Página: `/admin/external-db-explorer`

Painel admin para testar conexão e explorar amostras do FATOR X através da edge function `external-db-proxy` (sem expor credenciais no cliente).

### Acesso
- Rota protegida em `src/App.tsx` com `ProtectedRoute requiredRoles={['admin','dev']}`.
- Link no `sidebarNavConfig.ts` (seção Admin → "Explorador FATOR X").

### Layout (uma única tela, 3 blocos)

```text
┌──────────────────────────────────────────────────────┐
│ 1. HEALTH CHECK                                      │
│   [Testar conexão]  status: ✅ 312ms · cid · rid    │
│   Mostra latência média de 3 pings (rpc_dashboard…)  │
├──────────────────────────────────────────────────────┤
│ 2. CATÁLOGO DE TABELAS (cards clicáveis)             │
│   evolution_messages (1.787.475)  evolution_contacts │
│   evolution_conversations  evolution_calls  …        │
│   → clique = preenche o explorador abaixo            │
├──────────────────────────────────────────────────────┤
│ 3. EXPLORADOR                                        │
│   Modo:  ( ) SELECT table   ( ) RPC                  │
│   Tabela: [select]  Limit:[10]  Filtros (k=v key)+   │
│   ou RPC: [select rpc]  Params (JSON editor)         │
│   [Executar]                                         │
│   Resultado: tabela paginada + botão "Ver JSON cru"  │
│   Footer: status, ms, count, cid, rid               │
└──────────────────────────────────────────────────────┘
```

### Funcionalidade detalhada

**Bloco 1 — Health check**
- Botão dispara 3 chamadas paralelas a `external-db-proxy` com `action: 'rpc'`, `rpc: 'rpc_dashboard_home'`, `params: { p_instance: 'wpp2', p_assigned_to: null }`.
- Exibe: status agregado (✅/⚠️/❌), latência min/med/max, `cid`/`rid` da última, payload colapsável.

**Bloco 2 — Catálogo**
- Lista hardcoded das tabelas `evolution_*` conhecidas (do project-knowledge), agrupada por categoria (Operacional, Pipeline, Automação, Webhook, Config).
- Para cada uma: faz `action: 'select'`, `select: 'id'`, `limit: 1`, `countMode: 'exact'` ao montar → exibe contagem real.
- Card clicável → preenche bloco 3 e dá scroll.

**Bloco 3 — Explorador**
- **Modo SELECT**: dropdown com tabelas conhecidas, input numérico de `limit` (1–50, default 10), construtor de filtros simples `[coluna] [op: eq/ilike/gt/lt] [valor]` (até 5).
- **Modo RPC**: dropdown com as 27 RPCs do catálogo (`rpc_list_messages`, `rpc_get_contact`, `rpc_dashboard_home`, …) + editor JSON para params, com placeholder do shape esperado por RPC.
- Botão "Executar" → POST `external-db-proxy` via `supabase.functions.invoke('external-db-proxy', { body })`.
- Resultado: tabela densa (até 50 linhas) com colunas dinâmicas; campos jsonb mostrados truncados com expandir; botão "Copiar JSON" e "Baixar JSON".
- Footer permanente com `status`, `ms` (do `Server-Timing`), `count`, `cid`, `rid` para rastreio em logs.

### Guard-rails
- `limit` máx 50 no UI (proxy bloqueia >100 em heavy tables sem filtro narrow).
- Bloquear `action: 'insert'/'update'` — esta tela é **read-only**.
- Erros do proxy (cls 400/502/timeout) renderizados em alert vermelho com `detail` + cid para colar nos logs.
- Toda chamada loga via `getLogger('AdminExternalDbExplorer')` com `cid`/`rid`.

### Arquivos a criar/editar

Novos:
- `src/pages/admin/AdminExternalDbExplorerPage.tsx` (composição)
- `src/pages/admin/external-db-explorer/HealthCheckBlock.tsx`
- `src/pages/admin/external-db-explorer/TableCatalogBlock.tsx`
- `src/pages/admin/external-db-explorer/QueryExplorerBlock.tsx`
- `src/pages/admin/external-db-explorer/catalog.ts` (lista de tabelas + RPCs com shape de params)
- `src/hooks/useExternalDbProxy.ts` (wrapper único sobre `supabase.functions.invoke('external-db-proxy', …)` retornando `{data, error, ms, cid, rid, status}`)
- `src/hooks/__tests__/useExternalDbProxy.test.ts`

Editados:
- `src/App.tsx` — registrar rota lazy `/admin/external-db-explorer` com gate `admin|dev`.
- `src/components/sidebar/sidebarNavConfig.ts` — entrada admin.

### Stack
- React Query para cache (`staleTime: 30s`) das contagens do catálogo.
- shadcn `Card`, `Table`, `Tabs`, `Select`, `Button`, `Badge`, `Alert`, `Collapsible`.
- `react-json-view-lite` (já presente no projeto se houver; senão `<pre>` com `JSON.stringify(…, null, 2)`).
- Logger `src/lib/logger.ts`.

### Não incluído (fora de escopo)
- Não cria RPC nova no FATOR X (proxy não aceita SQL bruto — usa só catálogo existente).
- Sem mutation/insert/update.
- Sem listagem dinâmica via `information_schema` (não existe RPC para isso hoje; catálogo é estático).