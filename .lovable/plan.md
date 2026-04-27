# Consertar `externalProxy` — `Failed to send a request to the Edge Function`

## Diagnóstico (já confirmado)

Testei a edge function `external-db-proxy` direto via `curl` com o mesmo body que o cliente envia:

```
HTTP 200 time=0.85s   ✅ função saudável
```

Ou seja, **o servidor está 100%**. O erro `FunctionsFetchError: Failed to send a request to the Edge Function` (status `undefined`) que dispara o circuit breaker (`evolution_messages → circuit open`) e derruba a tela com "Erro de conexão" é o padrão conhecido do **proxy `lovable.js` da preview** — ele intercepta `window.fetch` e ocasionalmente derruba o body de POSTs feitos via `supabase.functions.invoke()`. GETs e a app publicada não são afetados.

Sintomas que batem 1:1 com esse padrão:
- `errorName: "FunctionsFetchError"`, `status: undefined`
- 3 retries seguidas falham idênticas (não é cold start nem 5xx)
- circuit abre, UI mostra "Proxy circuit open for evolution_messages"

## Correção

Trocar `supabase.functions.invoke('external-db-proxy', …)` por um `fetch()` direto à URL da função em **um único arquivo** (`src/lib/externalProxy.ts`). Isso passa por baixo do proxy `lovable.js` e mantém:
- mesma assinatura `{ data, error }` que o `executeProxyCall` espera (zero mudança no retry/breaker/telemetria)
- `AbortSignal` para cancelamento
- header `x-correlation-id` + body `__cid`
- JWT do usuário logado (com fallback para anon) — RLS continua valendo

## Mudança em código

Arquivo único: **`src/lib/externalProxy.ts`**

1. Adicionar helper `invokeViaFetch(fnName, { body, signal, headers })` que faz `POST ${VITE_SUPABASE_URL}/functions/v1/${fnName}` com `apikey` + `Authorization` (sessão atual ou anon).
2. Substituir a única linha `await supabase.functions.invoke('external-db-proxy', perAttemptOptions)` por `await invokeViaFetch('external-db-proxy', perAttemptOptions)`.
3. Nada mais muda — retry, breaker, telemetria, coalesce, ghost-post detection, todos continuam funcionando porque o shape do retorno é idêntico.

## Validação

- Rodar a suíte `bunx vitest run src/lib/__tests__/` para garantir zero regressão.
- Atualizar a preview: o circuit breaker fecha sozinho em 5s e o inbox volta a carregar.

## Fora do escopo

- Não mexer no edge function (já está saudável).
- Não mexer em outras chamadas a `supabase.functions.invoke` (só `external-db-proxy` é hot-path do inbox e só essa estava abrindo o breaker).
