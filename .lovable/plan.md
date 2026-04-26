## Objetivo

Criar uma suíte de **smoke tests automatizados pré-deploy** que valide envio (outbound) e webhook (inbound) em ambos os provedores — **Evolution API** e **WhatsApp Cloud API (Meta)** — garantindo paridade do modelo unificado de mensagens antes de cada release.

## Escopo

Testes determinísticos, sem chamadas reais a Evolution/Meta (mocks via `globalThis.fetch`), executáveis em < 30s e plugados no CI como **gate obrigatório** antes do job `build`.

## Arquivos a criar

### 1) Testes Deno — Edge Functions

**`supabase/functions/whatsapp-cloud-api/__tests__/smoke.test.ts`**
- `send-text`: monta payload Graph correto (`messaging_product`, `to`, `type:text`), chama Graph mockada, persiste em `rpc_insert_message` com `from_me=true`, retorna `{ wamid }`.
- `send-media` (image/audio/document): valida tipo, link/id, caption.
- Erro Graph 4xx → propaga status, não persiste mensagem.
- Credenciais ausentes (`api_type !== 'official'`) → 404 limpo.

**`supabase/functions/whatsapp-cloud-webhook/__tests__/smoke.test.ts`**
- GET verify (`hub.mode=subscribe` + token) → echo do `hub.challenge`.
- POST sem assinatura HMAC válida → 401.
- POST com payload texto válido → normaliza para `NormalizedIncoming` e chama `rpc_insert_message` + `rpc_upsert_contact`.
- POST com `statuses` (delivered/read/failed) → atualiza status via RPC.
- Mídia (image/audio): faz fetch mockado da URL Graph e upload no bucket `whatsapp-media`.

**`supabase/functions/evolution-api/__tests__/smoke.test.ts`** (novo, complementa os existentes)
- Smoke `send-text` end-to-end com Evolution mockada → 200 + persistência.
- Smoke `send-media-audio` → ptt:true preservado.
- URL normalization (sem trailing slash) — regressão do bug DLQ corrigido.

**`supabase/functions/evolution-webhook/__tests__/smoke.test.ts`** (novo)
- POST `messages.upsert` mockado → contato + mensagem inseridos via RPC.
- POST `messages.update` (status) → atualização de status.
- HMAC inválido → 401.

### 2) Teste de paridade (cross-provider)

**`supabase/functions/_shared/__tests__/parity.test.ts`**
- Dado o mesmo "evento lógico" (texto recebido de `+5511999999999`), verifica que **tanto o normalizer Evolution quanto o Cloud** produzem a mesma forma final de argumentos para `rpc_insert_message` (mesmos campos: `p_remote_jid`, `p_content`, `p_message_type`, `p_from_me`, `p_message_id`).
- Garante que adicionar provedor novo não quebre o modelo unificado.

### 3) Teste Vitest do router

**`src/lib/__tests__/sendFunctionRouter.smoke.test.ts`**
- `api_type='official'` → `whatsapp-cloud-api`.
- `api_type='evolution'` ou nulo → `evolution-api`.
- Cache de 60s respeitado (segunda chamada não consulta DB).
- Erro de DB → fallback `evolution-api`.

### 4) Script orquestrador pré-deploy

**`scripts/smoke-pre-deploy.sh`**
```bash
#!/usr/bin/env bash
set -euo pipefail
echo "▶ Vitest smoke (router + envio)"
npm run test -- --run sendFunctionRouter.smoke
echo "▶ Deno smoke (Evolution + Cloud + paridade)"
deno test --allow-net --allow-env --allow-read \
  supabase/functions/evolution-api/__tests__/smoke.test.ts \
  supabase/functions/evolution-webhook/__tests__/smoke.test.ts \
  supabase/functions/whatsapp-cloud-api/__tests__/ \
  supabase/functions/whatsapp-cloud-webhook/__tests__/ \
  supabase/functions/_shared/__tests__/parity.test.ts
echo "✅ Pré-deploy verde"
```

Adicionar em `package.json`:
```json
"smoke:pre-deploy": "bash scripts/smoke-pre-deploy.sh"
```

### 5) Helper de mock compartilhado

**`supabase/functions/_shared/test-fetch-mock.ts`**
- `installFetchMock(handlers: Record<string, Response>)` para interceptar Graph API e Evolution API por padrão de URL.
- `restoreFetch()` para teardown.
- Reutilizável em todos os smoke tests.

## Arquivos a editar

**`.github/workflows/ci.yml`**
- Adicionar novo job `smoke-pre-deploy` (depende de `test` e `deno-edge-tests`, é dependência de `build`):

```yaml
smoke-pre-deploy:
  name: 🚦 Smoke Pre-Deploy (Evolution + Cloud)
  runs-on: ubuntu-latest
  needs: [test, deno-edge-tests]
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: '20' }
    - uses: denoland/setup-deno@v1
      with: { deno-version: v1.x }
    - run: npm install --no-audit --no-fund
    - run: npm run smoke:pre-deploy
```
- Alterar `build.needs` para incluir `smoke-pre-deploy`.

## Resumo técnico (como os mocks funcionam)

```text
┌───────────────────────────────────────────────┐
│ smoke.test.ts                                 │
│   1. installFetchMock({                       │
│        'graph.facebook.com': fakeGraphOk,     │
│        'evolution.api':     fakeEvoOk,        │
│      })                                       │
│   2. createClient = stubSupabase()            │
│      → captura chamadas a rpc_insert_message  │
│   3. await handler(req)                       │
│   4. assertEquals(captured.rpc_args, expected)│
└───────────────────────────────────────────────┘
```

Sem nenhuma rede real; tudo em ≤ 5s por suíte. Falha em qualquer asserção bloqueia o `build` no CI.

## Critério de aceite

- `npm run smoke:pre-deploy` verde local e em CI.
- Job `smoke-pre-deploy` aparece como required check.
- Quebra intencional (ex.: alterar `messaging_product` para valor errado) faz o teste falhar.
- Cobertura cruzada: cada provedor tem ≥ 1 teste de envio + ≥ 1 de webhook + paridade do modelo.