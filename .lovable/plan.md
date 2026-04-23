

## Refatorar testes da edge `evolution-api` com helper compartilhado

Os arquivos de teste em `supabase/functions/evolution-api/__tests__/` repetem o helper `blockAfter(marker, size)` e o padrão de stub/restore de `globalThis.fetch`. Isso gera duplicação e risco de flakiness (timeouts não limpos, fetch não restaurado entre testes, tamanho fixo do bloco que pode cortar trechos relevantes).

### Arquivo novo: `supabase/functions/evolution-api/__tests__/_helpers.ts`

Helper compartilhado com:

1. **`readSource()`** — lê `../index.ts` uma única vez (cache em módulo) via `Deno.readTextFile`. Evita reler em cada teste.

2. **`extractBlock(marker, opts?)`** — extração robusta de bloco por marcador:
   - `opts.until?: string | RegExp` — termina no próximo marcador (ex.: próximo `action ===` ou `} else if`), em vez de tamanho fixo.
   - `opts.maxSize?: number` — fallback (default 2000) caso `until` não bata.
   - Lança erro descritivo se o marcador não existir.
   - Resolve a flakiness de `blockAfter(marker, 600)` cortar antes de `return await proxy(...)`.

3. **`stubFetch(impl)`** — substitui `globalThis.fetch` e devolve `restore()`. Uso:
   ```ts
   const restore = stubFetch(() => Promise.reject(new TypeError("network down")));
   try { /* ... */ } finally { restore(); }
   ```
   Garante restauração mesmo em falha de assertiva.

4. **`withFetchStub(impl, fn)`** — açúcar `try/finally` que aceita uma função de teste async e cuida do restore automaticamente. Reduz boilerplate nos testes de integração do proxy.

5. **`leakSafeOpts`** — constante exportada `{ sanitizeOps: false, sanitizeResources: false } as const`, com comentário explicando o motivo (timeout do `AbortController` no proxy não é limpo em rejeição síncrona). Centraliza a decisão.

6. **`CORS_DEFAULT`, `URL_BASE`, `KEY`** — constantes compartilhadas dos testes do proxy.

### Arquivos a refatorar

- **`send-media-audio-instance.test.ts`** — substituir `blockAfter` local por `extractBlock` do helper, usando `until: /action === '/` para capturar o bloco inteiro até o próximo handler (resolve o `size = 1500` arbitrário).
- **`proxy-fetch-failure.test.ts`** — substituir `realFetch`/`restoreFetch` locais por `stubFetch`/`withFetchStub`; importar `leakSafeOpts`, `CORS_DEFAULT`, `URL_BASE`, `KEY`.

Comportamento dos testes permanece idêntico — só muda a mecânica interna.

### Detalhes técnicos

- Helper sem dependências externas além de `https://deno.land/std@0.224.0/assert/mod.ts` (e nem isso é necessário — usa `throw new Error`).
- `readSource` usa `new URL("../index.ts", import.meta.url)` (mesmo padrão atual).
- `extractBlock` com `until` faz `source.slice(start, start + maxSize).search(until)` para limitar; se não bater, retorna até `maxSize`.
- `stubFetch` armazena o `globalThis.fetch` original no momento da chamada (não em variável de módulo), evitando race se múltiplos testes paralelos stubarem.

### Verificação

Rodar `supabase--test_edge_functions` filtrando `evolution-api` e confirmar que todos os testes (`send-media-audio-instance`, `proxy-fetch-failure`, e quaisquer existentes) passam sem warnings de leak.

### Arquivos afetados

- `supabase/functions/evolution-api/__tests__/_helpers.ts` (criado)
- `supabase/functions/evolution-api/__tests__/send-media-audio-instance.test.ts` (refatorado)
- `supabase/functions/evolution-api/__tests__/proxy-fetch-failure.test.ts` (refatorado)

