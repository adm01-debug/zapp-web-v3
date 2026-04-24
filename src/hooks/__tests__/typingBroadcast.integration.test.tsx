/**
 * Teste de integração: garante que um único broadcast `contact_typing` no canal
 * `typing:${remote_jid}` propaga simultaneamente para os dois consumidores que
 * existem hoje no inbox:
 *
 *  - ConversationItem (sidebar)  → usa `useContactTyping(remoteJid)`
 *  - ChatPanelHeader (chat aberto) → usa `useTypingPresence({ remoteJid })`
 *
 * Ambos assinam o MESMO canal Supabase (`typing:${jid}`). Este teste mocka
 * o cliente Supabase com um registry por nome de canal — qualquer chamada a
 * `supabase.channel('typing:X')` retorna a mesma instância, e qualquer
 * broadcast disparado no registry é entregue a TODOS os handlers registrados.
 *
 * Verificamos que, após disparar um único broadcast `{ isTyping: true }`,
 * ambos os hooks reportam o estado dentro da mesma janela de tempo (sync,
 * mesmo tick), simulando exatamente o que o webhook Evolution faz em produção.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Registry compartilhado: { [channelName]: { handlers, channelObj } }
type BroadcastHandler = (args: { payload: unknown }) => void;
interface MockChannel {
  name: string;
  handlers: BroadcastHandler[];
  on: (evt: string, filter: { event: string }, cb: BroadcastHandler) => MockChannel;
  subscribe: (cb?: (status: string) => void) => MockChannel;
  track: () => Promise<void>;
  untrack: () => Promise<void>;
  unsubscribe: () => void;
  presenceState: () => Record<string, unknown>;
}

const channelRegistry = new Map<string, MockChannel>();

function getOrCreateChannel(name: string): MockChannel {
  const existing = channelRegistry.get(name);
  if (existing) return existing;
  const channel: MockChannel = {
    name,
    handlers: [],
    on(evt, filter, cb) {
      // Registra apenas handlers de broadcast `contact_typing` (ignora presence/join/leave)
      if (evt === 'broadcast' && filter?.event === 'contact_typing') {
        this.handlers.push(cb);
      }
      return this;
    },
    subscribe(cb) {
      cb?.('SUBSCRIBED');
      return this;
    },
    track: async () => {},
    untrack: async () => {},
    unsubscribe: () => {},
    presenceState: () => ({}),
  };
  channelRegistry.set(name, channel);
  return channel;
}

/** Dispara um broadcast `contact_typing` para todos os assinantes do canal */
function emitContactTyping(channelName: string, payload: { isTyping: boolean }) {
  const ch = channelRegistry.get(channelName);
  if (!ch) throw new Error(`No channel registered for ${channelName}`);
  for (const handler of ch.handlers) {
    handler({ payload });
  }
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: vi.fn((name: string) => getOrCreateChannel(name)),
    removeChannel: vi.fn((ch: MockChannel) => {
      channelRegistry.delete(ch.name);
    }),
  },
}));

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  getLogger: () => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() }),
}));

import { useContactTyping } from '@/hooks/useContactTyping';
import { useTypingPresence } from '@/hooks/useTypingPresence';

const REMOTE_JID = '5511999990001@s.whatsapp.net';

describe('Typing broadcast integration — ConversationItem ↔ ChatPanelHeader', () => {
  beforeEach(() => {
    channelRegistry.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('um único broadcast atualiza ConversationItem e ChatPanelHeader na mesma janela', () => {
    // Sidebar (ConversationItem) — assina via useContactTyping
    const sidebar = renderHook(() => useContactTyping(REMOTE_JID));

    // Chat aberto (ChatPanelHeader) — assina via useTypingPresence com mesmo remote_jid
    const header = renderHook(() =>
      useTypingPresence({
        conversationId: 'conv-internal-id',
        currentUserId: 'agent-1',
        currentUserName: 'Agente',
        remoteJid: REMOTE_JID,
      }),
    );

    // Ambos devem ter assinado o MESMO canal (chave estável por remote_jid)
    const channel = channelRegistry.get(`typing:${REMOTE_JID}`);
    expect(channel).toBeDefined();
    // 2 assinantes: 1 do useContactTyping + 1 do useTypingPresence
    expect(channel!.handlers.length).toBe(2);

    // Estado inicial: ambos em false
    expect(sidebar.result.current).toBe(false);
    expect(header.result.current.isContactTyping).toBe(false);

    // Webhook dispara UM broadcast — entrega síncrona aos dois handlers
    act(() => {
      emitContactTyping(`typing:${REMOTE_JID}`, { isTyping: true });
    });

    // Mesma janela de tempo (mesmo tick): ambos reportam true
    expect(sidebar.result.current).toBe(true);
    expect(header.result.current.isContactTyping).toBe(true);
  });

  it('broadcast de stop (isTyping=false) limpa ambos respeitando o debounce', () => {
    const sidebar = renderHook(() => useContactTyping(REMOTE_JID));
    const header = renderHook(() =>
      useTypingPresence({
        conversationId: 'conv-internal-id',
        currentUserId: 'agent-1',
        currentUserName: 'Agente',
        remoteJid: REMOTE_JID,
      }),
    );

    // START
    act(() => {
      emitContactTyping(`typing:${REMOTE_JID}`, { isTyping: true });
    });
    expect(sidebar.result.current).toBe(true);
    expect(header.result.current.isContactTyping).toBe(true);

    // STOP — useTypingPresence aplica imediatamente (sem debounce);
    // useContactTyping aguarda TYPING_STOP_DEBOUNCE_MS (default 600ms).
    act(() => {
      emitContactTyping(`typing:${REMOTE_JID}`, { isTyping: false });
    });

    // Header limpa imediatamente
    expect(header.result.current.isContactTyping).toBe(false);
    // Sidebar ainda true (dentro da janela de debounce)
    expect(sidebar.result.current).toBe(true);

    // Avança o relógio além do stop-debounce do useContactTyping (~600ms default)
    act(() => {
      vi.advanceTimersByTime(700);
    });

    // Agora ambos estão alinhados em false
    expect(sidebar.result.current).toBe(false);
    expect(header.result.current.isContactTyping).toBe(false);
  });

  it('broadcast em canal diferente NÃO afeta os assinantes do canal aberto', () => {
    const sidebar = renderHook(() => useContactTyping(REMOTE_JID));
    const header = renderHook(() =>
      useTypingPresence({
        conversationId: 'conv-internal-id',
        currentUserId: 'agent-1',
        currentUserName: 'Agente',
        remoteJid: REMOTE_JID,
      }),
    );

    // Garante que o canal "outro contato" exista no registry para podermos emitir
    renderHook(() => useContactTyping('5511888880002@s.whatsapp.net'));

    act(() => {
      emitContactTyping('typing:5511888880002@s.whatsapp.net', { isTyping: true });
    });

    // Nenhum dos dois consumidores do contato aberto deve reagir
    expect(sidebar.result.current).toBe(false);
    expect(header.result.current.isContactTyping).toBe(false);
  });
});
