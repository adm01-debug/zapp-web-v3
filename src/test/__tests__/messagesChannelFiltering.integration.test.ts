import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Testes de integração: filtros por schema/table em supabase.channel()
 * impedem entrega indevida a handlers da tabela `messages`.
 *
 * Foco: handlers registrados para { schema: 'public', table: 'messages' }
 * NUNCA devem ser invocados quando o evento veio de outra tabela ou schema,
 * mesmo com event:'*'.
 *
 * Reusa um broker in-memory que imita supabase-js (filtragem por
 * event/schema/table/filter).
 */

type Evt = 'INSERT' | 'UPDATE' | 'DELETE';
interface Filter {
  event: Evt | '*';
  schema?: string;
  table?: string;
  filter?: string;
}
interface Payload {
  schema: string;
  table: string;
  eventType: Evt;
  new?: Record<string, any>;
  old?: Record<string, any>;
}

function createBroker() {
  const channels = new Map<string, Array<{ filter: Filter; handler: (p: Payload) => void }>>();

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
      on: vi.fn((_evt: string, filter: Filter, handler: (p: Payload) => void) => {
        listeners.push({ filter, handler });
        return builder;
      }),
      subscribe: vi.fn(() => ({ unsubscribe: () => channels.delete(name) })),
    };
    return builder;
  }

  function emit(p: Payload) {
    for (const listeners of channels.values()) {
      for (const l of listeners) if (matches(l.filter, p)) l.handler(p);
    }
  }

  return { channel, emit };
}

describe('Filtros schema+table protegem handlers de `messages`', () => {
  let broker: ReturnType<typeof createBroker>;
  let onMessages: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    broker = createBroker();
    onMessages = vi.fn();
    broker
      .channel('messages-watcher')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, onMessages)
      .subscribe();
  });

  it('eventos da tabela `evolution_contacts` NÃO chegam ao handler de messages', () => {
    broker.emit({ schema: 'public', table: 'evolution_contacts', eventType: 'INSERT', new: { id: 1 } });
    broker.emit({ schema: 'public', table: 'evolution_contacts', eventType: 'UPDATE', new: { id: 2 } });
    broker.emit({ schema: 'public', table: 'evolution_contacts', eventType: 'DELETE', old: { id: 3 } });
    expect(onMessages).not.toHaveBeenCalled();
  });

  it('eventos da tabela `evolution_deals` NÃO chegam', () => {
    broker.emit({ schema: 'public', table: 'evolution_deals', eventType: 'INSERT', new: { id: 1 } });
    expect(onMessages).not.toHaveBeenCalled();
  });

  it('eventos da tabela `failed_messages` (nome próximo) NÃO chegam', () => {
    // Proteção contra match "fuzzy" — nome contém "messages" mas é tabela diferente.
    broker.emit({ schema: 'public', table: 'failed_messages', eventType: 'INSERT', new: { id: 1 } });
    broker.emit({ schema: 'public', table: 'message_attachments', eventType: 'UPDATE', new: { id: 2 } });
    expect(onMessages).not.toHaveBeenCalled();
  });

  it('eventos do schema `private.messages` NÃO chegam ao handler de `public.messages`', () => {
    // Mesmo nome de tabela, schema diferente — isolamento estrito.
    broker.emit({ schema: 'private', table: 'messages', eventType: 'INSERT', new: { id: 1 } });
    broker.emit({ schema: 'auth', table: 'messages', eventType: 'UPDATE', new: { id: 2 } });
    expect(onMessages).not.toHaveBeenCalled();
  });

  it('rajada heterogênea: só os 2 eventos de public.messages chegam, demais 8 ficam isolados', () => {
    const noise: Payload[] = [
      { schema: 'public', table: 'evolution_contacts', eventType: 'INSERT', new: { id: 1 } },
      { schema: 'public', table: 'evolution_deals', eventType: 'UPDATE', new: { id: 2 } },
      { schema: 'public', table: 'failed_messages', eventType: 'INSERT', new: { id: 3 } },
      { schema: 'public', table: 'queues', eventType: 'DELETE', old: { id: 4 } },
      { schema: 'private', table: 'messages', eventType: 'INSERT', new: { id: 5 } },
      { schema: 'auth', table: 'users', eventType: 'UPDATE', new: { id: 6 } },
      { schema: 'public', table: 'profiles', eventType: 'INSERT', new: { id: 7 } },
      { schema: 'public', table: 'evolution_messages', eventType: 'INSERT', new: { id: 8 } },
    ];
    const real: Payload[] = [
      { schema: 'public', table: 'messages', eventType: 'INSERT', new: { id: 100 } },
      { schema: 'public', table: 'messages', eventType: 'UPDATE', new: { id: 101 } },
    ];
    [...noise, ...real].forEach((p) => broker.emit(p));

    expect(onMessages).toHaveBeenCalledTimes(2);
    for (const call of onMessages.mock.calls) {
      const p: Payload = call[0];
      expect(p.schema).toBe('public');
      expect(p.table).toBe('messages');
    }
  });

  it('handler com event:"INSERT" também respeita filtro de tabela (não recebe UPDATE de outra tabela)', () => {
    const onInsertOnly = vi.fn();
    broker
      .channel('messages-inserts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        onInsertOnly,
      )
      .subscribe();

    broker.emit({ schema: 'public', table: 'evolution_contacts', eventType: 'INSERT', new: { id: 1 } });
    broker.emit({ schema: 'public', table: 'messages', eventType: 'UPDATE', new: { id: 2 } });
    broker.emit({ schema: 'public', table: 'messages', eventType: 'INSERT', new: { id: 3 } });

    expect(onInsertOnly).toHaveBeenCalledTimes(1);
    expect(onInsertOnly.mock.calls[0][0]).toMatchObject({
      table: 'messages',
      eventType: 'INSERT',
    });
  });

  it('múltiplos canais paralelos: handler de messages ignora 100 eventos não-messages', () => {
    for (let i = 0; i < 100; i++) {
      broker.emit({
        schema: 'public',
        table: i % 2 === 0 ? 'evolution_contacts' : 'evolution_deals',
        eventType: (['INSERT', 'UPDATE', 'DELETE'] as const)[i % 3],
        new: { id: i },
      });
    }
    expect(onMessages).toHaveBeenCalledTimes(0);

    broker.emit({ schema: 'public', table: 'messages', eventType: 'INSERT', new: { id: 999 } });
    expect(onMessages).toHaveBeenCalledTimes(1);
  });
});
