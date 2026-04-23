

## Validação e fallback robusto do `idempotencyKey`

### Problema

Em `src/hooks/evolution/useEvolutionApiCore.ts` (linhas 74–104):

1. **Sem validação**: qualquer string aceita como `idempotencyKey`. Caracteres não-ASCII (emoji, acento) quebram o header `Idempotency-Key` (HTTP exige token ASCII). Strings vazias/whitespace habilitam dedupe falso (todas as chamadas colidem em `""`).
2. **Sem truncamento**: chave muito longa estoura limite de header (alguns gateways cortam em ~256B → colisão silenciosa entre chaves longas com mesmo prefixo).
3. **Fallback fraco**: quando `idempotencyKey` ausente, `JSON.stringify(body ?? {})` é usado como dedupe local. Mas: ordem de chaves não é estável → `{a:1,b:2}` ≠ `{b:2,a:1}` mesmo sendo o mesmo payload semântico → dedupe falha em chamadas equivalentes que vieram de origens diferentes.
4. **Sem hash estável**: payloads grandes (mídia base64) viram dedupeKey gigante na memória; e o servidor não recebe dica nenhuma de idempotência nesses casos.

### Solução

**1. Novo helper `src/lib/idempotency.ts`**

API:
- `stableStringify(value: unknown): string` — JSON com chaves ordenadas recursivamente (suporta objects aninhados, arrays preservam ordem). Pula `undefined`/funções.
- `sha256Hex(input: string): Promise<string>` — usa `crypto.subtle.digest('SHA-256', …)` e devolve hex (64 chars). Fallback síncrono para djb2 32-bit hex se `crypto.subtle` indisponível (SSR/jsdom em testes).
- `normalizeIdempotencyKey(raw: string | undefined): string | undefined`
  - `trim()`, retorna `undefined` se vazio.
  - Substitui qualquer char fora de `[A-Za-z0-9._\-:+/=]` por `_` (ASCII-safe para header).
  - Trunca em 128 chars; se truncado, anexa `:h<sha256(raw).slice(0,12)>` (preserva unicidade após truncamento).
  - Retorna `undefined` se após sanitize ficar vazio.
- `deriveIdempotencyKey(action: string, body: unknown): Promise<string>`
  - Computa `sha256Hex(stableStringify({action, body}))`.
  - Retorna `auto_${hash.slice(0, 24)}` — prefixo `auto_` distingue chave derivada de chave fornecida pelo caller.

**2. Patch em `src/hooks/evolution/useEvolutionApiCore.ts`**

- Importar helpers acima.
- `callApi`:
  - Após resolver `opts`, calcular:
    ```ts
    const userKey = normalizeIdempotencyKey(opts.idempotencyKey);
    // Para POST sem chave do usuário: deriva uma estável do payload (somente para dedupeKey local; NÃO vai pro header automaticamente — manteria comportamento atual de não enviar Idempotency-Key sem opt-in).
    const derivedKey = !userKey && method === 'POST'
      ? await deriveIdempotencyKey(action, body)
      : undefined;
    const effectiveKey = userKey ?? derivedKey;
    ```
  - `canRetry`: agora `IDEMPOTENT_METHODS.has(method) || !!userKey` (somente userKey habilita retry de POST — preserva semântica atual; `derivedKey` é só pra dedupe in-flight, não pra retry, evitando re-entregas inadvertidas).
  - `dedupeKey`: `${method}:${action}:${effectiveKey ?? ''}` quando `effectiveKey` existe; vazio caso contrário.
  - `invokeOpts.headers['Idempotency-Key'] = userKey` somente se `userKey` (não derivado).
- Tratamento async: `callApi` já é async, `await deriveIdempotencyKey` antes do `inflightRef.get/set` é seguro (mas precisa garantir que a checagem `inflightRef.get(dedupeKey)` aconteça **depois** do await — código já segue essa ordem no patch).
- Logar via `log.debug` quando truncar/sanitizar uma `userKey` (mostra prefixo + tamanho original) — útil pra detectar callers passando lixo.

**3. Testes — `src/lib/__tests__/idempotency.test.ts`**

- `stableStringify`: ordem de chaves consistente; nested; arrays preservados; `undefined` removido.
- `sha256Hex`: tamanho 64 hex; determinístico; mudou input → mudou output.
- `normalizeIdempotencyKey`:
  - undefined → undefined; "" → undefined; "   " → undefined.
  - "abc" → "abc".
  - emoji/acento → `_`.
  - 200 chars → 128 chars terminados em `:h<12hex>`.
  - duas chaves longas com mesmo prefixo de 128 mas sufixos diferentes → resultado diferente (graças ao hash sufixo).
- `deriveIdempotencyKey`: `{a:1,b:2}` e `{b:2,a:1}` produzem mesma chave; payload diferente → chave diferente; prefixo `auto_`; tamanho ≤ 30.

### Compatibilidade

- Callers atuais não passam `idempotencyKey` → comportamento muda apenas no `dedupeKey` interno (passa a usar hash estável em vez de `JSON.stringify` cru). Sem mudança na API pública nem em retry semantics.
- Callers que passam `idempotencyKey` ganham sanitização automática (header HTTP fica garantidamente válido).
- Nenhum impacto em edge functions (lado servidor).

### Arquivos editados

- `src/lib/idempotency.ts` (novo)
- `src/hooks/evolution/useEvolutionApiCore.ts`
- `src/lib/__tests__/idempotency.test.ts` (novo)

### Fora de escopo

- Não muda contrato server-side (edge function não passa a exigir/validar header).
- Não introduz dedupe persistente cross-tab (segue per-isolate via `inflightRef`).
- Não toca em `evolutionSendRetry.ts` (caminho separado, sem header de idempotência).

