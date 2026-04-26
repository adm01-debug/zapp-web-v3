# E2E: Ciclo completo de envio (texto + mídia) com mocks

## Objetivo

Adicionar uma spec Playwright que valide o ciclo completo de envio de mensagens (texto **e** mídia) e a renderização correspondente no chat, **sem** depender de provedores reais — todos os endpoints de envio e webhook são mockados via `page.route`.

A spec existente `e2e/send-message.spec.ts` cobre apenas o caminho "Nova Conversa" e checa só a bolha otimista de texto. A nova spec foca no fluxo principal do dia-a-dia: abrir uma conversa existente, enviar texto, enviar mídia, validar render e o payload que chegou na function.

## Arquivo novo

`e2e/send-message-cycle.spec.ts` — três casos:

1. **Texto** — abre primeira conversa, digita mensagem, dispara envio (botão ou `Enter`), verifica:
   - Bolha otimista renderiza em ≤ 3s.
   - Mock de `evolution-api` recebeu `action='send-text'` com o texto correto.

2. **Mídia (imagem)** — escreve um PNG 1x1 temporário, faz `setInputFiles` no `<input type="file">` do chat, confirma envio, verifica:
   - Mock de `evolution-api` recebeu `action='send-media'` com `mediaUrl` definido.
   - Algum `<img>` renderiza dentro da área de mensagens (`[role="log"]` / `[data-testid="chat-messages"]`).

3. **Falha controlada** — força `evolution-api` a responder `503`, dispara um envio e garante:
   - App não crasha (lista de conversas continua visível).
   - Nenhum fallback de Error Boundary toma a tela.

## Mocks instalados em todos os casos (`installSendMocks`)

- `**/functions/v1/evolution-api**` → `200` com `MOCK_EVOLUTION_SEND_RESPONSE`; captura `body.text` e `body.mediaUrl` em um objeto compartilhado para asserts posteriores.
- `**/functions/v1/whatsapp-cloud-api**` → `200` com `{ success:true, messages:[{id:'MOCK_CLOUD_WAMID'}] }` (parity com Cloud).
- `**/functions/v1/whatsapp-cloud-webhook**` e `**/functions/v1/evolution-webhook**` → `200 ok` (hermetic — bloqueia chamada acidental).

## Defensividade

- Cada caso usa `test.skip` quando a UI/perfil do usuário de teste não expõe a peça necessária (sem conversas, sem input de chat, sem campo de upload). Isso evita falsos negativos no CI quando o seed do banco varia.
- Seletores em cascata (`data-testid` primeiro, depois `role`/placeholder) para tolerar evolução do skin sem quebrar o teste.

## Notas técnicas

- Reutiliza `authenticatedPage` de `e2e/fixtures/auth.ts` e `MOCK_EVOLUTION_SEND_RESPONSE` de `e2e/fixtures/test-data.ts`.
- O PNG é gerado via `fs.writeFileSync` em `os.tmpdir()` para evitar fixtures binários no repo.
- A captura do payload usa `request.postDataJSON()` no handler do mock — funciona tanto para `supabase.functions.invoke` quanto para `fetch` direto, pois ambos serializam JSON.
- Sem mudanças em código de produção e sem novos arquivos fora de `e2e/`.
