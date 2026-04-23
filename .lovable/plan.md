

# Testes Deno: `send-media` e `send-audio` exigem `instanceName` e proxy recebe instância correta

## Contexto

`supabase/functions/evolution-api/index.ts` resolve a instância via `body.instanceName || body.instance` (linha 53) e injeta no path do proxy:

- `send-media` (linha 97): `/message/sendMedia/${instance}` — bloco single-line.
- `send-audio` (linhas 99–107): `/message/sendWhatsAppAudio/${instance}` — bloco multi-linha após resolução de URL assinada.

Hoje **não existe** nenhum arquivo de teste em `supabase/functions/evolution-api/__tests__/`. Os testes mencionados em mensagens anteriores cobriam outras rotas, mas `send-media` e `send-audio` não têm asserção dedicada. Vou criar um.

## Plano

### Criar `supabase/functions/evolution-api/__tests__/send-media-audio-instance.test.ts`

Arquivo Deno que faz **análise estática do source** de `index.ts` (mesmo padrão dos testes `send-routes-instance` referenciados antes — sem precisar de runtime do edge nem de mocks de fetch). Valida 4 garantias:

1. **`send-media` injeta `${instance}` no path do proxy**
   - Regex: bloco `if (action === 'send-media')` deve conter `/message/sendMedia/${instance}`.

2. **`send-audio` injeta `${instance}` no path do proxy** (multi-linha)
   - Janela de 1500 chars a partir de `action === 'send-audio'` deve conter `/message/sendWhatsAppAudio/${instance}`.

3. **A variável `instance` é derivada de `instanceName` (com fallback para `instance`)**
   - Source deve conter `body.instanceName || body.instance`.

4. **Helper `proxy()` repassa o path completo (com instância) para `proxyToEvolution`**
   - `const proxy = (path: string, ...) => proxyToEvolution(evolutionApiUrl, evolutionApiKey, corsHeaders, path, ...)` deve estar presente — garantindo que o `${instance}` interpolado no path chega ao proxy real.

5. **Bonus de regressão**: nenhuma das duas rotas chama `fetch(` direto (devem sempre usar `proxy()`), evitando bypass do retry/timeout do `evolution-api-proxy.ts`.

### Estrutura do teste (resumo)

```ts
import { assert, assertMatch } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SOURCE = await Deno.readTextFile(
  new URL("../index.ts", import.meta.url)
);

function blockAfter(marker: string, size = 1500): string {
  const i = SOURCE.indexOf(marker);
  if (i === -1) throw new Error(`marker not found: ${marker}`);
  return SOURCE.slice(i, i + size);
}

Deno.test("send-media path includes ${instance}", () => {
  const block = blockAfter("action === 'send-media'", 400);
  assertMatch(block, /\/message\/sendMedia\/\$\{instance\}/);
});

Deno.test("send-audio path includes ${instance} (multi-line block)", () => {
  const block = blockAfter("action === 'send-audio'", 1500);
  assertMatch(block, /\/message\/sendWhatsAppAudio\/\$\{instance\}/);
  // garante que o bloco realmente termina chamando proxy
  assertMatch(block, /return await proxy\(/);
});

Deno.test("instance is resolved from instanceName with fallback", () => {
  assertMatch(SOURCE, /body\.instanceName\s*\|\|\s*body\.instance/);
});

Deno.test("proxy() helper forwards path to proxyToEvolution", () => {
  assertMatch(
    SOURCE,
    /const proxy = \(path: string[^)]*\)\s*=>\s*\n?\s*proxyToEvolution\(evolutionApiUrl, evolutionApiKey, corsHeaders, path/
  );
});

Deno.test("send-media and send-audio never call fetch() directly", () => {
  const media = blockAfter("action === 'send-media'", 400);
  const audio = blockAfter("action === 'send-audio'", 1500);
  assert(!media.includes("fetch("), "send-media must use proxy(), not fetch()");
  assert(!audio.includes("fetch("), "send-audio must use proxy(), not fetch()");
});
```

### Após criar o arquivo

Rodar `supabase--test_edge_functions` filtrando por `evolution-api` para confirmar 5/5 verdes.

## Por que análise estática (e não runtime)?

- O handler depende de `Deno.serve`, secrets (`EVOLUTION_API_URL/KEY`), `createClient`, e do `proxyToEvolution` real fazendo `fetch` para a Evolution. Mockar tudo isso adiciona fragilidade sem ganho — a invariante que importa é **"o path enviado ao proxy contém `${instance}`"**, e isso é uma propriedade do source.
- É o mesmo padrão já adotado em `public-api/__tests__/unified-pipeline.test.ts` (aprovado anteriormente) e nos testes de `send-routes-instance` mencionados no histórico.

## Entregáveis

- **Novo**: `supabase/functions/evolution-api/__tests__/send-media-audio-instance.test.ts` (5 testes Deno)
- **Sem mudanças** em `index.ts` ou no proxy — é puro teste de regressão.

## Observação sobre os build errors recebidos

Os 8 erros de TS reportados (`analyze-external-db`, `external-db-proxy`, `evolution-api/index.ts:101`, `ContactMergeDialog`, `useGeoBlocking`, etc.) **não são causados por este plano** — são pré-existentes ao repositório. Posso tratá-los em planos separados sob demanda; este plano é cirúrgico e adiciona apenas um arquivo `.test.ts` que não altera tipos do app.

