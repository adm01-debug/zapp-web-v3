# E2E: Mensagem nova aparece na thread correta do inbox unificado

## Objetivo

Adicionar uma spec Playwright que abre o inbox unificado da conversa que o teste anterior criou (ou de uma conversa existente) e valida que **uma nova mensagem injetada via mock aparece na thread correta** — ou seja, dentro do `role="log"` da conversa selecionada e não em outra.

Complementa as specs de envio (`send-message-cycle.spec.ts`) cobrindo o lado de **recepção / atualização da view unificada**.

## Arquivo novo

`e2e/inbox-thread-message-arrival.spec.ts`

Dois casos:

1. **Mensagem nova aparece na thread aberta**
   - Mockar o RPC `rpc_list_messages_lite` (chamado via `externalSupabase`, URL `https://tdprnylgyrogbbhgdoik.supabase.co/rest/v1/rpc/rpc_list_messages_lite`) para devolver, na primeira chamada, uma lista base com 2 mensagens da conversa selecionada e, em chamadas subsequentes, a mesma lista **+** uma terceira mensagem nova com texto único `e2e-incoming-<runId>`.
   - Mockar também `rpc_list_messages` (legacy) com a mesma resposta, por segurança.
   - Abrir a primeira conversa do `role="listbox"` (idêntico padrão das specs existentes).
   - Esperar a mensagem base renderizar dentro do `role="log"`.
   - Disparar uma re-fetch (clicando na mesma conversa novamente, OU usando o `refetch` natural do `useMessages` ao trocar e voltar à conversa) e poll até que `e2e-incoming-<runId>` apareça **dentro do `role="log"`** (locator `page.getByRole('log').getByText(...)`).

2. **A mensagem não vaza para outra conversa**
   - Com o mesmo mock instalado, alternar para a segunda conversa do `listbox` (se existir; senão `test.skip`).
   - Asseverar que dentro do `role="log"` da segunda conversa **não** aparece o texto `e2e-incoming-<runId>` — o mock por padrão devolve uma lista vazia para qualquer `p_remote_jid` diferente do alvo.
   - Voltar para a primeira conversa e re-confirmar que a mensagem segue lá.

## Mocks

Função utilitária `installInboxMessagesMock(page, { targetJid, baseMessages, newMessage })`:

- Intercepta `**/rest/v1/rpc/rpc_list_messages_lite` e `**/rest/v1/rpc/rpc_list_messages` (POST).
- Lê o body (`postDataJSON()`) — pega `p_remote_jid`.
- Se `p_remote_jid !== targetJid`: devolve `[]`.
- Se `p_remote_jid === targetJid`:
  - Primeiras `N` chamadas → devolve `baseMessages`.
  - A partir de uma flag `armed=true` (setada após espera curta), passa a devolver `[...baseMessages, newMessage]`.

A flag é alternada via `page.evaluate(() => window.__E2E_ARM__ = true)` ou simplesmente após `await page.waitForTimeout(500)` no handler — mantemos no handler com timestamp para evitar tocar `window`.

## Resolução do `targetJid`

Como a UI do inbox lê `remote_jid` do item selecionado, capturamos o JID **diretamente do clique**: extraímos o atributo `data-remote-jid` ou, se não existir, lemos a primeira chamada real ao RPC (antes de instalar o mock seletivo) com `page.waitForRequest` para descobrir o JID que a UI pediu, e então re-routeamos com esse JID. Isto evita acoplar o teste a um dado específico.

## Defensividade

- `test.skip` se nenhuma conversa estiver visível (mesmo padrão das outras specs).
- `test.skip` no segundo caso se houver apenas uma conversa.
- Timeouts gerosos (10s) para tolerar render do virtualizado.

## Notas técnicas

- Não toca produção: nenhum dado é escrito; o mock substitui as respostas em **memória** do navegador do teste.
- Compatível com a fixture `authenticatedPage` existente.
- Não requer mudanças em código de produção.
- Reusa selectors já consolidados (`role="listbox"`, `role="option"`, `role="log"`).
