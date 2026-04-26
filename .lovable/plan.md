# E2E: Inbox criado → thread unificada → mensagem inbound mockada

## Objetivo

Cobrir o fluxo end-to-end: partir da tela de **Conexões/Inboxes** (`/#connections`), abrir o **inbox unificado**, simular a chegada de uma mensagem inbound via **mocks de webhook + camada de DB**, e validar que a bolha aparece **na thread correta** (e não vaza para outras).

Complementa as specs já enviadas:
- `send-message-cycle.spec.ts` (envio outbound)
- `webhook-providers-parity.spec.ts` (paridade de provedores no backend)
- `inbox-thread-message-arrival.spec.ts` (chegada via mock de DB)

A diferença aqui é incluir **a navegação a partir da tela de Conexões** e **um POST sintético ao endpoint de webhook** (interceptado), tornando o teste fiel ao caminho real "Conexão criada → mensagem chega → renderiza no chat".

## Arquivo novo

`e2e/inbox-created-thread-inbound.spec.ts`

Um único cenário (auto-skip se faltarem dados):

1. Visita `/#connections` e confirma que a view de Conexões renderiza (sem exigir um seletor rígido — apenas que a navegação não estoure).
2. Navega para `/` (inbox unificado) e espera o `role="listbox"` "Lista de conversas".
3. Instala dois mocks **antes** de abrir a thread:
   - **Webhook**: intercepta `**/functions/v1/evolution-webhook**` e `**/functions/v1/whatsapp-cloud-webhook**` → sempre 200, contando hits.
   - **DB de mensagens**: intercepta `**/rest/v1/rpc/rpc_list_messages_lite` e `rpc_list_messages` no host do FATOR X. Captura o `p_remote_jid` da primeira chamada (= JID da conversa aberta) e devolve, depois de `armed=true`, uma terceira mensagem inbound com texto único `e2e-inbound-<runId>`. Para qualquer outro JID retorna `[]` (isolamento).
4. Clica na primeira conversa do listbox (representa o "inbox criado") e espera o `role="log"` + a mensagem base.
5. Dispara um POST sintético via `page.evaluate(fetch(...))` para o endpoint do webhook (interceptado → 200). Assereta que `webhookHits > 0`.
6. Marca `armed=true` e força o refetch alternando para a 2ª conversa (se existir) e voltando — comportamento natural do `useMessages` ao trocar de contato.
7. Asserta que `e2e-inbound-<runId>` aparece **dentro** do `role="log"` da thread alvo, e que `BASE_IN` segue presente.
8. Se houver 2+ conversas: alterna para a outra e confirma que `e2e-inbound-<runId>` **não** aparece — garantindo isolamento por thread.

## Mocks (resumo)

```ts
// Webhook hermético
page.route("**/functions/v1/evolution-webhook**", r =>
  r.fulfill({ status: 200, body: JSON.stringify({ ok: true }) }));

// DB de mensagens — só responde para o JID alvo
page.route("**/rest/v1/rpc/rpc_list_messages_lite**", async r => {
  const { p_remote_jid } = r.request().postDataJSON() ?? {};
  if (p_remote_jid !== state.targetJid) return r.fulfill({ status: 200, body: "[]" });
  const list = state.armed ? [...base, makeInbound(INBOUND_TEXT)] : base;
  return r.fulfill({ status: 200, body: JSON.stringify(list) });
});
```

## Defensividade

- `test.skip` quando o usuário de teste não tem acesso ao inbox unificado.
- `test.skip` para a etapa de isolamento se houver apenas uma conversa.
- Texto único por execução (`RUN_ID`) — sem colisão entre runs paralelos.
- Nenhum dado escrito em produção: mocks no nível do navegador.

## Notas técnicas

- Reusa selectors padronizados: `role="listbox"` + `role="option"` + `role="log"`.
- Usa a fixture `authenticatedPage` existente.
- `process.env.E2E_SUPABASE_PROJECT_ID` opcional (default: `tdprnylgyrogbbhgdoik` — ref do FATOR X).
- Não requer mudanças em código de produção nem nas Edge Functions.
