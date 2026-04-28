## Diagnóstico

Quando o usuário clica num contato em **Contatos**, o handler `openContactChat` (em `src/components/contacts/useContactsCRUD.ts`) entrega o **UUID do `contacts.id` do Lovable Cloud** ao Inbox via `window.__pendingOpenContactId` + evento `open-contact-chat`.

Porém, após a migração FATOR X, o Inbox roda em modo externo (`USE_EXTERNAL_DB = true` em `useRealtimeInbox.ts`) e identifica cada conversa pelo `remote_jid` do WhatsApp (ex.: `5511999999999@s.whatsapp.net`) — veja `derivedToConversationContact` em `src/adapters/evolutionAdapter.ts` (`id: dc.remoteJid`).

Resultado:
1. `selectedConversation` nunca casa (UUID ≠ JID).
2. O fallback que buscaria em `public.contacts` é **explicitamente pulado** no modo externo (`useRealtimeInbox.ts` linhas 167–169).
3. `resolvedSelectedConversation` fica `null` → o ChatPanel não tem contato resolvido → o input de envio fica inerte / não há `remoteJid` para o `rpc_insert_message`.

Por isso “seleciono o contato e não consigo enviar mensagem”.

## Correção

Centralizar a abertura do chat no helper já existente `openContactInChat` (`src/lib/openContactInChat.ts`), que aceita `phone`/`remoteJid` e resolve para o identificador correto. O módulo Contatos passa a entregar o **telefone** do contato (e gera o `remote_jid` `${phone}@s.whatsapp.net`), em vez do UUID.

### Mudanças

1. **`src/components/contacts/useContactsCRUD.ts`**
   - Trocar `openContactChat(contactId)` por `openContactChat(contact)` que recebe o objeto `Contact` (precisamos do `phone`).
   - Implementação: chamar `openContactInChat({ phone: contact.phone, remoteJid: \`${contact.phone}@s.whatsapp.net\` })`. Remover o push direto de UUID em `__pendingOpenContactId`.

2. **`src/components/contacts/ContactsView.tsx`**
   - Ajustar os 3 call-sites (`onContactClick`, `onOpenChat`, `onContactSelected`) para passar o objeto `Contact` em vez do `id`. Onde o componente filho hoje envia só o id, encapsular em `(c) => openContactChat(c)`.

3. **`src/hooks/useRealtimeInbox.ts`** (defesa em profundidade)
   - No bloco que lê `__pendingOpenContactId` (linhas 136–139), se o valor **não** parecer um `remote_jid` (sem `@`) e o modo for externo, ignorar/avisar via `log.warn` em vez de gravar como `selectedContactId`. Evita regressão silenciosa caso outro caller ainda envie UUID.

4. **`src/lib/openContactInChat.ts`** (pequeno reforço)
   - Quando `phone` for fornecido e `remoteJid` ausente, **derivar** `remoteJid = \`${phone}@s.whatsapp.net\`` antes de gravar o `__pendingOpenContactId` — e gravar o **JID**, não o UUID, no modo externo. Hoje ele grava `contactId` (UUID do `public.contacts` resolvido por phone), o que também não funciona no Inbox externo.
   - Regra: `__pendingOpenContactId` recebe o JID; `__pendingOpenChatTarget` mantém ambos (jid + uuid + phone) para telas que ainda usam UUID.

5. **Teste rápido**
   - Atualizar `src/lib/__tests__/openContactInChat.test.ts` para refletir que, dado `{ phone }`, o handshake deposita o `remote_jid` (não o UUID) em `__pendingOpenContactId`.

## Resultado esperado

- Clicar em qualquer contato no módulo Contatos abre o Inbox **já posicionado na conversa correta** (lista cacheada casa pelo JID, ou um placeholder de “primeira conversa” se nunca houve mensagem).
- O ChatPanel renderiza input ativo e o envio chama `rpc_insert_message` com o `remote_jid` válido.
- Deep-links existentes (URL `?contact=`, AdminFailedMessages, busca global) continuam funcionando porque já usam `openContactInChat` com `remoteJid`/`phone`.

Sem migrações de DB, sem mudanças em edge functions.