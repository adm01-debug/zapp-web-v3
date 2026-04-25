import { describe, it, expect } from 'vitest';
import {
  mergeRealtimeMessages,
  compareMessages,
  maxCreatedAt,
} from '@/lib/inbox/mergeRealtimeMessages';

const m = (id: string, created_at: string) => ({ id, created_at });

describe('mergeRealtimeMessages', () => {
  it('ordena por created_at asc e usa id como tiebreaker estável', () => {
    const prev = [m('b', '2026-04-25T10:00:01Z'), m('a', '2026-04-25T10:00:01Z')];
    const merged = mergeRealtimeMessages([], prev) as typeof prev;
    expect(merged.map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('dedupa por id (incoming wins) preservando o registro mais recente', () => {
    const old = m('x', '2026-04-25T10:00:00Z');
    const updated = { ...old, status: 'delivered' as const };
    const merged = mergeRealtimeMessages([old], [updated]) as Array<typeof old>;
    expect(merged.length).toBe(1);
    expect(merged[0]).toBe(updated);
  });

  it('older + poll chegando fora de ordem produzem o mesmo resultado final', () => {
    const initial = [m('m3', '2026-04-25T10:00:03Z'), m('m4', '2026-04-25T10:00:04Z')];
    // older recebido depois (timestamps anteriores)
    const older = [m('m1', '2026-04-25T10:00:01Z'), m('m2', '2026-04-25T10:00:02Z')];
    // poll recebido depois (timestamps posteriores)
    const poll = [m('m5', '2026-04-25T10:00:05Z')];

    const a = mergeRealtimeMessages(mergeRealtimeMessages(initial, older), poll) as ReturnType<typeof m>[];
    // Ordem trocada de aplicação: poll antes de older.
    const b = mergeRealtimeMessages(mergeRealtimeMessages(initial, poll), older) as ReturnType<typeof m>[];

    expect(a.map((x) => x.id)).toEqual(['m1', 'm2', 'm3', 'm4', 'm5']);
    expect(a).toEqual(b); // determinístico independente da ordem de chegada
  });

  it('preserva referência quando incoming está vazio ou tudo já existe', () => {
    const prev = [m('a', '2026-04-25T10:00:00Z')];
    expect(mergeRealtimeMessages(prev, [])).toBe(prev);
    // Mesmo objeto: nada muda.
    expect(mergeRealtimeMessages(prev, [prev[0]])).toBe(prev);
  });

  it('compareMessages é total e estável para timestamps iguais', () => {
    const arr = [m('z', '2026-04-25T10:00:00Z'), m('a', '2026-04-25T10:00:00Z'), m('m', '2026-04-25T10:00:00Z')];
    const sorted = arr.slice().sort(compareMessages);
    expect(sorted.map((x) => x.id)).toEqual(['a', 'm', 'z']);
  });

  it('maxCreatedAt devolve o timestamp do registro mais recente mesmo sem ordenação prévia', () => {
    const arr = [m('a', '2026-04-25T10:00:05Z'), m('b', '2026-04-25T10:00:01Z'), m('c', '2026-04-25T10:00:09Z')];
    expect(maxCreatedAt(arr)).toBe('2026-04-25T10:00:09Z');
    expect(maxCreatedAt([])).toBeNull();
  });

  it('aceita created_at em formatos heterogêneos (ISO, Date, epoch)', () => {
    const a = { id: 'a', created_at: '2026-04-25T10:00:01Z' };
    const b = { id: 'b', created_at: new Date('2026-04-25T10:00:02Z') };
    const c = { id: 'c', created_at: Date.parse('2026-04-25T10:00:03Z') };
    const merged = mergeRealtimeMessages([], [c, a, b]) as Array<{ id: string }>;
    expect(merged.map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });
});
