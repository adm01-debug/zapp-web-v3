## Contexto

O prompt enviado é um runbook SRE/QA de 1.280 linhas para validar o deploy v6 de uma edge function `evolution-bitrix-connector` em outro repositório (`adm01-debug/zapp-web`). Boa parte é fora de escopo aqui:

- A function `evolution-bitrix-connector` **não existe** neste projeto.
- Schema `zapp_history.edge_function_templates` e audit `activate_v6_enforcement` **não existem** no Lovable Cloud deste app.
- Hashes (`3dde4b6b…`), backups, rotação de `WEBHOOK_SHARED_SECRET`, comandos `supabase functions deploy`, OAuth Bitrix, Evolution API real → todos exigem credenciais externas e acesso ao outro projeto.

Conforme suas respostas: **adapto os 2 patches v6 às funções equivalentes existentes** (`evolution-webhook` + `bitrix-api`) e **deixo de fora tudo que pede credencial externa**.

## O que será feito

### 1. Bug 2 — Origin validation (defesa em profundidade)

**`supabase/functions/_shared/validation.ts`**: novo helper `validateBitrixOrigin(req, allowedPortal)` que aceita origin se:
- hostname casa `/\.bitrix24\.com\.br$/` **OU**
- origin === valor de `BITRIX_PORTAL` (env), quando configurado

Retorna `{ ok: true }` ou `{ ok: false, reason }`.

**`supabase/functions/bitrix-api/index.ts`**: aplicar o guard logo após `handleCors`. Origin ausente ou não permitida → `401 { error: "invalid origin" }`. O CORS já filtra o browser; isto fecha o vetor server-to-server.

**`supabase/functions/evolution-webhook/index.ts`**: webhooks da Evolution não têm origin de browser, então mantém HMAC como camada primária. Adiciono apenas um log explícito quando `Origin` chega de host não-evolution (suspeito) — sem bloquear, para não quebrar o webhook em produção.

### 2. Bug 1 — Sanitização de secrets em logs

**`supabase/functions/_shared/validation.ts`**: estender o `Logger` com `sanitizeLogValue()` que:
- Coleta os valores de `EVOLUTION_WEBHOOK_SECRET`, `WEBHOOK_SECRET`, `WEBHOOK_SHARED_SECRET`, `BITRIX_WEBHOOK_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `EVOLUTION_API_KEY`, `BITRIX_CLIENT_SECRET` (apenas os que existirem no env).
- Aplica `replaceAll(secret, '***REDACTED***')` em `message` e em qualquer string dentro de `ctx` (recursivo, profundidade ≤ 3) **antes** de serializar.
- Faz isto uma vez na construção do Logger (cache de regex/lista) — sem custo por chamada significativo.

Aplicar em `Logger.log()` no shared, beneficiando todas as funções (`bitrix-api`, `evolution-api`, etc).

No `evolution-webhook/index.ts` o log usa `console.warn/log/error` direto — adicionar import do helper `redactSecrets(str)` e envolver as 4 strings de log que poderiam carregar payload com secret (ex: linhas 57, 72).

### 3. Testes Deno adversariais (sem credenciais)

Novo arquivo **`supabase/functions/bitrix-api/__tests__/security.test.ts`** com Deno.test cases:

1. `redactSecrets()` remove valor presente em mensagem
2. `redactSecrets()` remove secret aninhado em `ctx`
3. `validateBitrixOrigin()` aceita `https://promo.bitrix24.com.br`
4. `validateBitrixOrigin()` aceita exact match com `BITRIX_PORTAL`
5. `validateBitrixOrigin()` rejeita `https://attacker.evil.com`
6. `validateBitrixOrigin()` rejeita ausência de header Origin
7. `validateBitrixOrigin()` rejeita `https://fake-bitrix24.com.br.evil.com` (hostname suffix attack)

Rodam via `supabase--test_edge_functions` — sem rede externa, sem secrets reais.

### 4. Documentação

**`supabase/functions/bitrix-api/SECURITY.md`** curto: documenta o guard de origin, a sanitização de logs, e referencia o checklist v6 do runbook como inspiração.

## O que **NÃO** será feito (e por quê)

| Item do prompt | Motivo |
|---|---|
| Fases 0.1, 0.2, 0.5, 0.7 (banco `zapp_history`, hashes, backups) | Schema/tabelas não existem aqui |
| Fase 0.6, 1.1–1.2 (rotação de secret, deploy CLI, webhook Evolution real) | Credenciais externas + outro projeto |
| Fases 0.8–0.9 (health Evolution/Bitrix reais) | Sem credenciais |
| Fases 2.1–2.4 com curl real contra `$EDGE_FUNCTION_URL` v6 | Function não existe + URL externa |
| Fases 3–7 (E2E WhatsApp→Bitrix, concorrência, teste de carga em prod) | Requer Evolution+Bitrix reais |
| Plano de rollback v5↔v6 | Não há v5/v6 aqui |

Tudo isso fica documentado em `SECURITY.md` como "manual / responsabilidade do operador no projeto zapp-web externo".

## Arquivos

**Editar:**
- `supabase/functions/_shared/validation.ts` (+ `redactSecrets`, `validateBitrixOrigin`, integração no `Logger`)
- `supabase/functions/bitrix-api/index.ts` (chamar `validateBitrixOrigin` pós-CORS)
- `supabase/functions/evolution-webhook/index.ts` (envolver logs sensíveis com `redactSecrets`)

**Criar:**
- `supabase/functions/bitrix-api/__tests__/security.test.ts`
- `supabase/functions/_shared/__tests__/log-sanitizer.test.ts`
- `supabase/functions/bitrix-api/SECURITY.md`

## Validação final

1. `supabase--test_edge_functions` nos dois novos arquivos de teste — todos verdes.
2. `supabase--deploy_edge_functions` para `bitrix-api` e `evolution-webhook`.
3. Smoke: `supabase--curl_edge_functions` em `bitrix-api` com `Origin: https://attacker.evil.com` → esperado 401.
4. Smoke: chamada normal do app via preview continua funcionando (sem origin externa, CORS dá conta).
