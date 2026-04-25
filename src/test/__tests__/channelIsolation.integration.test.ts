import { describe, it, expect, vi } from 'vitest';

/**
 * Testes de integração: isolamento de canais realtime.
 *
 * Cenário-alvo: dois canais distintos com handlers `event: '*'` ouvindo
 * tabelas diferentes (ou filtros diferentes) NÃO podem receber eventos
 * cruzados. Isso replica o contrato real do supabase-js: cada `.channel(name)`
 * é isolado, e cada `.on('postgres_changes', { event, schema, table, filter })`
 * só dispara quando o payload bate com TODOS os critérios.
 *
 * O teste usa um broker in-memory que imita esse comportamento.
 */

// ─── Broker in-memory que imita supabase-js channels ──────────────────────────
type Evt = 'INSERT' | 'UPDATE' | 'DELETE';
interface Filter {
  event: Evt | '*';
  schema?: string;
  table?: string;
  filter?: string; // formato "col=eq.value"
}
interface Payload {
  schema: string;
  table: string;
  eventType: Evt;
  new?: Record<string, any>;
  old?: Record<string, any>;
}
interface Listener {
  filter: Filter;
  handler: (p: Payload) => void;
}

function createRealtimeBroker() {
  const channels = new Map<string, Listener[]>();

  function matches(f: Filter, p: Payload): boolean {
    if (f.event !== '*' && f.event !== p.eventType) return false;
    if (f.schema && f.schema !== p.schema) return false;
    if (f.table && f.table !== p.table) return false;
    if (f.filter) {
      // Suporta apenas "col=eq.value" — suficiente para teste.
      const m = f.filter.match(/^(\w+)=eq\.(.+)$/);
      if (!m) return false;
      const [, col, val] = m;
      const row = p.new ?? p.old ?? {};
      if (String(row[col]) !== val) return false;
    }
    return true;
  }

  function channel(name: string) {
    if (!channels.has(name)) channels.set(name, []);
    const listeners = channels.get(name)!;
    const builder: any = {
      on: vi.fn((_event: string, filter: Filter, handler: (p: Payload) => void) => {
        listeners.push({ filter, handler });
        return builder;
      }),
      subscribe: vi.fn(() => ({
        unsubscribe: () => channels.delete(name),
      })),
    };
    return builder;
  }

  function emit(p: Payload) {
    for (const listeners of channels.values()) {
      for (const l of listeners) {
        if (matches(l.filter, p)) l.handler(p);
      }
    }
  }

  return { channel, emit, _channels: channels };
}

// ─── Testes ───────────────────────────────────────────────────────────────────
describe('Integração: isolamento entre canais com event:"*"', () => {
  it('canais ouvindo TABELAS diferentes (* cada) não recebem eventos cruzados', () => {
    const broker = createRealtimeBroker();
    const onMessages = vi.fn();
    const onContacts = vi.fn();

    broker
      .channel('messages-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, onMessages)
      .subscribe();

    broker
      .channel('contacts-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'evolution_contacts' }, onContacts)
      .subscribe();

    broker.emit({ schema: 'public', table: 'messages', eventType: 'INSERT', new: { id: 1 } });
    broker.emit({ schema: 'public', table: 'messages', eventType: 'UPDATE', new: { id: 1 } });
    broker.emit({ schema: 'public', table: 'messages', eventType: 'DELETE', old: { id: 1 } });
    broker.emit({ schema: 'public', table: 'evolution_contacts', eventType: 'INSERT', new: { id: 'c1' } });

    expect(onMessages).toHaveBeenCalledTimes(3);
    expect(onContacts).toHaveBeenCalledTimes(1);
    // Garantia explícita: nenhuma chamada de onContacts veio de 'messages'
    for (const call of onContacts.mock.calls) {
      expect(call[0].table).toBe('evolution_contacts');
    }
    for (const call of onMessages.mock.calls) {
      expect(call[0].table).toBe('messages');
    }
  });

  it('canais ouvindo MESMA tabela com FILTROS diferentes (* cada) isolam por filtro', () => {
    const broker = createRealtimeBroker();
    const onAlice = vi.fn();
    const onBob = vi.fn();

    broker
      .channel('msgs-alice')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: 'agent_id=eq.alice' },
        onAlice,
      )
      .subscribe();

    broker
      .channel('msgs-bob')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: 'agent_id=eq.bob' },
        onBob,
      )
      .subscribe();

    broker.emit({ schema: 'public', table: 'messages', eventType: 'INSERT', new: { id: 1, agent_id: 'alice' } });
    broker.emit({ schema: 'public', table: 'messages', eventType: 'UPDATE', new: { id: 2, agent_id: 'bob' } });
    broker.emit({ schema: 'public', table: 'messages', eventType: 'DELETE', old: { id: 3, agent_id: 'carol' } });

    expect(onAlice).toHaveBeenCalledTimes(1);
    expect(onBob).toHaveBeenCalledTimes(1);
    expect(onAlice.mock.calls[0][0].new.agent_id).toBe('alice');
    expect(onBob.mock.calls[0][0].new.agent_id).toBe('bob');
  });

  it('canais em SCHEMAS diferentes (* cada) não cruzam', () => {
    const broker = createRealtimeBroker();
    const onPublic = vi.fn();
    const onPrivate = vi.fn();

    broker
      .channel('pub')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, onPublic)
      .subscribe();
    broker
      .channel('priv')
      .on('postgres_changes', { event: '*', schema: 'private', table: 'messages' }, onPrivate)
      .subscribe();

    broker.emit({ schema: 'public', table: 'messages', eventType: 'INSERT', new: { id: 1 } });
    broker.emit({ schema: 'private', table: 'messages', eventType: 'UPDATE', new: { id: 2 } });

    expect(onPublic).toHaveBeenCalledTimes(1);
    expect(onPrivate).toHaveBeenCalledTimes(1);
    expect(onPublic.mock.calls[0][0].schema).toBe('public');
    expect(onPrivate.mock.calls[0][0].schema).toBe('private');
  });

  it('canal com event:"*" recebe os 3 tipos; canal com event:"INSERT" só recebe INSERT (mesma tabela)', () => {
    const broker = createRealtimeBroker();
    const onAll = vi.fn();
    const onInsertOnly = vi.fn();

    broker
      .channel('all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, onAll)
      .subscribe();
    broker
      .channel('insert-only')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, onInsertOnly)
      .subscribe();

    broker.emit({ schema: 'public', table: 'messages', eventType: 'INSERT', new: { id: 1 } });
    broker.emit({ schema: 'public', table: 'messages', eventType: 'UPDATE', new: { id: 1 } });
    broker.emit({ schema: 'public', table: 'messages', eventType: 'DELETE', old: { id: 1 } });

    expect(onAll).toHaveBeenCalledTimes(3);
    expect(onInsertOnly).toHaveBeenCalledTimes(1);
    expect(onInsertOnly.mock.calls[0][0].eventType).toBe('INSERT');
  });

  it('múltiplos handlers no MESMO canal com filtros distintos roteiam corretamente', () => {
    const broker = createRealtimeBroker();
    const onMessages = vi.fn();
    const onContacts = vi.fn();

    broker
      .channel('shared')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, onMessages)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'evolution_contacts' }, onContacts)
      .subscribe();

    broker.emit({ schema: 'public', table: 'messages', eventType: 'INSERT', new: { id: 1 } });
    broker.emit({ schema: 'public', table: 'evolution_contacts', eventType: 'UPDATE', new: { id: 'c1' } });

    expect(onMessages).toHaveBeenCalledTimes(1);
    expect(onContacts).toHaveBeenCalledTimes(1);
    expect(onMessages.mock.calls[0][0].table).toBe('messages');
    expect(onContacts.mock.calls[0][0].table).toBe('evolution_contacts');
  });

  it('unsubscribe encerra apenas o canal alvo — outros continuam recebendo', () => {
    const broker = createRealtimeBroker();
    const onA = vi.fn();
    const onB = vi.fn();

    const subA = broker
      .channel('a')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, onA)
      .subscribe();
    broker
      .channel('b')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, onB)
      .subscribe();

    broker.emit({ schema: 'public', table: 'messages', eventType: 'INSERT', new: { id: 1 } });
    expect(onA).toHaveBeenCalledTimes(1);
    expect(onB).toHaveBeenCalledTimes(1);

    subA.unsubscribe();
    broker.emit({ schema: 'public', table: 'messages', eventType: 'UPDATE', new: { id: 2 } });
    expect(onA).toHaveBeenCalledTimes(1); // não recebeu mais nada
    expect(onB).toHaveBeenCalledTimes(2);
  });
});
