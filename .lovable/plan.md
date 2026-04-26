# Auditoria Técnica Exaustiva — ZAPP Web (Promo Brindes)

## O que será entregue

Um relatório completo gerado em **`/mnt/documents/AUDITORIA_22_DIMENSOES.md`** seguindo exatamente o protocolo do prompt:

1. **Inventário do sistema** (Fase 0) — números reais já coletados.
2. **Análise das 22 dimensões** — cada uma com nota 0–10 fundamentada em evidências (arquivo:linha, comandos rodados, queries SQL).
3. **Scorecard consolidado** com média ponderada (×3 críticas, ×2 altas, ×1 padrão).
4. **Top 10 ações de maior ROI** (impacto ÷ esforço).
5. **Roadmap em 3 ondas**: Quick Wins / Sprint 1 / Sprint 2 / Backlog.
6. **Nota final** + parágrafo de maturidade.

Após o relatório, executo **Quick Wins + Sprint 1** (impacto alto ÷ esforço baixo–médio) em PRs separados por dimensão.

## Inventário já confirmado

| Item | Valor |
|---|---:|
| Arquivos TS/TSX (src) | 1.397 |
| Edge functions | 83 |
| Migrations versionadas | 307 |
| Tabelas em `public` | 186 |
| Tabelas com RLS habilitado | 186/186 (100%) |
| Tabelas com pelo menos 1 policy | 186/186 (100%) |
| Testes unitários (Vitest) | 240 arquivos |
| Testes E2E (Playwright) | 25 specs |
| Testes Deno (edge functions) | 97+ (já passando 100%) |
| ADRs | 5 (em `docs/decisions/`) |
| Runbooks operacionais | `docs/runbooks/`, `docs/INCIDENT-RUNBOOK.md`, `docs/SLA-ESCALATION-CRON.md` |
| CI pipeline | `.github/workflows/ci.yml` (lint, typecheck, vitest, deno tests, build) |
| Stack | React 18 + Vite + TS + Tailwind + Supabase (Lovable Cloud + FATOR X externo) + Bitrix24 + Evolution API |
| Linter Supabase | 193 warnings (todos do tipo `pg_graphql_anon_table_exposed`) |
| Security scan | Limpo (3 findings ignorados com justificativa) |

## Pontos de atenção já mapeados (preview do scorecard)

Sem inflar notas — exemplos concretos do que será reportado:

- **Tipagem (Dim. 18)**: `tsconfig.app.json` usa `strict: false` e `noImplicitAny: false`. Existem **245 ocorrências de `any`** em **93 arquivos** de produção. ESLint não bloqueia `any` em src (só em testes). Nota provisória ≤ 6/10.
- **Segurança DB (Dim. 16)**: 193 warnings `pg_graphql_anon_table_exposed` no linter — `anon` enxerga schema de tabelas via introspection do GraphQL. Precisa revogar `SELECT` do `anon` nas tabelas que não devem ser públicas. Nota provisória ≤ 7/10.
- **Logging (Dim. 9)**: `redactSecrets` + Logger estruturado já implementados em `_shared/validation.ts` com PII patterns (JWT, Bearer, e-mail, telefone, Bitrix REST tokens). 1 `console.log` em produção (em comentário JSDoc — falso positivo). Nota provisória ≥ 8.5/10.
- **Manutenibilidade (Dim. 12)**: 14 arquivos com **>500 linhas** em `src/` (maior: `AdminFailedMessagesPage.tsx` com 1.012 linhas). 8 TODOs/FIXME/HACK no código. Decomposição padrão já documentada em `mem://architecture/refactoring/hook-decomposition-pattern`. Nota provisória ~7/10.
- **CI/CD (Dim. 5)**: Pipeline cobre lint + typecheck + vitest + deno tests + build. **Falta**: security scan (npm audit / dependabot), branch protection rules visíveis, deploy automatizado para staging. Nota provisória ~7/10.
- **Arquitetura (Dim. 1)**: 5 ADRs documentados, separação clara `pages/components/hooks/lib/integrations`, dois clients Supabase (Cloud + FATOR X) com regras explícitas em project-knowledge. Nota provisória ≥ 8/10.

(Notas finais saem após auditar as 22 dimensões com profundidade igual.)

## Quick Wins que serão executados após o relatório

Itens de impacto alto e esforço baixo, sem risco de regressão:

1. **Habilitar `noImplicitAny`** no `tsconfig.app.json` para novos arquivos (gradual via `// @ts-expect-error` onde explodir).
2. **Revogar `GRANT SELECT` do `anon`** em tabelas internas (migration) para resolver 193 warnings do linter `pg_graphql`.
3. **Adicionar `npm audit` job** no `.github/workflows/ci.yml` para falhar PR em CVE high/critical.
4. **Headers de segurança** (`Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) no `index.html` / Vite config.
5. **Habilitar HIBP password check** via `configure_auth` (leaked password protection).
6. **Limpar 8 TODO/FIXME** convertendo em issues GitHub ou removendo.

## Sprint 1 (após aprovação dos Quick Wins)

Itens de impacto alto e esforço médio:

7. **Schema Zod compartilhado** entre frontend ↔ edge functions para os 5 endpoints mais usados (atualmente só 7 arquivos usam Zod no frontend).
8. **Decompor 3 arquivos > 800 linhas** seguindo o padrão de `mem://architecture/refactoring/hook-decomposition-pattern` (`AdminFailedMessagesPage.tsx`, `useConnectionsManager.ts`, `MediaLibraryAdmin.test.tsx`).
9. **Error tracking centralizado** — verificar se Sentry/equivalente está configurado; senão, adicionar boundary global que envie para tabela `error_log` do FATOR X.
10. **Testes de RLS** — script Deno que assume role `authenticated` com diferentes `auth.uid()` e valida que cada tabela bloqueia o que deve bloquear.

## Detalhes técnicos da execução

- **Não vou tocar em `src/integrations/supabase/types.ts`** (auto-gerado).
- **Não vou alterar schemas reservados** do Supabase (`auth`, `storage`, `realtime`, `vault`).
- Mudanças de DB usarão a ferramenta de migration (com aprovação automática do usuário).
- Mudanças em `.github/workflows/ci.yml` rodam só após push — não posso testar localmente, então marcarei como "pendente de validação no próximo PR".
- Cada Quick Win vira um commit isolado no relatório, com critério de aceite testável.

## Arquivos que serão criados/editados

**Criados:**
- `/mnt/documents/AUDITORIA_22_DIMENSOES.md` (relatório principal, 15–25 KB)
- `/mnt/documents/SCORECARD.csv` (tabela exportável)
- Migration nova para revogar `GRANT SELECT` do `anon`

**Editados (Quick Wins):**
- `tsconfig.app.json` (noImplicitAny)
- `.github/workflows/ci.yml` (npm audit job)
- `index.html` (security headers via meta tags / vite plugin)
- `eslint.config.js` (regra `no-explicit-any` como warn em src)
- 8 arquivos com TODO/FIXME

## Fora de escopo

- Pen test real (precisa de credenciais e contrato).
- Mudanças em infra Bitrix24 / Evolution API (sem credenciais — confirmado no escopo anterior).
- Sprint 2 e Backlog — entregues como roadmap, executados em loops futuros após sua aprovação.