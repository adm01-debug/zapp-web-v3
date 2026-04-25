import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMessageUpdateBatcher } from '../useMessageUpdateBatcher';
import type {
  ConversationWithMessages,
  RealtimeMessage,
} from '@/hooks/useRealtimeMessages';

function makeMessage(overrides: Partial<RealtimeMessage> = {}): RealtimeMessage {
  return {
    id: 'msg-1',
    contact_id: 'contact-1',
    agent_id: null,
    content: 'audio',
    sender: 'agent',
    message_type: 'audio',
    media_url: null,
    is_read: true,
    status: 'read',
    status_updated_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 60_000).toISOString(),
    updated_at: new Date().toISOString(),
    external_id: null,
    whatsapp_connection_id: null,
    transcription: null,
    transcription_status: null,
    is_deleted: false,
    ...overrides,
  };
}

function makeConv(message: RealtimeMessage): ConversationWithMessages {
  return {
    contact: {
      id: 'contact-1',
      name: 'Alice',
      surname: null, nickname: null, phone: '+55', email: null,
      avatar_url: null, tags: null, company: null, job_title: null,
      assigned_to: null, queue_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      whatsapp_connection_id: null, contact_type: null,
      group_category: null, ai_sentiment: null,
    },
    messages: [message],
    unreadCount: 0,
    lastMessage: message,
  };
}

describe('useMessageUpdateBatcher — read → played fast-path', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('faz flush IMEDIATO (sem aguardar 100ms) quando status muda para played', () => {
    const initial = makeMessage({ status: 'read' });
    const conversationsRef = { current: [makeConv(initial)] };
    const commits: ConversationWithMessages[][] = [];
    const commit = (updater: (prev: ConversationWithMessages[]) => ConversationWithMessages[]) => {
      const next = updater(conversationsRef.current);
      conversationsRef.current = next;
      commits.push(next);
    };
    const hydrate = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useMessageUpdateBatcher(conversationsRef, commit, hydrate)
    );

    const playedPayload = {
      new: makeMessage({ status: 'played' }),
      old: initial,
      eventType: 'UPDATE' as const,
      schema: 'public',
      table: 'messages',
      commit_timestamp: '',
      errors: [],
    };

    act(() => {
      // payload shape compatível para o handler
      result.current.handleMessageUpdate(playedPayload);
    });

    // Sem avançar timers: o flush deve ter ocorrido sincronamente.
    expect(commits.length).toBe(1);
    expect(commits[0][0].messages[0].status).toBe('played');
    expect(commits[0][0].lastMessage?.status).toBe('played');
  });

  it('mantém debounce padrão (100ms) para mudanças que NÃO são para played', () => {
    const initial = makeMessage({ status: 'sent' });
    const conversationsRef = { current: [makeConv(initial)] };
    const commits: ConversationWithMessages[][] = [];
    const commit = (updater: (prev: ConversationWithMessages[]) => ConversationWithMessages[]) => {
      const next = updater(conversationsRef.current);
      conversationsRef.current = next;
      commits.push(next);
    };
    const hydrate = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useMessageUpdateBatcher(conversationsRef, commit, hydrate)
    );

    const deliveredPayload = {
      new: makeMessage({ status: 'delivered' }),
      old: initial,
      eventType: 'UPDATE' as const,
      schema: 'public', table: 'messages', commit_timestamp: '', errors: [],
    };

    act(() => {
      // payload shape compatível para o handler
      result.current.handleMessageUpdate(deliveredPayload);
    });
    // Antes do timer: nada commitado.
    expect(commits.length).toBe(0);

    act(() => { vi.advanceTimersByTime(100); });
    expect(commits.length).toBe(1);
    expect(commits[0][0].messages[0].status).toBe('delivered');
  });

  it('NÃO dispara fast-path se a mensagem já estava como played', () => {
    const initial = makeMessage({ status: 'played' });
    const conversationsRef = { current: [makeConv(initial)] };
    const commits: ConversationWithMessages[][] = [];
    const commit = (updater: (prev: ConversationWithMessages[]) => ConversationWithMessages[]) => {
      const next = updater(conversationsRef.current);
      conversationsRef.current = next;
      commits.push(next);
    };
    const hydrate = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useMessageUpdateBatcher(conversationsRef, commit, hydrate)
    );

    act(() => {
      // payload shape compatível para o handler
      result.current.handleMessageUpdate({
        new: makeMessage({ status: 'played', updated_at: new Date().toISOString() }),
        old: initial,
        eventType: 'UPDATE', schema: 'public', table: 'messages',
        commit_timestamp: '', errors: [],
      });
    });

    // Sem flush imediato — entrou no caminho debounced normal.
    expect(commits.length).toBe(0);
    act(() => { vi.advanceTimersByTime(100); });
    expect(commits.length).toBe(1);
  });
});
