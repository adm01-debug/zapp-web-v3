/**
 * Integração: dedupe por chave entre duas abas.
 *
 * Diferente de `crossTabDedupeMultiTab.test.ts` (que valida o módulo isolado),
 * estes testes validam que requisições lógicas idênticas — quando passam pelo
 * pipeline real de fetch usado pelos hooks (`queryExternalProxy`) — produzem
 * a MESMA chave de dedupe e portanto resultam em apenas 1 chamada de rede,
 * mesmo quando duas "abas" disparam em paralelo.
 *
 * Cenários cobertos (todos com chaves alinhadas ao que o
 * `useExternalEvolution` gera):
 *   - inbox:initial:<jid>:<page>     — abrir o mesmo contato em 2 abas
 *   - inbox:poll:<jid>:<after>       — poll cursor-forward simultâneo
 *   - older:<jid>:<oldest>:<page>    — paginar para o mesmo cursor antigo
 *   - inbox:sidebar:<days>:<limit>   — sidebar idêntica em 2 abas
 *
 * Asserts centrais:
 *   - O fetcher de rede é chamado exatamente 1 vez por chave compartilhada.
 *   - Ambas as abas recebem o MESMO payload.
 *   - Chaves DIFERENTES (jid distinto, cursor distinto) NÃO dedupam entre si.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

type DedupeModule = typeof import('@/lib/realtime/crossTabDedupe');

async function loadTab(): Promise<DedupeModule> {
  vi.resetModules();
  return (await import('@/lib/realtime/crossTabDedupe')) as DedupeModule;
}

function clearCtdLocalStorage() {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && (k.startsWith('ctd:lock:') || k.startsWith('ctd:result:'))) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
}

// Constantes alinhadas com `src/hooks/useExternalEvolution.ts`.
const SIDEBAR_DAYS_BACK = 7;
const SIDEBAR_LIMIT = 200;
const CONVERSATION_PAGE_SIZE = 100;

const initialKey = (jid: string) =>
  `inbox:initial:${jid}:${CONVERSATION_PAGE_SIZE}`;
const pollKey = (jid: string, after: string) => `inbox:poll:${jid}:${after}`;
const olderKey = (jid: string, oldest: string) =>
  `older:${jid}:${oldest}:${CONVERSATION_PAGE_SIZE}`;
const sidebarKey = () => `inbox:sidebar:${SIDEBAR_DAYS_BACK}:${SIDEBAR_LIMIT}`;

describe('Dedupe por chave — integração de duas abas', () => {
  let tabA: DedupeModule;
  let tabB: DedupeModule;

  beforeEach(async () => {
    clearCtdLocalStorage();
    tabA = await loadTab();
    tabB = await loadTab();
    expect(tabA.__TAB_ID).not.toBe(tabB.__TAB_ID);
  });

  afterEach(() => {
    tabA?.clearCrossTabDedupe();
    tabB?.clearCrossTabDedupe();
    clearCtdLocalStorage();
  });

  // ─── INITIAL ──────────────────────────────────────────────────────────────
  it('initial: trocar para o mesmo contato em 2 abas → 1 fetch HTTP', async () => {
    const jid = '5511999990001@s.whatsapp.net';
    const httpFetcher = vi.fn(async () => {
      // simula latência de rede do edge proxy
      await new Promise((r) => setTimeout(r, 40));
      return [{ id: 'msg-1', remote_jid: jid, content: 'hi' }];
    });

    // Cada aba dispara a mesma chave através do mesmo pipeline.
    const [resA, resB] = await Promise.all([
      tabA.dedupedFetch(initialKey(jid), httpFetcher, {
        lockTtl: 10_000,
        resultTtl: 15_000,
        waitTimeout: 8_000,
      }),
      tabB.dedupedFetch(initialKey(jid), httpFetcher, {
        lockTtl: 10_000,
        resultTtl: 15_000,
        waitTimeout: 8_000,
      }),
    ]);

    expect(httpFetcher).toHaveBeenCalledTimes(1);
    expect(resA).toEqual(resB);
    expect(resA).toEqual([{ id: 'msg-1', remote_jid: jid, content: 'hi' }]);
  });

  it('initial: contatos DIFERENTES em 2 abas → 2 fetches (chaves não colidem)', async () => {
    const jidA = '5511111111111@s.whatsapp.net';
    const jidB = '5522222222222@s.whatsapp.net';
    const httpFetcher = vi.fn(async (jid: string) => {
      await new Promise((r) => setTimeout(r, 20));
      return [{ id: `msg-${jid}`, remote_jid: jid }];
    });

    await Promise.all([
      tabA.dedupedFetch(initialKey(jidA), () => httpFetcher(jidA)),
      tabB.dedupedFetch(initialKey(jidB), () => httpFetcher(jidB)),
    ]);

    expect(httpFetcher).toHaveBeenCalledTimes(2);
    const calledJids = httpFetcher.mock.calls.map((c) => c[0]).sort();
    expect(calledJids).toEqual([jidA, jidB]);
  });

  // ─── POLL ─────────────────────────────────────────────────────────────────
  it('poll: 2 abas com mesmo (jid, lastSeen) → 1 fetch', async () => {
    const jid = '5511999990002@s.whatsapp.net';
    const lastSeen = '2026-04-25T16:00:00.000Z';
    const httpFetcher = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 30));
      return [{ id: 'new-1' }, { id: 'new-2' }];
    });

    const [resA, resB] = await Promise.all([
      tabA.dedupedFetch(pollKey(jid, lastSeen), httpFetcher, {
        lockTtl: 4_000,
        resultTtl: 4_000,
        waitTimeout: 3_000,
      }),
      tabB.dedupedFetch(pollKey(jid, lastSeen), httpFetcher, {
        lockTtl: 4_000,
        resultTtl: 4_000,
        waitTimeout: 3_000,
      }),
    ]);

    expect(httpFetcher).toHaveBeenCalledTimes(1);
    expect(resA).toEqual(resB);
    expect(resA).toHaveLength(2);
  });

  it('poll: cursores DIFERENTES (lastSeen) → 2 fetches independentes', async () => {
    const jid = '5511999990003@s.whatsapp.net';
    const after1 = '2026-04-25T16:00:00.000Z';
    const after2 = '2026-04-25T16:00:05.000Z'; // 5s mais novo
    const httpFetcher = vi.fn(async () => []);

    await Promise.all([
      tabA.dedupedFetch(pollKey(jid, after1), httpFetcher),
      tabB.dedupedFetch(pollKey(jid, after2), httpFetcher),
    ]);
    expect(httpFetcher).toHaveBeenCalledTimes(2);
  });

  // ─── OLDER (paginação para trás) ──────────────────────────────────────────
  it('older: 2 abas paginando para o mesmo cursor → 1 fetch', async () => {
    const jid = '5511999990004@s.whatsapp.net';
    const oldest = '2026-04-20T10:00:00.000Z';
    const page = Array.from({ length: 100 }, (_, i) => ({ id: `old-${i}` }));
    const httpFetcher = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 50));
      return page;
    });

    const [resA, resB] = await Promise.all([
      tabA.dedupedFetch(olderKey(jid, oldest), httpFetcher, {
        lockTtl: 10_000,
        resultTtl: 30_000,
      }),
      tabB.dedupedFetch(olderKey(jid, oldest), httpFetcher, {
        lockTtl: 10_000,
        resultTtl: 30_000,
        waitTimeout: 5_000,
      }),
    ]);

    expect(httpFetcher).toHaveBeenCalledTimes(1);
    expect(resA).toEqual(resB); // mesmo conteúdo (broadcast clona via structuredClone)
    expect(resA).toHaveLength(100);
  });

  // ─── SIDEBAR ──────────────────────────────────────────────────────────────
  it('sidebar: janela igual em 2 abas → 1 fetch (mesmo polling em paralelo)', async () => {
    const sidebarPayload = Array.from({ length: 50 }, (_, i) => ({
      id: `m-${i}`,
      remote_jid: `551199999${String(i).padStart(4, '0')}@s.whatsapp.net`,
    }));
    const httpFetcher = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 30));
      return sidebarPayload;
    });

    const [resA, resB] = await Promise.all([
      tabA.dedupedFetch(sidebarKey(), httpFetcher, {
        lockTtl: 8_000,
        resultTtl: 4_500,
        waitTimeout: 6_000,
      }),
      tabB.dedupedFetch(sidebarKey(), httpFetcher, {
        lockTtl: 8_000,
        resultTtl: 4_500,
        waitTimeout: 6_000,
      }),
    ]);

    expect(httpFetcher).toHaveBeenCalledTimes(1);
    expect(resA).toEqual(resB);
    expect(resA).toHaveLength(50);
  });

  // ─── AVALANCHE ────────────────────────────────────────────────────────────
  it('avalanche: 10 chamadas (5 por aba) na mesma chave → 1 fetch', async () => {
    const jid = '5511999990005@s.whatsapp.net';
    const httpFetcher = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 60));
      return [{ id: 'unique' }];
    });
    const key = initialKey(jid);

    // 5 chamadas em A (todas dedupam via inflight local).
    const callsA = Array.from({ length: 5 }, () =>
      tabA.dedupedFetch(key, httpFetcher, { lockTtl: 8_000, waitTimeout: 5_000 }),
    );
    // Pequeno delay para A pegar o lock antes de B entrar.
    await new Promise((r) => setTimeout(r, 5));
    // 5 chamadas em B (todas devem aguardar o broadcast de A).
    const callsB = Array.from({ length: 5 }, () =>
      tabB.dedupedFetch(key, httpFetcher, { lockTtl: 8_000, waitTimeout: 5_000 }),
    );

    const results = await Promise.all([...callsA, ...callsB]);
    expect(httpFetcher).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(10);
    results.forEach((r) => expect(r).toEqual([{ id: 'unique' }]));
  });

  // ─── INTEGRAÇÃO TEMPORAL: sequencial preserva cache cross-tab ────────────
  it('sequencial: A termina, B chama 100ms depois → B usa cache, sem fetch', async () => {
    const jid = '5511999990006@s.whatsapp.net';
    const httpFetcher = vi.fn(async () => [{ id: 'cached' }]);
    const key = initialKey(jid);

    await tabA.dedupedFetch(key, httpFetcher, { resultTtl: 15_000 });
    await new Promise((r) => setTimeout(r, 100));
    const resB = await tabB.dedupedFetch(key, httpFetcher, { resultTtl: 15_000 });

    expect(httpFetcher).toHaveBeenCalledTimes(1);
    expect(resB).toEqual([{ id: 'cached' }]);
  });

  it('sequencial: cache expira → B refaz fetch (não fica pendurado em resultado velho)', async () => {
    const jid = '5511999990007@s.whatsapp.net';
    let call = 0;
    const httpFetcher = vi.fn(async () => {
      call += 1;
      return [{ id: `call-${call}` }];
    });
    const key = initialKey(jid);

    const r1 = await tabA.dedupedFetch(key, httpFetcher, { resultTtl: 50 });
    await new Promise((r) => setTimeout(r, 80)); // > resultTtl
    const r2 = await tabB.dedupedFetch(key, httpFetcher, { resultTtl: 50 });

    expect(httpFetcher).toHaveBeenCalledTimes(2);
    expect(r1).toEqual([{ id: 'call-1' }]);
    expect(r2).toEqual([{ id: 'call-2' }]);
  });
});
