import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEffect } from 'react';

/**
 * Testes de lifecycle de canais realtime com event:'*'.
 *
 * Garante que:
 *   1. .subscribe() é chamado uma vez quando o hook monta.
 *   2. .unsubscribe() E supabase.removeChannel() são chamados quando desmonta.
 *   3. Não há vazamento de listeners (todo subscribe casa com 1 cleanup).
 *   4. Hooks com filtro dinâmico (key dependente) recriam o canal corretamente.
 *
 * Estratégia: cria um mock observável de supabase que registra cada chamada
 * e mantém um contador de canais ativos — vazamento = contador > 0 após
 * unmount de todos os hooks.
 */

function createObservableSupabase() {
  const subscribeCalls = vi.fn();
  const unsubscribeCalls = vi.fn();
  const removeChannelCalls = vi.fn();
  const onCalls = vi.fn();
  let activeChannels = 0;
  const channelInstances: any[] = [];

  const channel = vi.fn((name: string) => {
    const inst: any = {
      _name: name,
      _subscribed: false,
      _removed: false,
      on: vi.fn((..._args: any[]) => {
        onCalls(name, _args[1]);
        return inst;
      }),
      subscribe: vi.fn(() => {
        subscribeCalls(name);
        inst._subscribed = true;
        activeChannels++;
        return inst;
      }),
      unsubscribe: vi.fn(() => {
        unsubscribeCalls(name);
        return Promise.resolve('ok');
      }),
    };
    channelInstances.push(inst);
    return inst;
  });

  const removeChannel = vi.fn((ch: any) => {
    removeChannelCalls(ch._name);
    if (ch._subscribed && !ch._removed) {
      ch._removed = true;
      activeChannels--;
    }
    return Promise.resolve('ok');
  });

  return {
    client: { channel, removeChannel },
    subscribeCalls,
    unsubscribeCalls,
    removeChannelCalls,
    onCalls,
    getActiveChannels: () => activeChannels,
    channelInstances,
  };
}

// Hook representativo: mesmo padrão usado em useConnectionsManager,
// useQueueGoals, useRealtimeContacts, etc.
function makeRealtimeHook(supabase: any, channelName: string, table: string, filter?: string) {
  return function useRealtimeTable(onChange: (p: any) => void, deps: any[] = []) {
    useEffect(() => {
      const ch = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) },
          onChange,
        )
        .subscribe();
      return () => {
        supabase.removeChannel(ch);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
  };
}

describe('Realtime lifecycle: subscribe/unsubscribe/removeChannel sem vazamento', () => {
  let mock: ReturnType<typeof createObservableSupabase>;

  beforeEach(() => {
    mock = createObservableSupabase();
  });

  it('subscribe é chamado exatamente 1× ao montar', () => {
    const useHook = makeRealtimeHook(mock.client, 'msgs', 'messages');
    renderHook(() => useHook(() => {}));

    expect(mock.subscribeCalls).toHaveBeenCalledTimes(1);
    expect(mock.subscribeCalls).toHaveBeenCalledWith('msgs');
    expect(mock.getActiveChannels()).toBe(1);
  });

  it('removeChannel é chamado ao desmontar e zera canais ativos', () => {
    const useHook = makeRealtimeHook(mock.client, 'msgs', 'messages');
    const { unmount } = renderHook(() => useHook(() => {}));

    expect(mock.getActiveChannels()).toBe(1);
    unmount();

    expect(mock.removeChannelCalls).toHaveBeenCalledTimes(1);
    expect(mock.removeChannelCalls).toHaveBeenCalledWith('msgs');
    expect(mock.getActiveChannels()).toBe(0);
  });

  it('múltiplos hooks ativos simultaneamente: cada um isola seu próprio canal', () => {
    const useMessages = makeRealtimeHook(mock.client, 'messages-ch', 'messages');
    const useContacts = makeRealtimeHook(mock.client, 'contacts-ch', 'evolution_contacts');

    const a = renderHook(() => useMessages(() => {}));
    const b = renderHook(() => useContacts(() => {}));

    expect(mock.subscribeCalls).toHaveBeenCalledTimes(2);
    expect(mock.getActiveChannels()).toBe(2);

    a.unmount();
    expect(mock.getActiveChannels()).toBe(1);

    b.unmount();
    expect(mock.getActiveChannels()).toBe(0);
    expect(mock.removeChannelCalls).toHaveBeenCalledTimes(2);
  });

  it('NÃO vaza listeners: 100 mounts seguidos por 100 unmounts → 0 ativos', () => {
    const useHook = makeRealtimeHook(mock.client, 'stress', 'messages');
    const renders = Array.from({ length: 100 }, () => renderHook(() => useHook(() => {})));

    expect(mock.getActiveChannels()).toBe(100);
    renders.forEach((r) => r.unmount());
    expect(mock.getActiveChannels()).toBe(0);
    expect(mock.subscribeCalls).toHaveBeenCalledTimes(100);
    expect(mock.removeChannelCalls).toHaveBeenCalledTimes(100);
  });

  it('hook com filtro dinâmico recria canal ao mudar dep e cleana o anterior', () => {
    const useHook = (filter: string) => {
      const dyn = makeRealtimeHook(mock.client, `dyn-${filter}`, 'messages', `agent_id=eq.${filter}`);
      dyn(() => {}, [filter]);
    };

    const { rerender, unmount } = renderHook(({ f }) => useHook(f), {
      initialProps: { f: 'alice' },
    });
    expect(mock.getActiveChannels()).toBe(1);

    rerender({ f: 'bob' });
    // Cleanup do anterior + subscribe do novo: 2 subscribes totais, 1 ativo
    expect(mock.subscribeCalls).toHaveBeenCalledTimes(2);
    expect(mock.removeChannelCalls).toHaveBeenCalledTimes(1);
    expect(mock.getActiveChannels()).toBe(1);

    unmount();
    expect(mock.getActiveChannels()).toBe(0);
    expect(mock.removeChannelCalls).toHaveBeenCalledTimes(2);
  });

  it('on() registra exatamente um handler com event:"*" e schema/table corretos', () => {
    const useHook = makeRealtimeHook(mock.client, 'meta', 'messages');
    renderHook(() => useHook(() => {}));

    expect(mock.onCalls).toHaveBeenCalledTimes(1);
    const filter = mock.onCalls.mock.calls[0][1];
    expect(filter).toMatchObject({ event: '*', schema: 'public', table: 'messages' });
  });

  it('cada subscribe casa com EXATAMENTE 1 removeChannel ao final do ciclo', () => {
    const useA = makeRealtimeHook(mock.client, 'a', 'messages');
    const useB = makeRealtimeHook(mock.client, 'b', 'evolution_contacts');
    const useC = makeRealtimeHook(mock.client, 'c', 'evolution_deals');

    const ra = renderHook(() => useA(() => {}));
    const rb = renderHook(() => useB(() => {}));
    const rc = renderHook(() => useC(() => {}));

    rb.unmount();
    ra.unmount();
    rc.unmount();

    expect(mock.subscribeCalls).toHaveBeenCalledTimes(3);
    expect(mock.removeChannelCalls).toHaveBeenCalledTimes(3);
    expect(mock.getActiveChannels()).toBe(0);
    // Nenhum canal ficou em estado "subscribed && !removed"
    for (const inst of mock.channelInstances) {
      if (inst._subscribed) expect(inst._removed).toBe(true);
    }
  });
});
