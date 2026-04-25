import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Testes de integração: resiliência do dispatch realtime quando um handler
 * com event:'*' lança exceção.
 *
 * Garantias:
 *   1. Erro em UM handler NÃO impede a entrega aos demais (mesma rajada).
 *   2. Erro durante INSERT não bloqueia processamento subsequente de
 *      UPDATE e DELETE para o MESMO handler.
 *   3. Handlers async que rejeitam não derrubam o broker.
 *   4. Handler "ruim" continua sendo invocado (não é silenciosamente removido).
 *
 * Broker: imitação in-memory do supabase-js, com try/catch isolado por
 * handler — espelha o comportamento defensivo esperado de um dispatcher
 * realtime correto.
 */

type Evt = 'INSERT' | 'UPDATE' | 'DELETE';
interface Filter {
  event: Evt | '*';
  schema?: string;
  table?: string;
}
interface Payload {
  schema: string;
  table: string;
  eventType: Evt;
  new?: Record<string, any>;
  old?: Record<string, any>;
}

function createSafeBroker() {
  const channels = new Map<string, Array<{ filter: Filter; handler: (p: Payload) => unknown }>>();
  const dispatchErrors: Array<{ channel: string; error: unknown; payload: Payload }> = [];

  function matches(f: Filter, p: Payload): boolean {
    if (f.event !== '*' && f.event !== p.eventType) return false;
    if (f.schema && f.schema !== p.schema) return false;
    if (f.table && f.table !== p.table) return false;
    return true;
  }

  function channel(name: string) {
    if (!channels.has(name)) channels.set(name, []);
    const listeners = channels.get(name)!;
    const builder: any = {
      on: vi.fn((_evt: string, filter: Filter, handler: (p: Payload) => unknown) => {
        listeners.push({ filter, handler });
        return builder;
      }),
      subscribe: vi.fn(() => ({ unsubscribe: () => channels.delete(name) })),
    };
    return builder;
  }

  function emit(p: Payload) {
    for (const [name, listeners] of channels) {
      for (const l of listeners) {
        if (!matches(l.filter, p)) continue;
        try {
          const r = l.handler(p);
          // Se o handler é async, capturamos a rejection sem propagar.
          if (r && typeof (r as Promise<unknown>).then === 'function') {
            (r as Promise<unknown>).catch((err) =>
              dispatchErrors.push({ channel: name, error: err, payload: p }),
            );
          }
        } catch (err) {
          dispatchErrors.push({ channel: name, error: err, payload: p });
        }
      }
    }
  }

  return { channel, emit, getDispatchErrors: () => dispatchErrors };
}

describe('Resiliência do dispatch: handler com erro não derruba os demais', () => {
  let broker: ReturnType<typeof createSafeBroker>;

  beforeEach(() => {
    broker = createSafeBroker();
  });

  it('handler que lança em todo evento NÃO impede entrega aos outros 2 handlers', () => {
    const bad = vi.fn(() => {
      throw new Error('boom');
    });
    const goodA = vi.fn();
    const goodB = vi.fn();

    broker
      .channel('ch-bad')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, bad)
      .subscribe();
    broker
      .channel('ch-a')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, goodA)
      .subscribe();
    broker
      .channel('ch-b')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, goodB)
      .subscribe();

    expect(() =>
      broker.emit({ schema: 'public', table: 'messages', eventType: 'INSERT', new: { id: 1 } }),
    ).not.toThrow();

    expect(bad).toHaveBeenCalledTimes(1);
    expect(goodA).toHaveBeenCalledTimes(1);
    expect(goodB).toHaveBeenCalledTimes(1);
    expect(broker.getDispatchErrors()).toHaveLength(1);
    expect((broker.getDispatchErrors()[0].error as Error).message).toBe('boom');
  });

  it('erro em INSERT não bloqueia UPDATE e DELETE no MESMO handler', () => {
    const handler = vi.fn((p: Payload) => {
      if (p.eventType === 'INSERT') throw new Error('insert quebrou');
    });

    broker
      .channel('msgs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, handler)
      .subscribe();

    broker.emit({ schema: 'public', table: 'messages', eventType: 'INSERT', new: { id: 1 } });
    broker.emit({ schema: 'public', table: 'messages', eventType: 'UPDATE', new: { id: 1 } });
    broker.emit({ schema: 'public', table: 'messages', eventType: 'DELETE', old: { id: 1 } });

    expect(handler).toHaveBeenCalledTimes(3);
    const types = handler.mock.calls.map((c) => (c[0] as Payload).eventType);
    expect(types).toEqual(['INSERT', 'UPDATE', 'DELETE']);
    expect(broker.getDispatchErrors()).toHaveLength(1);
  });

  it('handler async que REJEITA não derruba broker nem outros handlers', async () => {
    const asyncBad = vi.fn(async () => {
      throw new Error('async boom');
    });
    const sync = vi.fn();

    broker
      .channel('async-bad')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, asyncBad)
      .subscribe();
    broker
      .channel('sync-good')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, sync)
      .subscribe();

    broker.emit({ schema: 'public', table: 'messages', eventType: 'UPDATE', new: { id: 1 } });
    // Aguarda microtasks para que a rejection seja capturada.
    await Promise.resolve();
    await Promise.resolve();

    expect(asyncBad).toHaveBeenCalledTimes(1);
    expect(sync).toHaveBeenCalledTimes(1);
    expect(broker.getDispatchErrors()).toHaveLength(1);
    expect((broker.getDispatchErrors()[0].error as Error).message).toBe('async boom');
  });

  it('handler ruim NÃO é removido após erro: continua recebendo eventos seguintes', () => {
    let count = 0;
    const flaky = vi.fn(() => {
      count++;
      if (count === 1 || count === 3) throw new Error(`fail ${count}`);
    });

    broker
      .channel('flaky')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, flaky)
      .subscribe();

    for (let i = 0; i < 5; i++) {
      broker.emit({
        schema: 'public',
        table: 'messages',
        eventType: 'INSERT',
        new: { id: i },
      });
    }

    expect(flaky).toHaveBeenCalledTimes(5); // nenhuma chamada perdida
    expect(broker.getDispatchErrors()).toHaveLength(2); // 2 falhas (chamadas 1 e 3)
  });

  it('rajada de 3 eventos × 4 handlers (1 ruim) → 12 invocações, 3 erros, dispatch íntegro', () => {
    const bad = vi.fn(() => {
      throw new Error('always');
    });
    const a = vi.fn();
    const b = vi.fn();
    const c = vi.fn();

    broker.channel('bad').on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, bad).subscribe();
    broker.channel('a').on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, a).subscribe();
    broker.channel('b').on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, b).subscribe();
    broker.channel('c').on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, c).subscribe();

    broker.emit({ schema: 'public', table: 'messages', eventType: 'INSERT', new: { id: 1 } });
    broker.emit({ schema: 'public', table: 'messages', eventType: 'UPDATE', new: { id: 1 } });
    broker.emit({ schema: 'public', table: 'messages', eventType: 'DELETE', old: { id: 1 } });

    expect(bad).toHaveBeenCalledTimes(3);
    expect(a).toHaveBeenCalledTimes(3);
    expect(b).toHaveBeenCalledTimes(3);
    expect(c).toHaveBeenCalledTimes(3);
    expect(broker.getDispatchErrors()).toHaveLength(3);
    // Os 3 handlers bons recebem o ciclo INSERT/UPDATE/DELETE completo.
    for (const h of [a, b, c]) {
      const evts = h.mock.calls.map((cl) => (cl[0] as Payload).eventType);
      expect(evts).toEqual(['INSERT', 'UPDATE', 'DELETE']);
    }
  });

  it('erro de tipo "string" e null/undefined são capturados sem derrubar broker', () => {
    const throwString = vi.fn(() => {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw 'erro como string';
    });
    const throwNull = vi.fn(() => {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw null;
    });
    const good = vi.fn();

    broker.channel('s').on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, throwString).subscribe();
    broker.channel('n').on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, throwNull).subscribe();
    broker.channel('ok').on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, good).subscribe();

    expect(() =>
      broker.emit({ schema: 'public', table: 'messages', eventType: 'UPDATE', new: { id: 1 } }),
    ).not.toThrow();

    expect(good).toHaveBeenCalledTimes(1);
    expect(broker.getDispatchErrors()).toHaveLength(2);
    expect(broker.getDispatchErrors().map((e) => e.error)).toEqual(['erro como string', null]);
  });
});
