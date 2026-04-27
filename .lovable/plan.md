# Conserto definitivo do `Failed to fetch` no inbox

## Diagnóstico (já confirmado por curl)

O fetch direto que substituiu o `supabase.functions.invoke` está **funcionando do lado do servidor** — testei agora:

- `POST external-db-proxy` → **HTTP 200 em 0.76s** ✅
- `OPTIONS external-db-proxy` (preflight) → **HTTP 200**, mas com este header crítico:

```
access-control-allow-headers: authorization, x-client-info, apikey, content-type, x-correlation-id
```

O cliente (`src/lib/externalProxy.ts` linha 362) envia em todo POST:

```ts
headers: { ...(invokeOptions.headers ?? {}), 'x-attempt': String(attempt) }
```

`x-attempt` **não está na allowlist do CORS**. Resultado: o navegador aborta o preflight e o `fetch()` rejeita com `TypeError: Failed to fetch` (status `undefined`). É exatamente o erro que está vazando para o `ErrorBoundary` agora (todos os `cid=...` no console).

`supabase.functions.invoke` não dava esse erro porque o SDK não enviava `x-attempt` antes — esse header foi adicionado quando a lógica de retry foi escrita assumindo `invoke` (que ignora silenciosamente headers extras em alguns paths).

## Correção (1 arquivo, 1 linha)

**`src/lib/externalProxy.ts` (linha ~362):** remover `x-attempt` do header. A informação de tentativa já existe:

- no `__cid` correlacionado por chamada (cada attempt poderia ter um sufixo se quisermos),
- nos logs estruturados do cliente (`attempt: N` em `proxy attempt failed`),
- e o servidor não usa `x-attempt` para nada (verificado, não há leitura desse header em `external-db-proxy`).

Se quisermos manter rastreabilidade do número da tentativa no servidor, embutimos no body como `__attempt: attempt` (já vai junto com `__cid`, sem CORS).

```diff
- const perAttemptOptions = {
-   ...invokeOptions,
-   headers: { ...(invokeOptions.headers ?? {}), 'x-attempt': String(attempt) },
- };
+ const perAttemptOptions = {
+   ...invokeOptions,
+   body: { ...(invokeOptions.body as Record<string, unknown>), __attempt: attempt },
+ };
```

## Validação

1. Recarregar a preview — o inbox volta a carregar (`evolution_messages`, `evolution_webhook_events`, etc.).
2. Rodar `bunx vitest run src/lib/__tests__/externalProxy.*.test.ts` — os testes não inspecionam `x-attempt`, então passam sem mudança.
3. Console deve voltar a mostrar `severity: ok` nos eventos do `clientTelemetry`, sem `Failed to fetch`.

## Fora de escopo

- Não mexer no edge `external-db-proxy` (CORS allowlist atual cobre tudo que precisamos sem `x-attempt`).
- Não mexer em outros chamadores do edge.
- Não mexer no breaker / coalesce / telemetria — continuam idênticos.
