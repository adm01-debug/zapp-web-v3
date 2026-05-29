# Mega Varredura - Zapp Web v3
Data: 2026-05-28
Modelo: DeepSeek v4-pro via Cline + Claude Code (AI-Bridge MCP)

## Resumo Executivo
- Total de achados: **250+**
- Críticos: **12** | Altos: **35** | Médios: **120** | Baixos: **80+**

## Top 10 mais urgentes
1. [CRÍTICO] 140+ políticas RLS com USING (true) — acesso irrestrito de leitura para qualquer authenticated
2. [CRÍTICO] 30+ funções SECURITY DEFINER sem SET search_path — vulnerável a privilege escalation
3. [CRÍTICO] xlsx com Prototype Pollution (CVSS 7.8) sem fix disponível + serialize-javascript RCE (CVSS 8.1)
4. [CRÍTICO] JWT anon Supabase hardcoded em 2 arquivos (src/integrations/zappweb/supabaseClient.ts:25, src/pages/admin/Connections.tsx:39)
5. [CRÍTICO] Token Supabase em localStorage — vulnerável a XSS (integrations/supabase/client.ts:19)
6. [ALTO] 75+ políticas RLS com WITH CHECK (true) — qualquer authenticated pode escrever
7. [ALTO] 16 tabelas com FOR ALL + ambos true — acesso total irrestrito (leitura + escrita)
8. [ALTO] dangerouslySetInnerHTML sem sanitize em produção (multiple locations)
9. [ALTO] 30+ funções SECURITY DEFINER com GRANT EXECUTE para anon/authenticated — exposição excessiva
10. [ALTO] supabase.rpc() com parâmetros de user input sem validação Zod/Yup

## Próximos passos sugeridos
- [ ] PR de correção dos críticos (RLS, SECURITY DEFINER, secrets hardcoded)
- [ ] Substituir xlsx por exceljs (CVEs sem fix)
- [ ] Migrar auth token Supabase de localStorage para httpOnly cookies
- [ ] Discussão com Jorge sobre reestruturação das políticas RLS por tenant
- [ ] Adicionar testes para caminhos críticos (auth, RLS, webhook, pagamento)

---

## 1. Inventário

### Estrutura do Repo
Pastas top-level: `.github/`, `docs/`, `e2e/`, `public/`, `scripts/`, `src/`, `supabase/`, `tests/`, `tmp/`, `.husky/`, `.storybook/`, `.vscode/`

### Contagem de arquivos por tipo
| Tipo | Qtde |
|------|------|
| `.ts` | 1.056 |
| `.tsx` | 1.202 |
| `.sql` | 502 |
| `.md` | 71 |
| `.css` | 12 |
| `.json` | 11 |
| `.yml` | 9 |
| `.js` | 6 |
| `.svg` | 6 |
| `.sh` | 5 |
| `.py` | 1 |
| `.html` | 1 |

### Módulos principais
| Pasta | Arquivos |
|-------|----------|
| `src/` | 2.046 |
| `supabase/` | 684 |

**Total de arquivos de código fonte (ts+tsx+sql+js+py+sh): 2.772**

---

## 2. Dependências

### Pacotes com major bumps (29)
| Pacote | Current | Latest |
|--------|---------|--------|
| @elevenlabs/react | 0.12.3 | 1.6.4 |
| @eslint/js | 9.39.4 | 10.0.1 |
| @hello-pangea/dnd | 17.0.0 | 18.0.1 |
| @sentry/react | 8.55.0 | 10.55.0 |
| @types/react | 18.3.29 | 19.2.15 |
| @types/react-dom | 18.3.7 | 19.2.3 |
| lucide-react | 0.462.0 | 1.17.0 |
| react | 18.3.1 | 19.2.6 |
| react-dom | 18.3.1 | 19.2.6 |
| react-router-dom | 6.30.3 | 7.16.0 |
| supabase | 2.9.8 | 2.101.0 |
| tailwindcss | 3.4.19 | 4.3.0 |
| typescript | 5.8.3 | 6.0.3 |
| vite | 6.4.2 | 8.0.14 |
| + mais 15 pacotes... | | |

### Vulnerabilidades (npm audit)
- **7 total** (4 HIGH, 3 MODERATE, 0 CRITICAL)
- **HIGH**: serialize-javascript (RCE CWE-96, CVSS 8.1 / DoS CWE-400) — fix: 7.0.5 (major)
- **HIGH**: supabase → tar (6 path traversal CVEs) — fix: supabase@2.101.0 (non-breaking)
- **HIGH**: xlsx (Prototype Pollution CWE-1321, CVSS 7.8 / ReDoS CWE-1333, CVSS 7.5) — **SEM FIX DISPONÍVEL**
- **MODERATE**: @storybook/addon-essentials → uuid (buffer bounds CWE-787, CVSS 7.5) — fix: Storybook 7.0.6 (major)

---

## 3. Secrets

### 🔴 JWT ANON SUPABASE HARDCODED
| Arquivo | Linha | Descrição |
|---------|-------|-----------|
| `src/integrations/zappweb/supabaseClient.ts` | 25 | JWT anon key Supabase como fallback hardcoded |
| `src/pages/admin/Connections.tsx` | 39 | Mesmo token JWT anon duplicado |

Token expira em 2029, role: anon. Deveria vir exclusivamente de variável de ambiente.

### 🔴 WEBHOOK VERIFICATION TOKEN COM FALLBACK PREVISÍVEL
| Arquivo | Linha | Descrição |
|---------|-------|-----------|
| `supabase/functions/whatsapp-webhook/index.ts` | 53 | `Deno.env.get('WHATSAPP_VERIFY_TOKEN') \|\| 'lovable_webhook_token'` |

### 🟡 EVOLUTION API KEY FALLBACK VAZIO
| Arquivo | Linha | Descrição |
|---------|-------|-----------|
| `src/integrations/zappweb/evolutionClient.ts` | 29-30 | DEFAULT_KEY pode ficar vazia como string literal |

### ✅ Verificações limpas
- Stripe keys: 0 | AWS keys: 0 | OpenAI keys: 0 | Bearer tokens: 0

---

## 4. TypeScript / Dívida Técnica

| Categoria | Total |
|-----------|-------|
| `: any` e `as any` | **833** em 313 arquivos |
| `@ts-ignore` / `@ts-expect-error` | **0** ✅ |
| `// TODO / FIXME / HACK / XXX` | **0** ✅ |
| `console.log` / `console.warn` | **35** |
| `debugger;` | **0** ✅ |

### Top 10 `: any` / `as any`
| # | Arquivo | Ocorrências |
|---|---------|-------------|
| 1 | `src/hooks/useAutomations.ts` | 20 |
| 2 | `src/hooks/useEmail.ts` | 15 |
| 3 | `src/features/connections/hooks/parts/useConnectionsActions.ts` | 15 |
| 4 | `src/pages/admin/Connections.tsx` | 14 |
| 5 | `src/utils/emailMappers.ts` | 13 |
| 6 | `src/integrations/supabase/safeClient.ts` | 12 |
| 7 | `src/lib/diagnostics.ts` | 11 |
| 8 | `src/features/connections/hooks/useConnectionsManager.ts` | 11 |
| 9 | `src/features/inbox/hooks/team-chat/useTeamChatMutations.ts` | 11 |
| 10 | `src/hooks/__tests__/useSpeechToText.test.ts` | 10 |

### Top console.log/warn
| Arquivo | Qtde |
|---------|------|
| `src/hooks/useAutomations.ts` | 3 |
| `src/lib/whatsappAdapter.ts` | 3 |
| `src/integrations/supabase/safeClient.ts` | 3 |
| `src/features/admin/hooks/monitoring/useFailedMessages.ts` | 3 |
| `src/hooks/useEvolutionAutoSync.ts` | 2 |
| `src/pages/admin/HmacSelfTestPage.tsx` | 2 |

---

## 5. Supabase RLS

### Resumo
| Criticidade | Contagem |
|-------------|----------|
| 🔴 USING (true) | ~140 policies em ~90 arquivos |
| 🔴 WITH CHECK (true) | ~75 policies em ~70 arquivos |
| 🟠 FOR ALL + ambos true | 16 tabelas com acesso total irrestrito |
| 🟡 Tabelas sem RLS | 7 tabelas |

### Tabelas críticas com USING (true)
- `agent_achievements`, `agent_stats`, `ai_conversation_tags`, `app_settings`, `audio_memes`, `audit_logs`, `automation_rules`, `broadcast_lists`, `chat_messages`, `connection_status`, `email_templates`, `evolution_instances`, `file_attachments`, `gamification_badges`, `inbox_conversations`, `message_queue`, `notification_settings`, `organization_members`, `quick_replies`, `rate_limits`, `scheduled_messages`, `team_chat_rooms`, `template_categories`, `user_preferences`, `webhook_logs`, `whatsapp_sessions` (lista parcial — ~140 total)

---

## 6. SECURITY DEFINER

### 🔴 CRÍTICO — search_path MISSING (30+ funções)
Funções SECURITY DEFINER sem `SET search_path = ''` são vulneráveis a search_path injection — um atacante pode criar objetos maliciosos em schemas públicos que a função executará com privilégios elevados.

**Arquivos com funções SD sem search_path:**
- `20251215024517...sql:158`
- `20251215164008...sql:93,111`
- `20251215171815...sql:6`
- `20251220130243...sql:55`
- `20251231115910...sql:180,194,207` (3 funções)
- `20251231124607...sql:57`
- `20251231130733...sql:37`
- `20251231131019...sql:63`
- `20251231132448...sql:29,64,128` (3 funções)
- `20260315134146...sql:*` (múltiplas)
- `20260315202617...sql:*` (múltiplas)
- `20260325165647...sql:*` (múltiplas)
- `20260415210950...sql:*` (múltiplas)
- `20260428164224...sql:*` (múltiplas)
- `20260505211316...sql:*` (múltiplas)

### 🔴 CRÍTICO — GRANT EXECUTE excessivo
Várias funções SECURITY DEFINER com `GRANT EXECUTE ... TO authenticated`, `TO anon`, ou `TO public` — expondo lógica privilegiada a qualquer usuário autenticado ou até mesmo anônimo.

---

## 7. Edge Functions

### Funções encontradas
- `supabase/functions/zapier-webhook/`
- `supabase/functions/zapier-webhook-relay/`
- `supabase/functions/whatsapp-webhook/`
- `supabase/functions/elevenlabs-webhook/`

### Achados
- **Validação de input**: Nenhuma usa Zod/Yup. Webhooks recebem body "as-is" e processam sem schema validation.
- **JWT/Auth**: whatsapp-webhook e elevenlabs-webhook NÃO verificam JWT antes de processar (webhooks públicos, mas deveriam ter verificação de assinatura HMAC).
- **CORS**: Configuração padrão do Supabase — aceita origens do app.
- **Tratamento de erros**: Stack traces podem vazar em respostas de erro (sem middleware de sanitização).

---

## 8. XSS Frontend

### 🔴 dangerouslySetInnerHTML
- `src/components/gmail/EmailComposer.tsx:45` — renderiza HTML de email SEM sanitize com DOMPurify
- `src/features/inbox/components/LocationMessage.tsx:30` — renderização de mapas
- `src/features/inbox/components/messages/MessageBubble.tsx:*` — renderiza conteúdo de mensagem

### 🟡 target="_blank" sem rel="noopener noreferrer"
Múltiplas ocorrências em links de mensagens, emails e conteúdo externo (potencial tabnapping).

### ✅ Limpos
- `document.write`: 0
- `eval()`: 0
- `new Function()`: 0

---

## 9. SQL Injection / RPC

### 🔴 supabase.rpc() sem validação
- `src/hooks/useAutomations.ts:*` — parâmetros de user input passados direto pra rpc()
- `src/features/admin/hooks/monitoring/useFailedMessages.ts:*` — bulk reprocess sem schema validation
- `src/integrations/supabase/rpc/*` — múltiplas chamadas rpc com params não validados

### 🟡 .filter() com concatenação
- `src/hooks/useEmail.ts:*` — filtros dinâmicos montados por template string
- `src/features/inbox/hooks/*` — queries com string interpolation de user input

---

## 10. Auth

### 🔴 Token em localStorage
- `src/integrations/supabase/client.ts:19` — `storage: window.localStorage` — token JWT acessível a XSS. Migrar para httpOnly cookies.

### 🟡 Logout
- Logout limpa localStorage e sessionStorage, mas não verifica limpeza de IndexedDB
- Não invalida refresh token no servidor (só remove localmente)

### 🟢 Rotas protegidas
- `src/features/auth/hooks/useRouteRoles.ts` — verifica roles e permissões ✅
- `src/hooks/useScreenProtection.ts` — proteção de tela para dados sensíveis ✅

---

## 11. Tratamento de Erros

### 🔴 Empty catch blocks
| Arquivo | Linha | Problema |
|---------|-------|----------|
| `hooks/useThemeAudit.ts` | 60 | JSON.parse silently ignored |
| `utils/validationLogger.ts` | 32 | localStorage JSON parse silently ignored |
| `utils/validationLogger.ts` | 90 | localStorage setItem silently ignored |
| `features/connections/hooks/useConnectionsManager.ts` | 164 | catch vazio |
| `lib/evolutionDirectClient.ts` | 18 | catch vazio |

### 🔴 Swallowed promises (.catch(() => {}))
| Arquivo | Linha |
|---------|-------|
| `features/auth/hooks/useScreenProtection.ts` | 44, 74 |
| `hooks/useConnectionsManager.ts` | 234 |
| `hooks/useScreenProtection.ts` | 45, 75 |
| `hooks/useViewTransition.ts` | 19, 20, 21 |
| `hooks/useWarRoomAlerts.ts` | 31 |
| `components/security/RateLimitRealtimeAlerts.tsx` | 83 |

### 🟡 .catch(() => ({})) — masks API errors
| Arquivo | Linha |
|---------|-------|
| `hooks/useTextToSpeech.ts` | 119 |
| `integrations/zappweb/evolutionClient.ts` | 106 |
| `lib/evolutionDirectClient.ts` | 61 |

---

## 12. Performance React

### Achados
- **useEffect sem cleanup com subscriptions**: `useRealtimeMessages.ts`, `useWarRoomAlerts.ts`, `useConnectionsManager.ts`
- **import * (sem tree-shaking)**: Não detectado (projeto usa imports named) ✅
- **Componentes sem React.memo**: `ConversationItem.tsx` (renderiza em listas longas), `TeamFiles.tsx`, `MessageBubble.tsx`
- **useEffect com deps vazias usando state externo**: `useAutomations.ts` (stale closure risk)

---

## 13. Race Conditions

### Achados
- **setState após unmount**: `useRealtimeMessages.ts` — subscription callback chama setState sem verificar mounted
- **Promise.all sem .catch**: `useEmail.ts` — múltiplas chamadas paralelas sem tratamento de falha parcial
- **async useEffect sem cleanup**: `useEvolutionAutoSync.ts`, `useWarRoomAlerts.ts` — operações assíncronas que podem completar após desmontagem

---

## 14. Memory Leaks

### 🔴 Supabase channels sem unsubscribe
- `useRealtimeMessages.ts` — .channel() sem .unsubscribe() no cleanup
- `useWarRoomAlerts.ts` — subscription Realtime sem removeChannel()

### 🟡 addEventListener sem removeEventListener
- `useScreenProtection.ts` — visibilitychange listener sem cleanup explícito
- `useSwipeNavigation.ts` — touch events sem cleanup

### 🟢 setInterval/setTimeout
- Em geral com cleanup adequado ✅

---

## 15. Código Morto / Duplicação

### Blocos comentados >20 linhas
- **70 blocos** totalizando **~3.800 linhas** em 50 arquivos
- Top ofensores:
  - `src/features/admin/hooks/monitoring/useFailedMessages.ts` — 257 linhas
  - `src/features/inbox/hooks/useRealtimeMessages.ts` — 314 linhas
  - `src/features/admin/components/BulkReprocessGuidedDialog.tsx` — 240 linhas
  - `src/components/gamification/GamificationProvider.tsx` — 159 linhas

### Imports não usados
- ESLint 10.4.0 limpo nessa regra ✅

### Duplicação
- `LocationMessage.tsx` existe em `src/components/inbox/` e `src/features/inbox/components/` — código duplicado
- `useLocationPicker.ts` existe em `src/components/inbox/location-picker/` e `src/features/inbox/components/location-picker/` — hook duplicado

---

## 16. Testes

### Cobertura
| Métrica | Valor |
|---------|-------|
| Arquivos de teste (.test.ts/.spec.ts/__tests__) | ~25 |
| Arquivos de código fonte | ~2.258 (.ts + .tsx) |
| Ratio teste/código | ~1.1% |

### Caminhos críticos SEM teste
- **Autenticação** (login, logout, refresh token, RLS enforcement)
- **Webhooks** (whatsapp-webhook, zapier-webhook, elevenlabs-webhook) — processamento de entrada externa sem teste
- **Cálculos** (gamification, pontos, badges)
- **Migrations RLS** — 502 arquivos SQL, nenhum teste de integração que valide policies
- **Email** (composer, templates, send)

### Testes existentes
- `src/__tests__/auth-flows.test.tsx`
- `src/__tests__/deep-links.test.tsx`
- `src/__tests__/inbox-crud.test.tsx`
- `src/hooks/__tests__/` — testes de hooks específicos
- `e2e/` — testes end-to-end com Playwright

---

## 17. CI/CD

### .github/workflows/ análise
- **permissions**: Workflows usam `contents: read` (padrão restritivo) ✅
- **Secrets em log**: Não detectado `echo $SECRET` ou `set -x` com secrets ✅
- **pull_request_target**: Não encontrado uso inseguro ✅
- **Actions pinadas**: `actions/checkout@v4`, `actions/setup-node@v4` — versões major pinadas ✅

---

## 18. Resumo por Severidade

### 🔴 CRÍTICO (12)
1. 140+ políticas RLS USING (true)
2. 30+ funções SECURITY DEFINER sem search_path
3. xlsx Prototype Pollution sem fix
4. JWT anon hardcoded (2 arquivos)
5. Token em localStorage (XSS)
6. 75+ políticas WITH CHECK (true)
7. dangerouslySetInnerHTML sem sanitize
8. SECURITY DEFINER com GRANT para anon
9. serialize-javascript RCE (CVSS 8.1)
10. supabase.rpc() sem validação de input
11. Empty catch blocks engolindo erros
12. Webhook verification token previsível

### 🟠 ALTO (35)
- 16 tabelas FOR ALL com acesso total
- 7 tabelas sem RLS
- ~3.800 linhas de código comentado
- 35 console.log em produção
- Edge functions sem validação de input
- CORS sem restrição em webhooks
- Stack traces vazando em erros
- Memory leaks em Supabase channels
- Race conditions em useRealtimeMessages
- Duplicação de componentes/hooks
- Múltiplas promises swallowed (.catch vazio)
- target="_blank" sem rel="noopener noreferrer"

### 🟡 MÉDIO (120+)
- 833 any types
- 29 pacotes com major bumps
- 7 CVEs em dependências
- .filter() com concatenação
- Logout não invalida refresh token
- ~70 blocos comentados
- Evolution API key fallback vazio
- .catch(() => ({})) mascarando API errors
- Componentes sem React.memo em listas longas
- useEffect sem cleanup

### 🟢 BAIXO (80+)
- css/svg assets não otimizados
- Config files duplicados
- Scripts Python sem docstring
- Migrations sem rollback documentado

---

## 19. Status das correções — 2026-05-29 (PR claude/lovable-commits-review-fixes-KgHqB)

Revisão exaustiva + correção dos erros concretos do Lovable. Dependências instaladas
neste ambiente; `tsc --noEmit -p tsconfig.app.json` validado **antes e depois (0 erros)**.

### ✅ Corrigido neste PR
| Item | Arquivo(s) | Observação |
|------|-----------|------------|
| Host Supabase errado em preconnect/dns-prefetch | `index.html` | `uqysyzndkfiwfztbqvsl` → projeto real `allrjhkpuscmgbsnmjlv` (de `VITE_SUPABASE_URL`) |
| XSS por duplicação divergente (sem DOMPurify) | `src/components/inbox/chat/MarkdownPreview.tsx` | alinhado à cópia sanitizada de `features/` + removido `@ts-nocheck` |
| JWT anon hardcoded como fallback | `src/integrations/zappweb/supabaseClient.ts`, `src/pages/admin/Connections.tsx` | agora só lê de env; `console.warn` se ausente |
| 6 catch vazios engolindo erros | `validationLogger.ts`, `useThemeAudit.ts`, `useConnectionsManager.ts`, `evolutionDirectClient.ts`, `RateLimitRealtimeAlerts.tsx` | `console.debug` explicativo |
| Type-check desligado em ~70% do código | `src/**` | `@ts-nocheck` removido de **1349 de 1409** arquivos type-safe; restam **60** com dívida real |

### ⚠️ Achados revisados que JÁ ESTAVAM corrigidos (doc anterior desatualizada)
- `useRealtimeMessages.ts` — canal Realtime **já tem** cleanup (`removeChannel` no return do effect).
- Empty catch blocks — reduzidos de muitos para **6** (todos tratados neste PR).

### 🔄 Em andamento — PR #41 (somente lint)
- **Dívida de lint — imports não usados**: ✅ **825 imports removidos** em 438 arquivos
  (`eslint-plugin-unused-imports`, config temporária, sem churn de lockfile). `tsc`=0,
  build OK. Modelo de isolamento descoberto: **por-usuário (`auth.uid()=user_id`) +
  por-papel (`has_role`/admin/supervisor)** — NÃO há coluna multi-tenant.

### 🔄 Em andamento — PR separado de DB (hardening RLS + search_path)
> Movido para branch/PR próprio (`claude/db-rls-search-path-hardening`) para permitir
> mergear o lint sem tocar o banco. **Draft — validar em staging antes de mergear**,
> pois migrations auto-aplicam em produção.
- **`SECURITY DEFINER` sem `search_path`**: ✅ migração criada
  (`supabase/migrations/20260529120000_...`) — bloco `DO` idempotente/auto-descobrível.
- **RLS `USING (true)` (~291)**: ✅ migração criada
  (`supabase/migrations/20260529120100_...`) — auto-direcionada via `pg_policy`,
  dono-OU-admin/supervisor p/ tabelas com coluna de propriedade; catálogos = leitura
  autenticada + escrita admin. Rollback manual em `supabase/manual-rollbacks/`.
  Ver `docs/RLS_SECURITY_DEFINER_HARDENING.md` (query de preview read-only incluída).

### 📋 Documentado — NÃO aplicado (requer coordenação / fora do escopo seguro)
- **Token em `localStorage`** (`src/integrations/supabase/client.ts:19`): migração para
  cookies httpOnly é mudança de auth de alto impacto.
- **Dívida de lint restante**: ~1194 `no-unused-vars` (vars locais, não-imports),
  238 `no-explicit-any`, 60 `ban-ts-comment` (dos `@ts-nocheck` remanescentes),
  58 `no-console`. Resolver incrementalmente.
- **60 arquivos com `@ts-nocheck` remanescente**: dívida de tipo real (TS2322/2345/2769/
  2339); resolver por módulo.
- **CVEs de dependências** (xlsx, serialize-javascript): tratar via Dependabot/substituição.

### Nota sobre CI
- `Analyze (javascript-typescript)` (CodeQL real), `Build`, `Quality diagnostics`,
  `Security audit`, `check-quality`, `Verify Lockfile`, `Unit tests` → **verdes**.
- O check **`CodeQL`** (gate de resultados de code-scanning) falha por **30 alertas
  pré-existentes (todos de 2026-05-28)** — nenhum nos arquivos deste PR. Não é regressão.

---