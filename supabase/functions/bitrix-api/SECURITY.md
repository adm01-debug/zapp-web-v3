# Bitrix-API · Security Hardening (v6 inspired)

Adapta os dois patches críticos do runbook **PROMPT_LOVABLE_ZAPPWEB_EVO_BITRIX v6**
ao código que efetivamente existe neste projeto (`bitrix-api` + `evolution-webhook`).
A function `evolution-bitrix-connector` referenciada no runbook vive em outro repositório
(`adm01-debug/zapp-web`); não é deployada aqui.

## Bug 1 · Sanitização de secrets em logs

`Logger.log` (em `_shared/validation.ts`) agora aplica `redactSecrets()` em
`message`, em qualquer string aninhada do `ctx` (depth ≤ 3) e na string serializada
final, antes de chamar `console.*`. Os valores varridos vêm dos env vars:

- `EVOLUTION_WEBHOOK_SECRET`
- `WEBHOOK_SECRET`
- `WEBHOOK_SHARED_SECRET`
- `BITRIX_WEBHOOK_URL` (contém token!)
- `BITRIX_CLIENT_SECRET`
- `BITRIX_PORTAL`
- `EVOLUTION_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Valores com menos de 12 caracteres são ignorados para evitar falsos positivos
(ex.: `WEBHOOK_SECRET=true`).

`evolution-webhook/index.ts` usa `console.warn/error` diretos em três pontos
sensíveis; cada um foi envolvido em `redactSecrets(...)`.

## Bug 2 · Origin validation no `bitrix-api`

`validateBitrixOrigin(req, allowedPortal?)` aceita o request quando:

- hostname casa exatamente com `bitrix24.com.br` ou termina em `.bitrix24.com.br`, **ou**
- `Origin` é exatamente igual ao env `BITRIX_PORTAL` (quando configurado).

`bitrix-api/index.ts` aplica o guard logo após o CORS preflight e devolve
`401 { error: "invalid origin" }` em caso de rejeição. Origens conhecidas do
próprio app (`*.lovable.app`, `*.lovableproject.com`, `localhost`) ficam isentas
para não quebrar chamadas legítimas do frontend. Se alguma rotina interna
precisar invocar a function sem `Origin`, basta setar `BITRIX_ALLOW_NO_ORIGIN=1`.

## Testes adversariais (sandbox-only)

Cobrem os cenários descritos nas Fases 2.1–2.4 do runbook, sem sair da
sandbox e sem credenciais reais:

- `_shared/__tests__/log-sanitizer.test.ts` — 6 cases (redact em msg, em ctx
  aninhado, sem secret, threshold de 12 chars, integração via `Logger`).
- `bitrix-api/__tests__/security.test.ts` — 8 cases (subdomain, apex,
  `BITRIX_PORTAL` exato, ataque de sufixo `*.bitrix24.com.br.evil.com`,
  look-alike `bitrix24-com-br.evil.com`, missing origin, malformed,
  substring attack contra `BITRIX_PORTAL`).

Rodar: `supabase functions test bitrix-api` (ou via tooling do Lovable).

## Fora de escopo (operacional, projeto externo)

Estes itens do runbook v6 dependem de credenciais externas e do projeto
`adm01-debug/zapp-web`, e devem ser executados manualmente lá:

- Verificação de hash do template (`zapp_history.edge_function_templates`).
- Audit `activate_v6_enforcement`.
- Rotação atômica de `WEBHOOK_SHARED_SECRET` + reapontamento da Evolution.
- Smoke tests via curl contra `$EDGE_FUNCTION_URL` real.
- Health checks Evolution / Bitrix OAuth.
- Plano de rollback v5↔v6 e backups pré-deploy.
- E2E WhatsApp → Evolution → Bitrix sob concorrência.
