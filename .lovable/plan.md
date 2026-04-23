

# Ampliar guard-rails: `public-api` também deve usar pipeline unificado

## Contexto atual

- `supabase/functions/public-api/index.ts` hoje aceita **apenas** `action: 'send'` (texto) e — importante — chama `fetch(${evolutionUrl}/message/sendText/${connection.instance_id})` **direto**, na linha 137. Isso é uma violação do padrão "tudo passa pelo proxy unificado de `evolution-api`".
- O teste `supabase/functions/evolution-api/__tests__/send-media-audio-instance.test.ts` já garante que dentro do edge `evolution-api` os handlers `send-media`/`send-audio` nunca usam `fetch(`.
- **Não existe** nenhum teste em `supabase/functions/public-api/__tests__/` ainda. O teste "no-direct-fetch" mencionado é o do `evolution-api`. Vou criar o equivalente para `public-api`.

## Plano (apenas teste, sem mudar runtime)

### Criar `supabase/functions/public-api/__tests__/no-direct-fetch.test.ts`

Análise estática do source (mesmo padrão dos outros testes Deno do projeto). Quatro asserções:

1. **Se existir handler para qualquer `action` de mídia/áudio (`send-media`, `send-audio`, `send-image`, `send-document`, `send-video`, `send-sticker`, `sendMedia`, `sendAudio`), ele NÃO pode chamar `fetch(` direto.**
   Estratégia: para cada marker `action === '<rota-mídia>'` encontrado no source, extrair janela de 1500 chars e assertar `!block.includes("fetch(")`. Se o marker não existir, o teste é skipped para aquela rota (pass). Isso protege contra regressão quando alguém adicionar suporte a mídia.

2. **Quando handlers de mídia forem adicionados, devem rotear via `evolution-api/send-*`** — ou seja, devem usar `supabase.functions.invoke('evolution-api', { body: { action: 'send-media' | 'send-audio', ... } })`. Se algum dos markers de mídia existir, exigir que o bloco contenha `functions.invoke('evolution-api'` ou `functions.invoke("evolution-api"`.

3. **Audit do estado atual (texto)**: explicitamente documentar que o `action: 'send'` (texto) **hoje viola** o padrão e usa `fetch` direto. Marcar com `Deno.test.ignore` (skip com mensagem) descrevendo o débito técnico, para não falhar o build mas deixar visível no output. Alternativa: asserção condicional que loga warning. Vou usar `Deno.test.ignore` com nome explícito `"FUTURE: public-api 'send' (text) should also route via evolution-api/send-text (currently violates)"`.

4. **Garantia geral**: `public-api/index.ts` não pode importar nada que faça bypass — checar que qualquer `fetch(` restante no source aponta exclusivamente para `connection.instance_id` (texto legacy) e não para `sendMedia`/`sendWhatsAppAudio`. Regex: `assert(!SOURCE.match(/fetch\([^)]*sendMedia/))` e `assert(!SOURCE.match(/fetch\([^)]*sendWhatsAppAudio/))`.

### Estrutura (resumo)

```ts
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SOURCE = await Deno.readTextFile(new URL("../index.ts", import.meta.url));

const MEDIA_ACTIONS = [
  "send-media", "send-audio", "send-image", "send-document",
  "send-video", "send-sticker", "sendMedia", "sendAudio",
];

function blockAfter(marker: string, size = 1500): string | null {
  const i = SOURCE.indexOf(marker);
  return i === -1 ? null : SOURCE.slice(i, i + size);
}

for (const action of MEDIA_ACTIONS) {
  Deno.test(`public-api: '${action}' (if present) must not call fetch() directly`, () => {
    const block = blockAfter(`action === '${action}'`);
    if (!block) return; // not implemented yet — pass
    assert(!block.includes("fetch("),
      `public-api handler for '${action}' must route via evolution-api invoke, not fetch()`);
    assert(
      block.includes("functions.invoke('evolution-api'") ||
      block.includes('functions.invoke("evolution-api"'),
      `public-api handler for '${action}' must use supabase.functions.invoke('evolution-api', ...)`,
    );
  });
}

Deno.test("public-api never calls Evolution sendMedia/sendWhatsAppAudio via direct fetch", () => {
  assert(!/fetch\([^)]*sendMedia/.test(SOURCE),
    "public-api must not fetch() Evolution sendMedia directly");
  assert(!/fetch\([^)]*sendWhatsAppAudio/.test(SOURCE),
    "public-api must not fetch() Evolution sendWhatsAppAudio directly");
});

Deno.test.ignore(
  "FUTURE: public-api 'send' (text) should also route via evolution-api invoke (currently uses direct fetch — tracked as tech debt)",
  () => {
    const block = blockAfter("action !== 'send'", 2000) ?? "";
    assert(!block.includes("fetch("));
  },
);
```

### Execução

Após criar, rodar `supabase--test_edge_functions` filtrando `public-api` para confirmar que todas as asserções de mídia passam (ou são skipped por ainda não existirem) e o teste `tech-debt` aparece como `ignored` no output.

## Por que NÃO refatorar o `fetch` direto do texto agora

O usuário pediu **ampliar o teste**, não corrigir o handler de texto. Tocar no runtime de `send` exige:
- Adicionar invoke para `evolution-api` action `send-text`
- Garantir que `evolution-api` tem handler `send-text` (não vi no contexto fornecido)
- Validar fluxo de update de `external_id`/status

Isso é um plano separado. O teste `Deno.test.ignore` deixa o débito técnico **rastreável e visível** no output sem falhar build.

## Entregáveis

- **Novo**: `supabase/functions/public-api/__tests__/no-direct-fetch.test.ts` (~10 testes — 8 por ação de mídia + 1 regex global + 1 ignored para débito técnico)
- **Sem mudanças** em `public-api/index.ts`, `evolution-api/index.ts` ou no proxy.

