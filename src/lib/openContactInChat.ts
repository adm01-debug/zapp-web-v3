/**
 * openContactInChat — utilitário centralizado para abrir o Inbox em um
 * contato específico e (opcionalmente) destacar uma mensagem.
 *
 * Usa o mesmo handshake já existente em `useContactsCRUD.openContactChat`:
 *  - `window.__pendingOpenContactId` cobre o "primeiro paint" do Inbox
 *    (caso o usuário ainda não tenha o módulo carregado).
 *  - Eventos `open-contact-chat` cobrem o caso "Inbox já montado".
 *
 * Adiciona dois campos opcionais:
 *  - `messageId` — id interno (`evolution_messages.id`) ou
 *    `external_id`/`message_id` que o `ChatPanel` deverá scrollar e
 *    destacar (ring temporário) assim que carregar a conversa.
 *  - `phone`     — quando o chamador só conhece o número, o handler
 *    do Inbox usará como fallback para resolver o contactId.
 *
 * Disparos repetidos por ~3 s garantem que a mensagem chegue mesmo se a
 * `RealtimeInboxView` ainda estiver carregando lazy.
 */
export interface OpenContactInChatOptions {
  contactId?: string;
  remoteJid?: string;
  phone?: string;
  messageId?: string;
}

export interface PendingChatTarget {
  contactId?: string;
  remoteJid?: string;
  phone?: string;
  messageId?: string;
}

declare global {
  interface Window {
    __pendingOpenContactId?: string;
    __pendingOpenChatTarget?: PendingChatTarget;
  }
}

export function openContactInChat(opts: OpenContactInChatOptions): void {
  if (typeof window === 'undefined') return;

  const target: PendingChatTarget = {
    contactId: opts.contactId,
    remoteJid: opts.remoteJid,
    phone: opts.phone,
    messageId: opts.messageId,
  };

  // Backwards-compat: o handshake antigo só conhece contactId.
  if (opts.contactId) window.__pendingOpenContactId = opts.contactId;
  window.__pendingOpenChatTarget = target;

  if (window.location.hash !== '#inbox') {
    window.location.hash = 'inbox';
  } else {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }

  let attempts = 0;
  const tryDispatch = () => {
    attempts++;
    window.dispatchEvent(
      new CustomEvent('open-contact-chat', {
        detail: { ...target, contactId: target.contactId },
      }),
    );
    if (attempts < 15) setTimeout(tryDispatch, 200);
  };
  setTimeout(tryDispatch, 150);
}
