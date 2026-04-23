

## CI no GitHub Actions + E2E com Playwright para fluxos críticos

### Diagnóstico

O projeto **já tem** `.github/workflows/ci.yml` com 5 jobs (lint, vitest, deno tests, build, security audit). Falta:
- Job de **E2E com Playwright** no pipeline.
- **Setup do Playwright** (config, fixtures, specs) — não existe `playwright.config.ts` nem `e2e/`.
- Cobertura E2E dos **fluxos críticos**: conexão WhatsApp e envio de mensagens.

### O que será construído

#### 1. Setup Playwright

**Arquivos novos:**
- `playwright.config.ts` — base URL do preview Lovable, browsers (chromium + webkit), retries (2 em CI), screenshot/trace on failure, reporter HTML + GitHub.
- `e2e/fixtures/auth.ts` — fixture `authenticatedPage` que faz login via UI (ou injeta sessão Supabase via `localStorage`) usando credenciais de **service account de teste** lidas de secrets.
- `e2e/fixtures/test-data.ts` — JIDs/instâncias seed para testes (não tocar dados reais; usar instância mock `wpp2-test` ou contato dummy `5511999999999@s.whatsapp.net`).
- `e2e/utils/supabase.ts` — helpers para limpeza pós-teste (delete contatos/mensagens criados via `service_role`).
- `package.json` — adicionar scripts `test:e2e`, `test:e2e:ui`, `test:e2e:debug` e devDeps `@playwright/test`.

#### 2. Specs E2E — fluxos críticos

**`e2e/auth.spec.ts`** (smoke)
- Login com email/senha → redireciona para `/`.
- Logout → volta para `/auth`.
- Acesso protegido sem sessão → redireciona para `/auth`.

**`e2e/whatsapp-connection.spec.ts`** (conexão)
- Navega para `/admin/connections` (ou rota equivalente).
- Cria nova conexão `wpp2-test`.
- Verifica que QR code/pairing code é exibido (mock de `evolution-api` `instance/connect`).
- Estado da conexão muda para `connected` após mock de webhook `CONNECTION_UPDATE`.
- Desconecta e remove a instância (cleanup).

**`e2e/send-message.spec.ts`** (envio crítico)
- Abre o Inbox (`/`).
- Clica em "Nova conversa" → escolhe contato existente seed.
- Digita mensagem e envia via Enter.
- Verifica bolha otimista (`status='sending'`) aparece em ≤500ms.
- Verifica que após mock de resposta da Evolution, status muda para `sent` (✓).
- Envio de imagem (upload mock) → bolha de mídia aparece.
- Envio com Eco offline (mock 503) → mensagem entra em DLQ via toast informativo.

**`e2e/inbox-realtime.spec.ts`** (paridade Whaticket)
- Recebe mensagem inbound (mock de webhook `MESSAGES_UPSERT` via insert direto no DB de teste).
- Lista de conversas atualiza em ≤2s.
- Contador de não-lidas incrementa.
- Abrir conversa zera contador.

#### 3. Mocking strategy

- **Evolution API**: usar `page.route('**/functions/v1/evolution-api', ...)` para interceptar e responder com fixtures determinísticas. Sem chamadas reais à Eco em CI.
- **Supabase Realtime**: usar fixture que injeta payloads via canal mock OU acionar via `service_role` no DB FATOR X de teste.
- **Auth**: criar usuário de teste seed `e2e-bot@zappweb.test` com role `admin` em migração de seed dev-only (não roda em prod).

#### 4. CI — novo job no `.github/workflows/ci.yml`

Adicionar **JOB 5: E2E Tests** após `build`:

```yaml
e2e:
  name: 🎭 E2E Tests (Playwright)
  runs-on: ubuntu-latest
  needs: build
  timeout-minutes: 20
  strategy:
    fail-fast: false
    matrix:
      shard: [1/2, 2/2]   # paralelizar em 2 shards
  steps:
    - checkout / setup node 20
    - npm install
    - npx playwright install --with-deps chromium webkit
    - download dist artifact (do job build)
    - npm run preview &  (servir dist na porta 4173)
    - wait-on http://localhost:4173
    - npx playwright test --shard=${{ matrix.shard }}
      env:
        E2E_BASE_URL: http://localhost:4173
        E2E_USER_EMAIL: ${{ secrets.E2E_USER_EMAIL }}
        E2E_USER_PASSWORD: ${{ secrets.E2E_USER_PASSWORD }}
        VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
        VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
    - upload playwright-report/ + test-results/ artifacts (sempre)
```

#### 5. Documentação

- `docs/testing/e2e.md` — como rodar local, criar specs, debugar, lidar com flakiness.
- Update `CONTRIBUTING.md` — adicionar seção "Testes E2E" e como rodar antes de PR.
- Update `.github/PULL_REQUEST_TEMPLATE.md` — checkbox "Testes E2E passam".

### Critérios de aceite

- `npm run test:e2e` roda local contra `npm run dev` e passa nos 4 specs.
- CI executa o job `e2e` em PRs e em push para `main`/`develop`.
- Falha de E2E bloqueia o merge.
- Relatório HTML do Playwright fica disponível como artifact por 7 dias.
- Nenhum teste E2E faz chamada real à Evolution API ou ao FATOR X de produção (tudo mockado ou em instância de teste).
- Cleanup remove dados de teste após cada run (`afterEach`/`afterAll`).
- Tempo total do job ≤ 10 min (com sharding 2x).

### Secrets necessários (a configurar pelo usuário)

- `E2E_USER_EMAIL` — email do bot de teste
- `E2E_USER_PASSWORD` — senha do bot de teste

(Os demais — `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` — já existem no workflow.)

### Arquivos

**Novos**
- `playwright.config.ts`
- `e2e/auth.spec.ts`
- `e2e/whatsapp-connection.spec.ts`
- `e2e/send-message.spec.ts`
- `e2e/inbox-realtime.spec.ts`
- `e2e/fixtures/auth.ts`
- `e2e/fixtures/test-data.ts`
- `e2e/utils/supabase.ts`
- `docs/testing/e2e.md`

**Editados**
- `.github/workflows/ci.yml` — novo job `e2e` com matrix sharding
- `package.json` — scripts + devDep `@playwright/test`
- `CONTRIBUTING.md` — seção "Testes E2E"
- `.github/PULL_REQUEST_TEMPLATE.md` — checkbox E2E
- `.gitignore` — `playwright-report/`, `test-results/`, `.auth/`

### Riscos & mitigação

- **Flakiness em realtime** → usar `expect.poll()` com timeout 10s e retries CI=2.
- **Custo de tempo CI** → sharding em 2 + only-chromium em PR (webkit só em push para main).
- **Dados poluindo prod** → toda escrita E2E vai para JID/instância marcada `*-test` + cleanup obrigatório no `afterAll`.
- **Auth Supabase em iframe Lovable** → testar contra build local (`npm run preview`) na porta 4173, não contra preview Lovable, evitando rate limit e CSP de iframe.

