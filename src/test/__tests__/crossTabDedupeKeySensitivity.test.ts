/**
 * crossTabDedupe — Sensibilidade da chave de dedupe.
 *
 * Garantia central: o dedupe é estritamente por igualdade de string da chave.
 * Variações mínimas (1 caractere, sufixo de millisegundo, formato de data,
 * page size diferente, jid quase idêntico) NÃO podem colidir — caso contrário
 * uma página de mensagens "older" cairia em cima de outra, ou um poll com
 * cursor diferente reaproveitaria resultado obsoleto.
 *
 * Testes de cursor:
 *   - cursores de poll diferindo em 1ms → 2 fetches independentes.
 *   - cursores ISO equivalentes mas com formatos diferentes (Z vs +00:00,
 *     com/sem fração de segundo) NÃO devem colidir → 2 fetches.
 *   - mesma janela (mesmo cursor, mesmo jid) → 1 fetch só.
 *
 * Testes de identificadores adjacentes:
 *   - jids quase iguais (último dígito diferente) → 2 fetches.
 *   - pageSize diferente para o mesmo jid → 2 fetches.
 *
 * Cenários multi-aba (B chega depois de A) também validam: B não deve
 * receber resultado de A se sua chave diferir, mesmo que mínimo.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

type DedupeModule = typeof import('@/lib/realtime/crossTabDedupe');

async function loadTab(): Promise<DedupeModule> {
  vi.resetModules();
  return (await import('@/lib/realtime/crossTabDedupe')) as DedupeModule;
}

function clearAll() {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && (k.startsWith('ctd:lock:') || k.startsWith('ctd:result:') || k.startsWith('ctd:bus:'))) {
      keys.push(k);
    }
  }
  keys.forEach((k) => localStorage.removeItem(k));
}

describe('crossTabDedupe — chaves quase iguais NÃO compartilham fetch', () => {
  beforeEach(() => clearAll());
  afterEach(() => clearAll());

  it('cursores diferindo em 1ms produzem 2 fetches independentes (mesma aba)', async () => {
    const tab = await loadTab();
    const cursorA = '2026-04-25T22:00:00.000Z';
    const cursorB = '2026-04-25T22:00:00.001Z'; // +1ms
    const fetcher = vi.fn(async (cursor: string) => `data-for-${cursor}`);

    const [resA, resB] = await Promise.all([
      tab.dedupedFetch(`inbox:poll:jid1:${cursorA}`, () => fetcher(cursorA)),
      tab.dedupedFetch(`inbox:poll:jid1:${cursorB}`, () => fetcher(cursorB)),
    ]);

    expect(fetcher).toHaveBeenCalledTimes(2); // ← 2 chamadas, não 1
    expect(resA).toBe(`data-for-${cursorA}`);
    expect(resB).toBe(`data-for-${cursorB}`);

    tab.clearCrossTabDedupe();
  });

  it('mesmo timestamp em formatos ISO diferentes não compartilha (string-based)', async () => {
    const tab = await loadTab();
    // Equivalentes semanticamente, distintos como string:
    const cursors = [
      '2026-04-25T22:00:00Z',
      '2026-04-25T22:00:00.000Z',
      '2026-04-25T22:00:00+00:00',
    ];
    const fetcher = vi.fn(async (c: string) => `for:${c}`);
    const results = await Promise.all(
      cursors.map((c) => tab.dedupedFetch(`inbox:poll:jid:${c}`, () => fetcher(c))),
    );
    expect(fetcher).toHaveBeenCalledTimes(3); // 3 chaves distintas → 3 fetches
    expect(results).toEqual(cursors.map((c) => `for:${c}`));

    tab.clearCrossTabDedupe();
  });

  it('jids quase idênticos (último dígito) → 2 fetches independentes', async () => {
    const tab = await loadTab();
    const jid1 = '5511999999991@s.whatsapp.net';
    const jid2 = '5511999999992@s.whatsapp.net';
    const fetcher = vi.fn(async (j: string) => ({ jid: j }));

    const [r1, r2] = await Promise.all([
      tab.dedupedFetch(`inbox:initial:${jid1}:100`, () => fetcher(jid1)),
      tab.dedupedFetch(`inbox:initial:${jid2}:100`, () => fetcher(jid2)),
    ]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(r1).toEqual({ jid: jid1 });
    expect(r2).toEqual({ jid: jid2 });

    tab.clearCrossTabDedupe();
  });

  it('mesmo jid, pageSize diferente → 2 fetches (chaves distintas)', async () => {
    const tab = await loadTab();
    const fetcher = vi.fn(async (size: number) => Array(size).fill(0));
    const [r50, r100] = await Promise.all([
      tab.dedupedFetch('inbox:initial:jidX:50', () => fetcher(50)),
      tab.dedupedFetch('inbox:initial:jidX:100', () => fetcher(100)),
    ]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(r50.length).toBe(50);
    expect(r100.length).toBe(100);

    tab.clearCrossTabDedupe();
  });

  it('controle: mesma chave EXATA dedupa (1 fetch), próximo teste mostra que +1ms NÃO dedupa', async () => {
    const tab = await loadTab();
    const fetcher = vi.fn(async () => 'shared');
    const KEY = 'inbox:poll:jidZ:2026-04-25T22:00:00.000Z';
    const [a, b, c] = await Promise.all([
      tab.dedupedFetch(KEY, fetcher),
      tab.dedupedFetch(KEY, fetcher),
      tab.dedupedFetch(KEY, fetcher),
    ]);
    expect(fetcher).toHaveBeenCalledTimes(1); // ← controle: chave igual = 1 fetch
    expect([a, b, c].every((r) => r === 'shared')).toBe(true);

    tab.clearCrossTabDedupe();
  });

  it('cross-tab: aba B com chave +1ms NÃO recebe resultado de A — faz seu próprio fetch', async () => {
    clearAll();
    const tabA = await loadTab();
    const tabB = await loadTab();
    expect(tabA.__TAB_ID).not.toBe(tabB.__TAB_ID);

    const cursorA = '2026-04-25T22:30:00.000Z';
    const cursorB = '2026-04-25T22:30:00.001Z'; // +1ms

    const fetcherA = vi.fn(async () => 'A-payload');
    const fetcherB = vi.fn(async () => 'B-payload');

    const [resA, resB] = await Promise.all([
      tabA.dedupedFetch(`inbox:poll:jidQ:${cursorA}`, fetcherA, { lockTtl: 5_000 }),
      tabB.dedupedFetch(`inbox:poll:jidQ:${cursorB}`, fetcherB, { lockTtl: 5_000 }),
    ]);

    expect(fetcherA).toHaveBeenCalledTimes(1);
    expect(fetcherB).toHaveBeenCalledTimes(1); // ← B NÃO reaproveitou A
    expect(resA).toBe('A-payload');
    expect(resB).toBe('B-payload');

    // Locks/cache estão isolados — verifica chaves distintas no localStorage.
    expect(localStorage.getItem(`ctd:result:inbox:poll:jidQ:${cursorA}`)).toBeTruthy();
    expect(localStorage.getItem(`ctd:result:inbox:poll:jidQ:${cursorB}`)).toBeTruthy();

    tabA.clearCrossTabDedupe();
    tabB.clearCrossTabDedupe();
  });

  it('subscriber por prefixo recebe AMBAS as variações (cada uma como evento próprio)', async () => {
    const tab = await loadTab();
    const handler = vi.fn();
    const unsub = tab.subscribeDedupe('inbox:poll:jidM:', handler);

    const cursor1 = '2026-04-25T23:00:00.000Z';
    const cursor2 = '2026-04-25T23:00:00.001Z';
    await Promise.all([
      tab.dedupedFetch(`inbox:poll:jidM:${cursor1}`, async () => [1]),
      tab.dedupedFetch(`inbox:poll:jidM:${cursor2}`, async () => [2]),
    ]);
    await new Promise((r) => setTimeout(r, 20));

    // Cada chave gera UM evento (source=local) — provando que são tratadas
    // como duas requisições distintas, não fundidas.
    expect(handler).toHaveBeenCalledTimes(2);
    const keys = handler.mock.calls.map((c) => c[0]).sort();
    expect(keys).toEqual([
      `inbox:poll:jidM:${cursor1}`,
      `inbox:poll:jidM:${cursor2}`,
    ]);

    unsub();
    tab.clearCrossTabDedupe();
  });
});
