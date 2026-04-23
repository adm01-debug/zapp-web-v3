

## Testes Deno: `send-sticker` exige `instanceName` e proxy recebe a instância correta

### Contexto

`evolution-api/index.ts` já implementa `action === 'send-sticker'` chamando `proxy(\`/message/sendSticker/${instance}\`, 'POST', { number, sticker })`, onde `instance = body.instanceName || body.instance`. A suíte atual cobre `send-media`/`send-audio` (`send-media-audio-instance.test.ts`) mas **não** cobre sticker. Vamos adicionar cobertura no mesmo padrão + um teste de integração runtime que stuba `fetch` e confirma a URL final.

### Mudança 1 — `supabase/functions/evolution-api/__tests__/send-sticker-instance.test.ts` (novo)

Testes **estáticos** (análise de source via helpers compartilhados):

1. **Path inclui `${instance}`**: extrai bloco `action === 'send-sticker'` (até próximo `action === '`) e valida `assertMatch(block, /\/message\/sendSticker\/\$\{instance\}/)`.
2. **Usa `proxy()`, não `fetch()` direto**: `assert(!block.includes("fetch("))`.
3. **Resolve URL privada antes do envio**: `assertMatch(block, /resolvePrivateBucketUrl\(/)` — garante que sticker em bucket privado é assinado.
4. **Bloco contém `return await proxy(`** — confirma que o handler de fato delega ao proxy compartilhado.

### Mudança 2 — mesmo arquivo, teste de **integração runtime**

Usar `withFetchStub` (já em `_helpers.ts`) para interceptar a chamada real de `proxyToEvolution` e validar a URL construída:

```ts
Deno.test("proxy receives correct instance in sendSticker URL", leakSafeOpts, async () => {
  let capturedUrl = "";
  await withFetchStub(
    async (input) => {
      capturedUrl = typeof input === "string" ? input : input.toString();
      return new Response(JSON.stringify({ key: { id: "msg_1" } }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    },
    async () => {
      const res = await proxyToEvolution(
        URL_BASE, KEY, CORS_DEFAULT,
        "/message/sendSticker/wpp2", "POST",
        { number: "5511999999999", sticker: "https://example.com/s.webp" },
      );
      await res.text();
    },
  );
  assertEquals(capturedUrl, `${URL_BASE}/message/sendSticker/wpp2`);
});
```

Variante negativa: chamar com instância vazia/undefined → URL contém `/sendSticker/undefined` → garante que ausência de `instanceName` se manifesta no path (documenta o contrato; o handler em `index.ts` é quem deve validar a presença, não o proxy).

### Mudança 3 — extensão do guard genérico (opcional, defensivo)

Em `send-media-audio-instance.test.ts` já existe um teste "instance é resolvida de `instanceName` com fallback". Não precisa duplicar — o regex `body\.instanceName\s*\|\|\s*body\.instance` cobre todos os handlers, incluindo sticker. Apenas anotar isso no header do novo arquivo.

### Mudança 4 — CI

Nada a alterar. O job `deno-edge-tests` em `.github/workflows/ci.yml` já roda `supabase/functions/evolution-api/__tests__/` recursivamente, então o novo arquivo é incluído automaticamente.

### Verificação

- `supabase--test_edge_functions` filtrando `evolution-api` → todos verdes (incluindo os 4 novos sub-testes de sticker).
- Confirmar via `--reporter=pretty` que não há leaks (`leakSafeOpts` aplicado no teste runtime, igual aos demais testes que armam `AbortController`).

### Arquivos afetados

- `supabase/functions/evolution-api/__tests__/send-sticker-instance.test.ts` (criado, ~60 linhas)

