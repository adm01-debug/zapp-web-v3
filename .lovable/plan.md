

## Refatorar `public-api action: 'send'` para rotear via `evolution-api` invoke + teste de integração

### Estado atual

`supabase/functions/public-api/index.ts` envia texto chamando `fetch` direto em `${EVOLUTION_API_URL}/message/sendText/${instance_id}`. Isso duplica responsabilidades (CORS, retry, normalização de erro) que já vivem em `evolution-api` via `proxyToEvolution`. Também impede testar de forma uniforme se `instanceName` é repassado corretamente.

### Mudança 1 — `supabase/functions/public-api/index.ts`

Substituir o bloco `try { ... fetch(${evolutionUrl}/message/sendText/...) }` por uma invocação da edge `evolution-api`:

```ts
const { data: invokeData, error: invokeError } = await supabase.functions.invoke(
  'evolution-api',
  {
    body: {
      action: 'send-text',
      instanceName: connection.instance_id,
      number: phone,
      text: message,
    },
  }
);

if (invokeError) {
  log.error('evolution-api invoke error', { error: invokeError.message });
  await supabase.from('messages').update({ status: 'failed' }).eq('id', msg.id);
} else {
  const externalId = extractEvolutionMessageId(invokeData);
  if (externalId) {
    await supabase.from('messages')
      .update({ external_id: externalId, status: 'sent' })
      .eq('id', msg.id);
  }
}
```

Removidas: leitura local de `EVOLUTION_API_URL` / `EVOLUTION_API_KEY` no bloco de envio (continuam sendo usadas pelo `evolution-api`). O guard `extractEvolutionMessageId(invokeData)` continua válido — `evolution-api` devolve o JSON cru da Evolution.

### Mudança 2 — atualizar guard estático

`supabase/functions/public-api/__tests__/no-direct-fetch.test.ts` tem um `Deno.test.ignore` marcado como "FUTURE" para a rota `send` (texto). Trocar por teste **ativo** que valida:

- bloco do handler `'send'` **não** contém `fetch(`
- bloco do handler `'send'` contém `functions.invoke('evolution-api'` (ou `"evolution-api"`)

Usando o helper `extractBlock` recém-criado em `supabase/functions/evolution-api/__tests__/_helpers.ts` — porém ele vive na pasta da outra função. Solução: criar **`supabase/functions/_shared/test-helpers.ts`** promovendo `extractBlock`/`readSourceFrom` para uso por qualquer função, e re-exportar do helper local da `evolution-api` para manter compat.

### Mudança 3 — novo arquivo `supabase/functions/public-api/__tests__/send-routes-instance.test.ts`

Teste de **contrato/integração estática** análogo ao `send-media-audio-instance.test.ts`:

1. **Validação de input**: garante que o `SendActionSchema` (Zod) rejeita request sem `number` e sem `message` — testa a função pura via re-import (ou regex sobre source confirmando `z.string().min(...)`).
2. **Repasse de `instanceName`**: análise estática sobre o bloco do handler `'send'` confirmando que o `body` da invocação contém literalmente `instanceName: connection.instance_id` e `action: 'send-text'`.
3. **Sem fetch direto**: confirma ausência de `fetch(` no bloco.
4. **Cobertura futura `send-media-*` / `send-audio-*`**: loop `Deno.test` que, **se** o bloco `action === 'send-media'` (ou `send-audio`, `send-image`, `send-document`, `send-video`) existir, exige que o body da invoke inclua `instanceName:`. Se não existir ainda, o teste passa (no-op) — espelha o padrão atual de `no-direct-fetch.test.ts`, garantindo que quando essas rotas forem implementadas no `public-api`, o repasse de `instanceName` será obrigatório.

### Mudança 4 — CI

O job `deno-edge-tests` no `.github/workflows/ci.yml` hoje só roda `supabase/functions/evolution-api/__tests__/`. Estender para também rodar `supabase/functions/public-api/__tests__/`:

```yaml
run: |
  deno test --allow-net --allow-env --allow-read --reporter=pretty \
    supabase/functions/evolution-api/__tests__/ \
    supabase/functions/public-api/__tests__/
```

Sem `working-directory` (passa caminhos absolutos a partir do repo root).

### Verificação

Rodar `supabase--test_edge_functions` filtrando `public-api` e `evolution-api` — todos verdes. Disparar uma chamada real via `supabase--curl_edge_functions` em `/public-api` com um número válido (ambiente de teste) confirmando que a mensagem é persistida com `status: sent` e `external_id` populado.

### Arquivos afetados

- `supabase/functions/public-api/index.ts` (refatorado: troca `fetch` direto por `supabase.functions.invoke`)
- `supabase/functions/public-api/__tests__/no-direct-fetch.test.ts` (ativa o teste `FUTURE`)
- `supabase/functions/public-api/__tests__/send-routes-instance.test.ts` (criado)
- `supabase/functions/_shared/test-helpers.ts` (criado: promove `extractBlock`/`readSourceFrom` para uso compartilhado)
- `supabase/functions/evolution-api/__tests__/_helpers.ts` (re-exporta do shared para manter compat)
- `.github/workflows/ci.yml` (job `deno-edge-tests` passa a rodar também `public-api/__tests__/`)

