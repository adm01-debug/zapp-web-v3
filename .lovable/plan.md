# E2E: Conexão criada → Inbox unificado → webhook inbound mockado → bolha na thread certa

## Objetivo

Cobrir o caminho do usuário: **abrir uma conexão criada** na tela de Conexões, **navegar para o Inbox unificado**, **disparar um webhook inbound mockado** e validar que **a bolha de mensagem renderiza dentro da thread correta** (sem vazar para outras conversas).

Difere do spec já entregue (`inbox-created-thread-inbound.spec.ts`) por **interagir explicitamente com um card de conexão** (clique no `<h3>` do nome), garantindo que o fluxo "selecionei uma conexão antes de ir ao inbox" é exercitado.

## Arquivo novo

`e2e/connection-to-inbox-inbound.spec.ts`

### Cenário (auto-skip se faltarem dados)

1. **Navegação para conexões**
   - `goto("/#connections")`.
   - Localiza qualquer card de conexão pelo `<h3>` dentro de um `Card`. Se não houver nenhum visível em 8s → `test.skip` ("nenhuma conexão criada para o usuário de teste").
   - Captura o nome da primeira conexão e clica nela (best-effort: clique não precisa abrir nada — apenas exercita o gesto de "abrir a conexão criada"; se nada acontecer, seguimos).

2. **Mocks instalados antes de tocar o inbox**
   - Webhook hermético: `**/functions/v1/evolution-webhook**` e `**/functions/v1/whatsapp-cloud-webhook**` → 200, contando `webhookHits`.
   - Camada de DB: `**/rest/v1/rpc/rpc_list_messages_lite` e `rpc_list_messages` no host do FATOR X. Captura o `p_remote_jid` da primeira chamada (= JID da thread alvo). Para JID alvo: devolve 2 mensagens base; quando `armed=true`, adiciona uma 3ª inbound com texto único `e2e-inbound-<runId>`. Para qualquer outro JID: `[]` (isolamento).

3. **Inbox unificado**
   - `goto("/")`. Se `role="listbox"` "Lista de conversas" não aparecer em 8s, tenta `/inbox`. Se ainda assim não → `test.skip`.

4. **Abrir thread alvo**
   - Clica no primeiro `role="option"` do listbox.
   - Espera o `role="log"` "Mensagens da conversa" e a mensagem base aparecer.
   - Asserta que `state.targetJid` foi capturado.

5. **Disparar webhook inbound sintético**
   - `page.evaluate(() => fetch(<evolution-webhook URL>, { method: "POST", body: messages.upsert payload }))`.
   - Asserta `webhookHits > 0`.

6. **Armar mock de DB e forçar refetch**
   - `state.armed = true`.
   - Toggle: clica em outra conversa (se existir) e volta — comportamento natural do `useMessages`.

7. **Validar render na thread certa**
   - `expect(log.getByText(INBOUND_TEXT)).toBeVisible({ timeout: 15_000 })`.
   - Mensagem base segue presente.

8. **Isolamento por thread (se houver 2+ conversas)**
   - Alterna para outra conversa e asserta `toHaveCount(0)` para `INBOUND_TEXT` no `role="log"`.

## Defensividade

- `test.skip` quando: sem conexões criadas, sem inbox acessível, sem conversas.
- `RUN_ID` único por execução evita colisão entre runs paralelos.
- Sem chamadas reais a Edge Functions ou banco — tudo interceptado em `page.route`.

## Notas técnicas

- Reusa selectors padronizados (`role="listbox"`, `role="option"`, `role="log"`).
- Reusa fixture `authenticatedPage`.
- `process.env.E2E_SUPABASE_PROJECT_ID` opcional (default: `tdprnylgyrogbbhgdoik` — ref FATOR X).
- Não exige mudanças em código de produção.
