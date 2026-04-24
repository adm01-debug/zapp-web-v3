import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Integracao: garante que o fan-out simulado de supabase.channel() entrega
 * INSERT, UPDATE e DELETE corretamente para handlers que assinam `event: '*'`,
 * e que handlers especificos so recebem o evento declarado.
 *
 * Espelha o contrato do supabase-js: cada chamada `.on('postgres_changes', cfg, handler)`
 * registra um listener filtrado pelo `cfg.event`. '*' = todos.
 */

type Evt = 'INSERT' | 'UPDATE' | 'DELETE';

interface Listener {
  cfg: { event: Evt | '*'; schema?: string; table?: string; filter?: string };
  handler: (payload: any) => void;
}

// Fabrica um canal mock com dispatcher por evento. Reusavel em qualquer teste.
function createChannelMock() {
  const listeners: Listener[] = [];
  const channel: any = {
    on: vi.fn((_topic: 'postgres_changes', cfg: any, handler: any) => {
      listeners.push({ cfg, handler });
      return channel;
    }),
    subscribe: vi.fn((cb?: (s: string) => void) => {
      cb?.('SUBSCRIBED');
      return channel;
    }),
    unsubscribe: vi.fn(),
  };
  function emit(event: Evt, payload: { new?: any; old?: any; table?: string }) {
    for (const { cfg, handler } of listeners) {
      if (cfg.table && payload.table && cfg.table !== payload.table) continue;
      if (cfg.event === '*' || cfg.event === event) {
        handler({ eventType: event, ...payload });
      }
    }
  }
  return { channel, emit, listeners };
}

const channelFactory = vi.fn();
const removeChannel = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: (...args: any[]) => channelFactory(...args),
    removeChannel: (...args: any[]) => removeChannel(...args),
  },
}));

// Hook de exemplo que assina event:'*' — representa o padrao usado em
// useEvolutionMonitoring, useFailedMessages, useNotifications etc.
function useWildcardMessages() {
  const [events, setEvents] = useState<Array<{ type: Evt; id: string }>>([]);
  useEffect(() => {
    const { supabase } = require('@/integrations/supabase/client');
    const ch = supabase
      .channel('wildcard-messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload: any) => {
          const row = payload.new ?? payload.old;
          setEvents((prev) => [...prev, { type: payload.eventType, id: row.id }]);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  return events;
}

// Hook de exemplo com tres listeners separados (espelha useMessages).
function useSpecificMessages() {
  const [log, setLog] = useState<string[]>([]);
  useEffect(() => {
    const { supabase } = require('@/integrations/supabase/client');
    const ch = supabase
      .channel('specific-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
        (p: any) => setLog((prev) => [...prev, `INSERT:${p.new.id}`]))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' },
        (p: any) => setLog((prev) => [...prev, `UPDATE:${p.new.id}`]))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' },
        (p: any) => setLog((prev) => [...prev, `DELETE:${p.old.id}`]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  return log;
}

describe('integracao: mapeamento final de eventos "*" em supabase.channel()', () => {
  let mock: ReturnType<typeof createChannelMock>;

  beforeEach(() => {
    vi.clearAllMocks();
    mock = createChannelMock();
    channelFactory.mockReturnValue(mock.channel);
  });

  it('hook com event:"*" recebe INSERT, UPDATE e DELETE no mesmo handler', () => {
    const { result } = renderHook(() => useWildcardMessages());

    expect(mock.listeners).toHaveLength(1);
    expect(mock.listeners[0].cfg.event).toBe('*');

    act(() => { mock.emit('INSERT', { new: { id: 'm1' }, table: 'messages' }); });
    act(() => { mock.emit('UPDATE', { new: { id: 'm2' }, old: { id: 'm2' }, table: 'messages' }); });
    act(() => { mock.emit('DELETE', { old: { id: 'm3' }, table: 'messages' }); });

    expect(result.current).toEqual([
      { type: 'INSERT', id: 'm1' },
      { type: 'UPDATE', id: 'm2' },
      { type: 'DELETE', id: 'm3' },
    ]);
  });

  it('hook com listeners separados so recebe o evento que declarou', () => {
    const { result } = renderHook(() => useSpecificMessages());

    expect(mock.listeners.map((l) => l.cfg.event)).toEqual(['INSERT', 'UPDATE', 'DELETE']);

    act(() => { mock.emit('INSERT', { new: { id: 'a' }, table: 'messages' }); });
    act(() => { mock.emit('UPDATE', { new: { id: 'b' }, table: 'messages' }); });
    act(() => { mock.emit('DELETE', { old: { id: 'c' }, table: 'messages' }); });

    expect(result.current).toEqual(['INSERT:a', 'UPDATE:b', 'DELETE:c']);
  });

  it('eventos para outras tabelas nao sao entregues a handlers de "messages"', () => {
    const { result } = renderHook(() => useWildcardMessages());
    act(() => { mock.emit('INSERT', { new: { id: 'x' }, table: 'contacts' }); });
    act(() => { mock.emit('UPDATE', { new: { id: 'y' }, table: 'profiles' }); });
    expect(result.current).toEqual([]);
  });

  it('"*" entrega na ordem de chegada e preserva payloads new/old', () => {
    const { result } = renderHook(() => useWildcardMessages());
    const sequence: Array<[Evt, any]> = [
      ['UPDATE', { new: { id: '1', status: 'sent' }, old: { id: '1', status: null }, table: 'messages' }],
      ['INSERT', { new: { id: '2' }, table: 'messages' }],
      ['DELETE', { old: { id: '1' }, table: 'messages' }],
      ['UPDATE', { new: { id: '2', status: 'read' }, old: { id: '2', status: 'sent' }, table: 'messages' }],
    ];
    sequence.forEach(([e, p]) => act(() => { mock.emit(e, p); }));
    expect(result.current.map((e) => e.type)).toEqual(['UPDATE', 'INSERT', 'DELETE', 'UPDATE']);
    expect(result.current.map((e) => e.id)).toEqual(['1', '2', '1', '2']);
  });

  it('cleanup chama removeChannel ao desmontar', () => {
    const { unmount } = renderHook(() => useWildcardMessages());
    unmount();
    expect(removeChannel).toHaveBeenCalledTimes(1);
    expect(removeChannel).toHaveBeenCalledWith(mock.channel);
  });

  it('multiplos hooks "*" coexistem e cada um recebe os 3 eventos', () => {
    // Cada hook precisa de seu proprio canal mock isolado.
    const a = createChannelMock();
    const b = createChannelMock();
    channelFactory
      .mockReturnValueOnce(a.channel)
      .mockReturnValueOnce(b.channel);

    const hookA = renderHook(() => useWildcardMessages());
    const hookB = renderHook(() => useWildcardMessages());

    act(() => { a.emit('INSERT', { new: { id: 'A1' }, table: 'messages' }); });
    act(() => { b.emit('DELETE', { old: { id: 'B1' }, table: 'messages' }); });
    act(() => { a.emit('UPDATE', { new: { id: 'A2' }, table: 'messages' }); });

    expect(hookA.result.current.map((e) => `${e.type}:${e.id}`)).toEqual(['INSERT:A1', 'UPDATE:A2']);
    expect(hookB.result.current.map((e) => `${e.type}:${e.id}`)).toEqual(['DELETE:B1']);
  });
});
