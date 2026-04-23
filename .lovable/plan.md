

## Indicador "digitando…" via canal `typing:${remote_jid}` no preview e no chat

### Problema

1. Webhook emite broadcast no canal `typing:${contact.id}` — onde `contact.id` é UUID da tabela legada `contacts` (Lovable Cloud). No inbox FATOR X, conversas usam `remote_jid` como id, então o broadcast não bate com o canal que o cliente assina.
2. `useTypingPresence` está acoplado ao `supabase` (Lovable Cloud) e só é consumido no `ChatPanel` — a **lista de conversas** (preview) não mostra "digitando…" ao lado do contato, mesmo quando o webhook chega.
3. Chave do canal é o `conversationId` genérico, não normalizado para `remote_jid` — torna impossível um produtor (webhook) e múltiplos consumidores (chat aberto + cards na sidebar) sincronizarem.

### Decisão

Padronizar o canal como **`typing:${remote_jid}`** (chave estável, derivada do JID do WhatsApp) e adicionar consumo do estado em **dois lugares**: `ChatPanelHeader` (já existe) e `ConversationItem`/`VirtualizedRealtimeList` (novo).

- **Webhook** (`handlePresenceUpdate`): emitir broadcast em `typing:${jid}` (formato `${phone}@s.whatsapp.net`), mantendo compat — emite **também** no canal antigo `typing:${contact.id}` durante 1 release para fluxos legados.
- **Hook `useTypingPresence`**: aceitar `remoteJid?: string` opcional; quando presente, sobrescreve `conversationId` na chave do canal. Mantém a API atual para não quebrar `ChatPanel`/team chat.
- **Novo hook leve `useContactTyping(remoteJid)`**: read-only, sem `track`/`presence` — só assina o broadcast `contact_typing` e devolve `boolean`. Pensado para a lista (centenas de cards subscritos sem custo de presença).
- **UI**:
  - `ConversationItem`: substitui a linha de "última mensagem" por "digitando…" animado quando `useContactTyping(conversation.contact.id)` é true. Aplica também no `VirtualizedRealtimeList`.
  - `ChatPanelHeader`: já exibe `TypingIndicatorCompact`, só passamos o `remoteJid` (= `conversation.contact.id` no FATOR X) para o hook.

### Arquivos

**Editado (1) — webhook:**

1. `supabase/functions/_shared/evolution-webhook-handlers.ts` — em `handlePresenceUpdate`:
   - Calcula `const jid = presenceData.id || presenceData.remoteJid` (preserva formato `@s.whatsapp.net`).
   - Emite broadcast em **dois** canais (compat):
     ```ts
     const payload = { isTyping: isComposing, remoteJid: jid, timestamp: new Date().toISOString() };
     // Novo (FATOR X): chave por remote_jid
     const ch1 = supabase.channel(`typing:${jid}`);
     await ch1.send({ type: 'broadcast', event: 'contact_typing', payload });
     supabase.removeChannel(ch1);
     // Legacy (Lovable Cloud contact.id) — mantém durante migração
     if (contact?.id) {
       const ch2 = supabase.channel(`typing:${contact.id}`);
       await ch2.send({ type: 'broadcast', event: 'contact_typing', payload: { ...payload, contactId: contact.id } });
       supabase.removeChannel(ch2);
     }
     ```
   - Filtro broadcast-defense: ignora `jid` que case `/@broadcast$/` ou `@g.us` (já filtrado).

**Editado (1) — hook existente:**

2. `src/hooks/useTypingPresence.ts`:
   - Adiciona prop opcional `remoteJid?: string`.
   - `const channelKey = remoteJid ?? conversationId;` — usa `typing:${channelKey}`.
   - Corrige typo histórico `oderId` → `userId` no tipo `TypingUser`/`PresenceState` (interno, nenhum consumidor externo lê esses campos — confirmado no grep).
   - Logger `getLogger('TypingPresence')`.
   - Sem mudança de comportamento se `remoteJid` não for passado.

**Criados (2):**

3. `src/hooks/useContactTyping.ts` — hook leve read-only:
   - Assinatura: `useContactTyping(remoteJid?: string | null): boolean`.
   - Subscreve `supabase.channel(typing:${remoteJid}).on('broadcast', { event: 'contact_typing' }, ...)`.
   - Estado `boolean` com auto-clear em 5s (mesma lógica do hook completo, sem `presence`/`track`).
   - Defesa: retorna `false` e não subscreve se `remoteJid` for null/empty/`@broadcast`/`@g.us`.
   - Cleanup em `removeChannel` + `clearTimeout`.

4. `src/hooks/__tests__/useContactTyping.test.tsx` — vitest:
   - Mock `supabase.channel/on/subscribe/removeChannel`.
   - Casos: subscreve com `remoteJid` válido; ignora `null`/`@g.us`/`@broadcast`; broadcast com `isTyping=true` seta `true`; auto-clear depois de 5s; cleanup remove canal.

**Editados (3) — UI:**

5. `src/components/inbox/ChatPanel.tsx`:
   - `useTypingPresence({ conversationId: conversation.id, remoteJid: conversation.contact.id, ... })`.
   - Sem mais mudanças (header já consome `isContactTyping`).

6. `src/components/inbox/conversation-list/ConversationItem.tsx`:
   - `const isTyping = useContactTyping(conversation.contact.id);`
   - Onde renderiza preview da última mensagem (linha do `<p>` em ambos modos `compact` e expandido), envolve com:
     ```tsx
     {isTyping ? (
       <span className="text-primary text-[13px] flex items-center gap-1.5 italic">
         <TypingDots /> digitando…
       </span>
     ) : (
       <p className="...">{lastMessageContent}</p>
     )}
     ```
   - Reutiliza `TypingIndicatorCompact` ou cria `<TypingDots />` minúsculo inline (3 dots animados, ~40px) — provavelmente extrai um helper `TypingDots` de `TypingIndicator.tsx`.

7. `src/components/inbox/VirtualizedRealtimeList.tsx`:
   - Mesmo padrão: `const isTyping = useContactTyping(contactId);` e troca a `<p>` da linha 200-204 pelo bloco condicional acima.
   - Importa `useContactTyping`.

**Editado (1) — testes existentes:**

8. `src/hooks/__tests__/useTypingPresence.test.tsx`:
   - Adiciona caso: `remoteJid` sobrescreve `conversationId` na chave do canal (verifica via `supabase.channel` mock chamado com `'typing:5511...@s.whatsapp.net'`).

### Detalhes técnicos

- **Bus correto**: `supabase` (Lovable Cloud) — é o mesmo bus do webhook. `externalClient` não tem broadcast emitido pelo webhook.
- **Chave `remote_jid`**: estável entre webhook → preview → chat aberto. No FATOR X, `conversation.contact.id === remote_jid` (vide `derivedToConversationContact` em `evolutionAdapter.ts` linha 119).
- **Performance**: na lista, cada `ConversationItem` cria **um canal Supabase** — para 50 conversas visíveis isso é aceitável (Supabase aceita milhares de canais). Mitigação futura: canal único `typing:wpp2` agregado, mas fora de escopo.
- **Broadcast-defense**: hook ignora JIDs `@broadcast` e `@g.us` (memória `inbox/broadcast-defense`).
- **Auto-clear 5s**: sem novo `composing` em 5s, considera parou de digitar (consistente com `useTypingPresence` atual).
- **Compat legacy**: webhook emite no canal antigo `typing:${contact.id}` por enquanto — `team-chat` e fluxos com Lovable Cloud `contact.id` continuam funcionando até cleanup posterior.
- **Testes**: 6 novos casos no `useContactTyping`, 1 caso adicional em `useTypingPresence`, sem breaking change na API existente.

### Fora de escopo

- Não aglutinar broadcasts em canal único por instância (otimização futura).
- Não exibir "digitando…" no Kanban / módulos não-inbox.
- Não migrar `team-chat` para `remoteJid` (não tem WhatsApp).
- Não remover ainda o canal legado `typing:${contact.id}` — fica para um lote de cleanup quando o inbox legado sumir.

