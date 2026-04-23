# 🎭 Testes E2E com Playwright

## Visão geral

Cobrimos os fluxos críticos do ZAPP Web com Playwright:

| Spec | Fluxo |
|------|-------|
| `e2e/auth.spec.ts` | Login, logout, proteção de rota |
| `e2e/whatsapp-connection.spec.ts` | Criar instância, exibir QR code |
| `e2e/send-message.spec.ts` | Envio otimista, fallback Eco offline |
| `e2e/inbox-realtime.spec.ts` | Lista, abrir conversa, contador zero |

## Rodando local

```bash
# Build de produção (Playwright sobe `vite preview` na 4173 automaticamente)
npm run build

# Todos os specs em chromium headless
npm run test:e2e

# Modo UI interativo
npm run test:e2e:ui

# Debug step-by-step
npm run test:e2e:debug

# Ver relatório HTML após run
npm run test:e2e:report
```

### Variáveis de ambiente

Crie `.env.test.local` (já no `.gitignore`):

```
E2E_USER_EMAIL=e2e-bot@zappweb.test
E2E_USER_PASSWORD=sua-senha-aqui
E2E_BASE_URL=http://localhost:4173
```

> O usuário `e2e-bot@zappweb.test` deve existir como **admin** no Lovable Cloud para
> que os specs de `/admin/connections` rodem. Caso contrário esses testes são `skip`.

## Estratégia de mock

- **Evolution API:** interceptada com `page.route('**/functions/v1/evolution-api**', ...)` retornando fixtures de `e2e/fixtures/test-data.ts`. Nenhuma chamada real à Eco.
- **Supabase Realtime:** os specs validam estado da UI; eventos podem ser simulados via insert direto no DB de teste se necessário.
- **Auth:** login real via UI contra Lovable Cloud com conta de teste dedicada.

## CI

Job `e2e` em `.github/workflows/ci.yml`:

- Roda após `build` (consome o `dist/` artifact).
- 2 shards paralelos (`--shard=1/2` e `2/2`) → tempo total ≤ 10 min.
- Apenas chromium em PRs; chromium + webkit em push para `main`.
- Artifacts `playwright-report-shard-N` retidos por 7 dias.

### Secrets necessários no GitHub

| Secret | Origem |
|--------|--------|
| `E2E_USER_EMAIL` | Conta de bot criada no Lovable Cloud |
| `E2E_USER_PASSWORD` | Senha do bot |
| `VITE_SUPABASE_URL` | Já existe |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Já existe |

## Lidando com flakiness

- Use `expect.poll()` com timeout 10s para estados realtime.
- Retries em CI: 2 (configurado em `playwright.config.ts`).
- Capture trace em primeira retentativa: `trace: 'on-first-retry'`.
- Para logs detalhados local: `DEBUG=pw:api npm run test:e2e`.

## Cleanup

`e2e/utils/supabase.ts` chama RPC opcional `rpc_e2e_cleanup` (best-effort).
Todos os JIDs/instâncias de teste são prefixados com `*-test` para facilitar limpeza manual se necessário.

## Adicionando novo spec

1. Crie `e2e/<nome>.spec.ts`.
2. Importe `test, expect` de `./fixtures/auth` se precisar de sessão autenticada.
3. Use mocks de `page.route` para Evolution/serviços externos.
4. Adicione `test.afterAll(() => cleanupTestData())` se criar dados.
5. Rode local antes de abrir PR.
