# Onda de bugs do console — RCA + plano de correção em 50 etapas

**Data:** 2026-09-06 · **Build em produção na captura:** `1788635180130` (aba antiga) vs `1788691049469` (servidor)
**Commit em produção:** `a8c50b85c7b64e68d413860bfeb0166161dbde09`
**Fonte:** console de `https://zapp.atomicabr.com.br/?subTab=waiting&scope=mine` (10:11–10:49 BRT)

> Este documento é **diagnóstico + plano**. Nenhuma correção de código foi aplicada ainda.

---

## 1. Resumo dos achados

| # | Sintoma no console | Causa raiz | Status da prova |
|---|--------------------|-----------|-----------------|
| **A** | `GET /rest/v1/{sales,carriers,customers,suppliers,company_rfm_scores} 404` | O front consulta 5 tabelas que **não existem** no banco (nem em `zapp`, nem em `evo`, nem em `public`) — resquício do CRM "external" pré-consolidação | **Provado ao vivo** (PGRST205 no PostgREST de prod + ausência no `supabase/schema-catalog.json`) |
| **B** | `POST /functions/v1/promogifts-catalog 500` (×5) | No projeto externo PromoGifts (`doufsxqlfjyuvxuezpln`), o role **`anon` só tem `SELECT` em `products(id, is_active, is_deleted)` e nenhum grant em `suppliers`**. A edge function usa a **anon key** → PostgREST devolve `42501` → `throw` → catch global → **500 genérico** | **Provado ao vivo** (`information_schema.column_privileges` + requests HTTP reais ao PostgREST do PromoGifts) |
| **C** | `GET/HEAD /assets/index-<buildId>.js 404` + `[buildVersion] Bundle não acessível no CDN — reload adiado` | No caminho `SW_UPDATED`, `requestGracefulRefresh()` é chamado **sem o `entry`**; o fallback monta `/assets/index-${buildId}.js`, mas `buildId` é um **timestamp**, não o hash do Vite. O asset nunca existe → o HEAD 404 aborta o reload e o prefetch loga 404 | **Provado no código** (`useServiceWorker.ts:362` + `buildVersion.ts:361-372/398-406`) e coerente com `version.json` de prod (`entry: assets/index-BNRARq3h.js`) |
| **D** | `[WARN] [safeClient] Erro na query from {sla_delivery_rules, contact_tags, messages}` repetindo a cada ~180 ms por ~13 s | Os 3 hooks do painel de contato são **remontados/refetchados em rajada** e as requisições anteriores são canceladas (`AbortError`/fila saturada). O erro é rebaixado a WARN, mas **`recordFailure` continua sendo chamado** e o painel fica sem dados | **Parcial** — o mecanismo de log está provado; o gatilho do ciclo (remount vs. invalidação em cascata) exige instrumentação em produção. Não invento causa aqui |

### Contexto de carga (alimenta D)
- No boot da sessão capturada: **~190 `GET` + ~59 `POST` + 22 `HEAD` + 18 `PATCH`** em poucos segundos.
- Semáforo do cliente: `SUPABASE_MAX_CONCURRENT = 8`, `QUEUE_CAP = 80`, `QUEUE_WAIT_TIMEOUT_MS = 15 s` (`src/integrations/supabase/client.ts`).
- **73 ocorrências de `refetchInterval`** no código (16× 30 s, 11× 60 s, 8× 30000 ms…), o que mantém pressão contínua sobre esses 8 slots.

---

## 2. Evidências (comandos reproduzíveis)

**A — tabelas inexistentes** (anon key pública do bundle):
```
GET https://supabase.atomicabr.com.br/rest/v1/sales?select=id&limit=1
→ 404 {"code":"PGRST205","message":"Could not find the table 'zapp.sales' in the schema cache"}
```
Mesma resposta para `carriers`, `customers`, `suppliers`, `company_rfm_scores`.
Consumidores: `src/components/crm360/CRM360StatsCards.tsx:19-25`, `src/features/admin/components/AdminCRMDashboard.tsx:95,211,215`, `src/components/crm360/crm360TabsData.ts`, via `useExternalSelect` → `queryExternal()` (`src/hooks/useExternalApiManagement.ts:1260-1303`), que usa o **cliente do zapp** (`getDynamicClient()`), não um datasource externo.

**B — grants no PromoGifts** (`information_schema.column_privileges`, projeto `doufsxqlfjyuvxuezpln`):
```
products      | anon          | id, is_active, is_deleted        ← só 3 colunas
products      | authenticated | (todas)
suppliers     | anon          | (nenhuma)
suppliers     | authenticated | (todas)
categories    | anon          | (todas)                          ← por isso list_categories funciona
```
Requests reais confirmando:
```
/rest/v1/products?select=id            → 200
/rest/v1/products?select=id,name       → 401 {"code":"42501","message":"permission denied for table products"}
/rest/v1/suppliers?select=id,name      → 401 {"code":"42501","message":"permission denied for table suppliers"}
```
Secrets `PROMOGIFTS_SUPABASE_URL` e `PROMOGIFTS_SUPABASE_ANON_KEY` **existem** no processo do `supabase_functions` (verificado em `/proc/1/environ`) — não é falta de configuração. O código deployado é idêntico ao do repo (`md5 89bf1c47…`).

**C — buildVersion**: `version.json` de prod publica `entry`/`entryCss` corretamente; o caminho `SW_UPDATED` (`src/hooks/useServiceWorker.ts:362`) não repassa esse `entry`, e `isBundleReachable`/`prefetchNewBundle` caem no fallback `/assets/index-${remoteBuildId}.js`.

---

## 3. Plano de correção — 50 etapas

Ordem = ordem de execução. Cada fase é mergeável isoladamente.

### Fase 0 — Evidência e instrumentação (não muda comportamento)
1. Criar issue-mãe "Onda console 2026-09-06" no GitHub linkando este documento e as 4 causas.
2. Registrar os 4 bugs em `CLAUDE.md` → seção **Bugs Abertos** (hoje diz "Nenhum bug aberto"), com link para este arquivo.
3. Adicionar contador de queries por boot em `src/lib/clientTelemetry.ts` (janela de 15 s desde o `DOMContentLoaded`) e logar um único resumo `[boot] queries=N drops=M`.
4. Expor `getSupabaseQueueStats()` no resumo do passo 3 (`inFlight`, `queueLength`, `saturated`) para correlacionar drop com saturação.
5. Instrumentar `safeClient.log` com o `error.code`/`name` **não mascarado** (só o código, nunca payload) — hoje o `detail` sai como `{…}` e impede classificar 42501 vs AbortError no campo.
6. Deploy da Fase 0 em produção e coleta de 1 sessão real de boot da inbox (aba do dono) para fechar a causa do bug D com dado, não com hipótese.

### Fase 1 — Bug A: tabelas fantasma do CRM 360 (mata os 404)
7. Rodar inventário: `grep -rn` de cada nome de `ExternalTableName` (`src/types/externalDB.ts:461-500`) contra `supabase/schema-catalog.json` e gerar a lista definitiva de nomes inexistentes (hoje ao menos: `customers`, `sales`, `suppliers`, `carriers`, `company_rfm_scores`, `leads`, `orders`, `deals`, `quotations`).
8. Decidir o destino de cada nome: (a) tabela existe com outro nome no `zapp` (ex.: `empresas`, `contatos`, `interactions`) → renomear no front; (b) não existe em lugar nenhum → remover do UI.
9. Criar `src/integrations/datasource/externalTableRegistry.ts` com o mapa `nomeLógico → { table, exists }` derivado do `schema-catalog.json` (fonte única, sem string solta em componente).
10. Fazer `queryExternal()` consultar esse registry e **falhar rápido, sem request**, quando `exists === false` (retorna `{data: [], meta:{record_count:null, unavailable:true}}`).
11. Ajustar `CRM360StatsCards.tsx` para renderizar "—" + tooltip "métrica indisponível neste ambiente" quando `unavailable`, em vez de `0`.
12. Aplicar o mesmo tratamento em `AdminCRMDashboard.tsx` (`MetricCard`) e em `crm360TabsData.ts` (abas de tabelas inexistentes ficam ocultas, não quebradas).
13. Remover de `ExternalTableName`/`EXTERNAL_TABLE_LABELS` os nomes classificados como (b) no passo 8.
14. Teste unitário: `queryExternal` com tabela inexistente **não** chama o cliente Supabase (spy) e devolve `unavailable`.
15. Verificar em prod pós-deploy: abrir CRM 360 e Admin CRM e confirmar **zero** `PGRST205` no console.

### Fase 2 — Bug B: `promogifts-catalog` 500
16. Decidir o modelo de acesso: a função **já autentica o usuário do zapp** antes de tocar no banco externo → usar **service_role do PromoGifts** é preferível a abrir `GRANT` para `anon` (que exporia o catálogo publicamente na internet).
17. Criar o secret `PROMOGIFTS_SUPABASE_SERVICE_ROLE_KEY` no stack do `supabase_functions` (Portainer → env do serviço), sem remover a anon key.
18. Em `supabase/functions/promogifts-catalog/index.ts`, criar o client externo com `SERVICE_ROLE ?? ANON` e registrar em log qual modo está ativo (`mode=service_role|anon`).
19. Estender `REQUIRED_SECRETS`/`runHealthCheck` para reportar `mode` e testar `products(select=name)` + `suppliers(select=id)` — o health atual só testa `categories`, justamente a tabela que **não** quebra.
20. Trocar o catch global genérico por mapeamento de erro: `42501` → **403** `EXTERNAL_DB_FORBIDDEN` (com a tabela no corpo), `PGRST2xx` → **502** `EXTERNAL_DB_SCHEMA_MISMATCH`, resto → 500. Mantém o corpo sem dados sensíveis.
21. Propagar `mode`/`code` no `meta` das respostas 200 para o front distinguir degradação de falha.
22. No front (`useExternalCatalog`), tratar 403/502 como **estado degradado** (catálogo indisponível, sem retry) em vez de erro que remonta — hoje 3 queries × retry batem na função em rajada.
23. Deploy da função (`edge-deploy.yml` dispara em merge que toca `supabase/functions/**`) e validação: `GET /functions/v1/promogifts-catalog/health` → `status: ok`, `mode: service_role`.
24. Validar as 3 actions com um JWT real de usuário (`list_products`, `list_categories`, `list_suppliers` → 200) e registrar as evidências no `docs/CHANGELOG_SESSIONS.md`.

### Fase 3 — Bug C: 404 de `/assets/index-<buildId>.js` e reload que nunca aplica
25. Em `src/lib/buildVersion.ts`, extrair `fetchVersionPayload()` (fetch + validação de content-type) reutilizável, hoje embutido em `checkVersion()`.
26. Em `requestGracefulRefresh(reason, remote, entry?)`: quando `entry` for `undefined`, buscar `version.json` **antes** de agendar e usar `payload.entry` (e `entryCss`).
27. Em `isBundleReachable()`, **remover o fallback** `/assets/index-${remoteBuildId}.js`: sem `entry` conhecido, retornar `true` (não bloquear o reload) em vez de fazer um HEAD garantido-404.
28. Mesma regra em `prefetchNewBundle()`: sem `entry`, não prefetchar (evita o `GET` 404 que hoje polui o console em todo deploy).
29. Em `useServiceWorker.ts:362`, passar o `entry` quando disponível na mensagem do SW; alternativamente, incluir `entry` no payload do `SW_UPDATED` (stamp em `vite.config.ts` → `stampSwVersionPlugin`).
30. Teste unitário em `src/lib/__tests__/buildVersion*.test.ts`: `SW_UPDATED` sem `entry` → nenhum HEAD/GET em `/assets/index-<timestamp>.js`; com `version.json` mockado → HEAD no `entry` real.
31. Teste: `isBundleReachable` sem `entry` não emite request e devolve `true`.
32. Pós-deploy, validar em produção que um deploy novo aplica o reload pela via do SW (log `Forcing bundle refresh: sw-updated:<id>` seguido de reload, sem "Bundle não acessível").

### Fase 4 — Bug D: rajada de queries canceladas no painel de contato
33. Com o dado da etapa 6, classificar o ciclo: (i) remount de componente, (ii) `invalidateQueries` em cascata, (iii) `queryKey` instável. Só seguir para o fix após essa classificação.
34. Auditar `queryKeys.sla.deliveryConfig` / `queryKeys.tags.contact` / `['conversation-messages', contactId]` quanto a identidade estável (objeto literal em key ⇒ nova query por render).
35. Auditar os `invalidateQueries` disparados por realtime em `useRealtimeInbox.ts`/`useRealtimeMessages.ts`: agrupar invalidações do mesmo contato em um debounce de 250–500 ms.
36. Adicionar `structuralSharing`/`placeholderData` onde a lista do painel remonta a cada evento, para o remount não zerar o cache.
37. Em `safeClient.from`, **não** chamar `recordFailure` quando o erro for abort/cancelamento (hoje só o nível do log é rebaixado; a telemetria continua contando falha e polui `recentFailures`).
38. Rebaixar o texto do log de abort para `Query cancelada (abort)` — "Erro na query" para um cancelamento normal é ruído que mascara falha real.
39. Em `useContactTags` e `useConversationMessagesData`, tratar erro de abort sem `throw` (retornar cache anterior), evitando retry do TanStack em cima de cancelamento.
40. Revisar o dimensionamento do semáforo: com boot de ~250 requests, avaliar `SUPABASE_MAX_CONCURRENT` 8 → 12 **somente** após medir o p95 do PostgREST (não aumentar às cegas: o gargalo pode virar o DB).
41. Reduzir o fan-out do boot: identificar as N queries que disparam antes do primeiro paint da inbox e adiar as não críticas (`enabled` por visibilidade/aba ativa).
42. Auditar os 73 `refetchInterval`: converter para `refetchIntervalInBackground: false` onde faltar e alinhar os de 30 s que não têm requisito de tempo real.
43. Teste de regressão: montar/desmontar o painel de contato 20× em sequência e afirmar ≤1 request por hook por contato (vitest + mock do safeClient).

### Fase 5 — Travas para não regredir
44. Guard de CI (`scripts/`): falha o build se algum literal de tabela usado por `useExternalSelect`/`safeClient.from` não existir em `supabase/schema-catalog.json`. Mata a classe do bug A de uma vez.
45. Guard de CI: proibir novo `createClient` apontando para projeto externo fora de `_shared/` (o acesso ao PromoGifts deve passar por um único gateway, como já é a regra da Evolution API).
46. Adicionar ao `zapp-functions-health` um probe periódico de `promogifts-catalog/health` com alerta quando `status != ok` (hoje a quebra só aparece no console do usuário).
47. Criar alerta no Sentry para `PGRST205` e `42501` vindos do front (regra por `error.code`), com dedupe por tabela.
48. Documentar em `docs/ARQUITETURA_CANONICA.md` a fronteira "zapp × PromoGifts": quem acessa, com qual role, por qual função.
49. Atualizar `docs/CHANGELOG_SESSIONS.md` com o RCA das 4 causas e as evidências desta sessão.
50. Fechar a issue-mãe (etapa 1) só depois de: console de produção limpo em um boot completo da inbox + 1 deploy observado sem 404 de asset + `promogifts-catalog/health` verde por 24 h.

---

## 4. Fora de escopo desta análise
- Os `401` de `interactions`/`sla_delivery_rules` observados nos testes com **anon key** são esperados (RLS exige `authenticated`) e não representam o erro visto pelo usuário logado.
- `Missing authorization header` e `early termination`/`wall clock duration warning` nos logs do `supabase_functions` foram observados, mas **não** foram correlacionados a estes 4 bugs — merecem investigação própria.
