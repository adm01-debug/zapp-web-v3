/**
 * Integração — dedupe cross-tab durante TROCA DE CONTATO simultânea em 2 abas.
 *
 * Cenário operacional real do Inbox:
 *   - Operador tem o ZAPP aberto em duas abas.
 *   - Em ambas, ele clica num contato ao mesmo tempo (mesmo JID).
 *   - Cada aba dispara `dedupedFetch("inbox:initial:<jid>", ...)` para
 *     carregar as primeiras 100 mensagens.
 *   - O sistema DEVE garantir UM único fetch por contato no total.
 *
 * Variações cobertas:
 *   1. Mesma key em ambas as abas → 1 fetch total.
 *   2. Trocas em sequência (jid1 → jid2) em ambas as abas → 2 fetches (1 por jid).
 *   3. Trocas cruzadas: A vai de jid1→jid2 enquanto B vai de jid2→jid1,
 *      simultaneamente → 2 fetches no total (um por key), mesmo com a ordem
 *      de aquisição de lock invertida entre as abas.
 *   4. Burst: 3 trocas rápidas em cada aba para os mesmos 3 jids → 3 fetches.
 *
 * Por que esse teste é necessário mesmo havendo `crossTabDedupeMultiTab.test.ts`:
 *   Aquele cobre 1 key compartilhada. Este cobre o padrão real do Inbox
 *   onde múltiplas keys interagem simultaneamente entre abas — onde bugs
 *   de "vazamento" do lock (ex.: limpeza incorreta de waiters/inflight ao
 *   trocar de contato) apareceriam.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

type DedupeModule = typeof import('@/lib/realtime/crossTabDedupe');

async function loadTab(): Promise<DedupeModule> {
  vi.resetModules();
  return (await import('@/lib/realtime/crossTabDedupe')) as DedupeModule;
}

function clearLocalStorageDedupeKeys() {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && (k.startsWith('ctd:lock:') || k.startsWith('ctd:result:'))) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
}

const keyFor = (jid: string) => `inbox:initial:${jid}`;

describe('crossTabDedupe — troca de contato simultânea em 2 abas', () => {
  let tabA: DedupeModule;
  let tabB: DedupeModule;

  beforeEach(async () => {
    clearLocalStorageDedupeKeys();
    tabA = await loadTab();
    tabB = await loadTab();
    expect(tabA.__TAB_ID).not.toBe(tabB.__TAB_ID);
  });

  afterEach(() => {
    tabA?.clearCrossTabDedupe();
    tabB?.clearCrossTabDedupe();
    clearLocalStorageDedupeKeys();
  });

  it('ambas as abas abrem o MESMO contato ao mesmo tempo → 1 único fetch', async () => {
    const jid = '5511999990001@s.whatsapp.net';
    const fetchCalls: string[] = [];

    const fetcher = (tab: 'A' | 'B') =>
      vi.fn(async () => {
        fetchCalls.push(tab);
        await new Promise((r) => setTimeout(r, 40));
        return { jid, messages: ['m1', 'm2', 'm3'] };
      });

    const fA = fetcher('A');
    const fB = fetcher('B');

    const [resA, resB] = await Promise.all([
      tabA.dedupedFetch(keyFor(jid), fA, { lockTtl: 5_000, waitTimeout: 3_000 }),
      tabB.dedupedFetch(keyFor(jid), fB, { lockTtl: 5_000, waitTimeout: 3_000 }),
    ]);

    expect(fetchCalls).toHaveLength(1); // ← garantia central
    expect(resA).toEqual(resB);
    expect(resA).toEqual({ jid, messages: ['m1', 'm2', 'm3'] });
  });

  it('cada aba abre um contato DIFERENTE ao mesmo tempo → 1 fetch por contato (sem interferência)', async () => {
    const jid1 = '5511999990001@s.whatsapp.net';
    const jid2 = '5511999990002@s.whatsapp.net';
    const calls: string[] = [];

    const fA = vi.fn(async () => {
      calls.push(`A:${jid1}`);
      await new Promise((r) => setTimeout(r, 30));
      return { jid: jid1, n: 1 };
    });
    const fB = vi.fn(async () => {
      calls.push(`B:${jid2}`);
      await new Promise((r) => setTimeout(r, 30));
      return { jid: jid2, n: 2 };
    });

    const [resA, resB] = await Promise.all([
      tabA.dedupedFetch(keyFor(jid1), fA),
      tabB.dedupedFetch(keyFor(jid2), fB),
    ]);

    // Keys diferentes → cada aba executa o seu próprio fetcher uma vez.
    expect(fA).toHaveBeenCalledTimes(1);
    expect(fB).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(2);
    expect(resA).toEqual({ jid: jid1, n: 1 });
    expect(resB).toEqual({ jid: jid2, n: 2 });
  });

  it('trocas cruzadas: A faz jid1→jid2 enquanto B faz jid2→jid1 → 2 fetches totais (1 por key)', async () => {
    const jid1 = '5511999990001@s.whatsapp.net';
    const jid2 = '5511999990002@s.whatsapp.net';
    const calls: string[] = [];

    const make = (label: string, jid: string) =>
      vi.fn(async () => {
        calls.push(label);
        await new Promise((r) => setTimeout(r, 25));
        return { jid, label };
      });

    // Aba A pega jid1 primeiro; aba B pega jid2 primeiro — locks distintos.
    const fA1 = make('A->jid1', jid1);
    const fB2 = make('B->jid2', jid2);

    const pA1 = tabA.dedupedFetch(keyFor(jid1), fA1, { lockTtl: 5_000 });
    const pB2 = tabB.dedupedFetch(keyFor(jid2), fB2, { lockTtl: 5_000 });

    // Imediatamente cada aba "troca" de contato para o jid que a outra está
    // carregando. Como o lock para essa key já foi adquirido pela outra aba,
    // o fetcher local NÃO deve rodar.
    const fA2 = make('A->jid2', jid2);
    const fB1 = make('B->jid1', jid1);

    const pA2 = tabA.dedupedFetch(keyFor(jid2), fA2, { waitTimeout: 3_000 });
    const pB1 = tabB.dedupedFetch(keyFor(jid1), fB1, { waitTimeout: 3_000 });

    const [resA1, resB2, resA2, resB1] = await Promise.all([pA1, pB2, pA2, pB1]);

    // Apenas os 2 fetchers líderes (um por key) executaram.
    expect(calls.sort()).toEqual(['A->jid1', 'B->jid2']);
    expect(fA1).toHaveBeenCalledTimes(1);
    expect(fB2).toHaveBeenCalledTimes(1);
    expect(fA2).not.toHaveBeenCalled(); // recebeu jid2 via broadcast da B
    expect(fB1).not.toHaveBeenCalled(); // recebeu jid1 via broadcast da A

    // Cada aba recebe os dados certos para cada key.
    expect(resA1).toEqual({ jid: jid1, label: 'A->jid1' });
    expect(resB2).toEqual({ jid: jid2, label: 'B->jid2' });
    expect(resA2).toEqual({ jid: jid2, label: 'B->jid2' });
    expect(resB1).toEqual({ jid: jid1, label: 'A->jid1' });
  });

  it('burst: 3 trocas rápidas em cada aba para os mesmos 3 contatos → 3 fetches no total', async () => {
    const jids = [
      '5511999990010@s.whatsapp.net',
      '5511999990011@s.whatsapp.net',
      '5511999990012@s.whatsapp.net',
    ];
    const callCounts = new Map<string, number>();
    jids.forEach((j) => callCounts.set(j, 0));

    const make = (jid: string) =>
      vi.fn(async () => {
        callCounts.set(jid, (callCounts.get(jid) ?? 0) + 1);
        await new Promise((r) => setTimeout(r, 20));
        return { jid };
      });

    // A dispara os 3 em sequência rápida; B faz o mesmo praticamente junto.
    const promises: Array<Promise<unknown>> = [];
    for (const jid of jids) {
      promises.push(tabA.dedupedFetch(keyFor(jid), make(jid), { lockTtl: 5_000 }));
    }
    // Pequeno tick para garantir que A escreveu pelo menos o primeiro lock.
    await new Promise((r) => setTimeout(r, 5));
    for (const jid of jids) {
      promises.push(
        tabB.dedupedFetch(keyFor(jid), make(jid), {
          lockTtl: 5_000,
          waitTimeout: 3_000,
        }),
      );
    }

    const results = await Promise.all(promises);

    // Cada jid foi fetched no MÁXIMO uma vez (líder).
    for (const jid of jids) {
      expect(callCounts.get(jid)).toBe(1);
    }
    // Todos os 6 promises retornaram um objeto válido.
    expect(results).toHaveLength(6);
    results.forEach((r) => {
      expect(r).toMatchObject({ jid: expect.stringMatching(/@s\.whatsapp\.net$/) });
    });
  });

  it('aba B troca para um contato JÁ carregado pela A → reaproveita cache persistente sem fetch', async () => {
    const jid = '5511999990099@s.whatsapp.net';
    const fA = vi.fn(async () => ({ jid, source: 'A' }));
    const fB = vi.fn(async () => ({ jid, source: 'B' }));

    // A carrega primeiro e termina.
    const resA = await tabA.dedupedFetch(keyFor(jid), fA, { resultTtl: 10_000 });
    expect(resA).toEqual({ jid, source: 'A' });
    expect(localStorage.getItem(`ctd:result:${keyFor(jid)}`)).toBeTruthy();

    // Agora o operador clica no MESMO contato na aba B — deve reaproveitar.
    const resB = await tabB.dedupedFetch(keyFor(jid), fB);
    expect(fB).not.toHaveBeenCalled();
    expect(resB).toEqual({ jid, source: 'A' });
  });
});
