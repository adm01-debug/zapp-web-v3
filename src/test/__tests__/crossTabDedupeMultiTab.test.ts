/**
 * crossTabDedupe — Testes de simulação multi-aba.
 *
 * Carregamos o módulo `crossTabDedupe` duas vezes, resetando o cache de
 * módulos do Vitest entre imports — assim cada carga representa uma "aba"
 * diferente com seu próprio TAB_ID e suas próprias estruturas em memória.
 * As duas abas compartilham o mesmo `localStorage` e o mesmo
 * `BroadcastChannel` global do jsdom — exatamente como duas abas reais do
 * mesmo origin.
 *
 * Garantias validadas:
 *   1. Aba A em execução → aba B vê o lock no localStorage e NÃO dispara o
 *      seu próprio fetcher.
 *   2. Aba A termina → broadcasta o resultado e a aba B recebe via
 *      BroadcastChannel sem fetch.
 *   3. Corrida: se A e B começam ao mesmo tempo, apenas uma vence o lock.
 *   4. Subscribers (UI) da aba B são notificados quando A termina.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

type DedupeModule = typeof import('@/lib/realtime/crossTabDedupe');

async function loadTab(): Promise<DedupeModule> {
  vi.resetModules();
  // Import dinâmico após reset → nova instância do módulo (novo TAB_ID).
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

describe('crossTabDedupe — multi-aba (lock + BroadcastChannel)', () => {
  let tabA: DedupeModule;
  let tabB: DedupeModule;

  beforeEach(async () => {
    clearLocalStorageDedupeKeys();
    tabA = await loadTab();
    tabB = await loadTab();
    // Sanity: TAB_IDs devem ser diferentes — caso contrário não estamos
    // simulando duas abas distintas.
    expect(tabA.__TAB_ID).not.toBe(tabB.__TAB_ID);
  });

  afterEach(() => {
    tabA?.clearCrossTabDedupe();
    tabB?.clearCrossTabDedupe();
    clearLocalStorageDedupeKeys();
  });

  it('aba B não dispara fetcher enquanto aba A está em andamento (lock detém)', async () => {
    const fetcherA = vi.fn(async () => {
      // segura a Promise por 60ms para garantir que B veja o lock.
      await new Promise((r) => setTimeout(r, 60));
      return { from: 'A', payload: [1, 2, 3] };
    });
    const fetcherB = vi.fn(async () => ({ from: 'B', payload: ['should-not-run'] }));

    // A começa primeiro e adquire o lock.
    const pA = tabA.dedupedFetch('multi:k1', fetcherA, {
      lockTtl: 5_000,
      resultTtl: 5_000,
    });

    // Pequeno tick para garantir que A escreveu o lock.
    await new Promise((r) => setTimeout(r, 5));

    // Confirma que o lock está no localStorage e pertence à aba A.
    const rawLock = localStorage.getItem('ctd:lock:multi:k1');
    expect(rawLock).toBeTruthy();
    const parsedLock = JSON.parse(rawLock!);
    expect(parsedLock.ownerId).toBe(tabA.__TAB_ID);

    // B inicia agora — deve ver o lock e esperar pelo broadcast.
    const pB = tabB.dedupedFetch('multi:k1', fetcherB, {
      lockTtl: 5_000,
      resultTtl: 5_000,
      waitTimeout: 3_000,
    });

    const [resA, resB] = await Promise.all([pA, pB]);

    expect(fetcherA).toHaveBeenCalledTimes(1);
    expect(fetcherB).not.toHaveBeenCalled(); // ← garantia central do teste
    expect(resA).toEqual({ from: 'A', payload: [1, 2, 3] });
    expect(resB).toEqual({ from: 'A', payload: [1, 2, 3] }); // recebido via broadcast
  });

  it('após A terminar, B reaproveita o resultado via cache persistente sem fetch', async () => {
    const fetcherA = vi.fn(async () => ({ value: 'cached-by-A' }));
    const fetcherB = vi.fn(async () => ({ value: 'should-not-run' }));

    await tabA.dedupedFetch('multi:k2', fetcherA, { resultTtl: 10_000 });

    // Garante que o resultado foi persistido em localStorage para B ler.
    expect(localStorage.getItem('ctd:result:multi:k2')).toBeTruthy();

    const resB = await tabB.dedupedFetch('multi:k2', fetcherB);
    expect(fetcherA).toHaveBeenCalledTimes(1);
    expect(fetcherB).not.toHaveBeenCalled();
    expect(resB).toEqual({ value: 'cached-by-A' });
  });

  it('corrida: A e B disparam ao mesmo tempo — apenas uma executa o fetcher', async () => {
    const fetcherA = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 30));
      return 'A-won';
    });
    const fetcherB = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 30));
      return 'B-won';
    });

    const [resA, resB] = await Promise.all([
      tabA.dedupedFetch('multi:race', fetcherA, { lockTtl: 5_000, waitTimeout: 2_000 }),
      tabB.dedupedFetch('multi:race', fetcherB, { lockTtl: 5_000, waitTimeout: 2_000 }),
    ]);

    const totalCalls = fetcherA.mock.calls.length + fetcherB.mock.calls.length;
    expect(totalCalls).toBe(1); // exatamente um vence o lock
    // Ambas devem retornar o MESMO valor (o do vencedor).
    expect(resA).toBe(resB);
    expect(['A-won', 'B-won']).toContain(resA);
  });

  it('subscribers da aba B são notificados quando A termina (BroadcastChannel)', async () => {
    const handlerB = vi.fn();
    const unsub = tabB.subscribeDedupe('multi:notify', handlerB);

    // Dá um tick para o BroadcastChannel da B estar pronto a receber.
    await new Promise((r) => setTimeout(r, 5));

    await tabA.dedupedFetch('multi:notify', async () => ({ items: ['x', 'y'] }), {
      resultTtl: 5_000,
    });

    // BroadcastChannel é assíncrono — espera microtask + um tick.
    await new Promise((r) => setTimeout(r, 30));

    expect(handlerB).toHaveBeenCalledTimes(1);
    const [key, data, source] = handlerB.mock.calls[0];
    expect(key).toBe('multi:notify');
    expect(data).toEqual({ items: ['x', 'y'] });
    expect(source).toBe('remote'); // veio de outra aba

    unsub();
  });

  it('aba B em waitForResult recebe o resultado via broadcast (sem cair em fallback)', async () => {
    const fetcherA = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 40));
      return 'A-broadcasted';
    });
    const fetcherB = vi.fn(async () => 'B-fallback');

    const pA = tabA.dedupedFetch('multi:wait', fetcherA, { lockTtl: 5_000 });
    await new Promise((r) => setTimeout(r, 5)); // A pega o lock

    const pB = tabB.dedupedFetch('multi:wait', fetcherB, {
      waitTimeout: 1_000, // > tempo do fetcher A (40ms)
    });

    const [resA, resB] = await Promise.all([pA, pB]);
    expect(resA).toBe('A-broadcasted');
    expect(resB).toBe('A-broadcasted');
    expect(fetcherA).toHaveBeenCalledTimes(1);
    expect(fetcherB).not.toHaveBeenCalled();
  });

  it('5 chamadas concorrentes em 2 abas → exatamente 1 fetcher executa', async () => {
    const fetcherA = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 50));
      return 'shared';
    });
    const fetcherB = vi.fn(async () => 'should-not-run');

    const promises = [
      tabA.dedupedFetch('multi:fanout', fetcherA, { lockTtl: 5_000 }),
      tabA.dedupedFetch('multi:fanout', fetcherA, { lockTtl: 5_000 }),
      tabA.dedupedFetch('multi:fanout', fetcherA, { lockTtl: 5_000 }),
    ];
    // Pequeno atraso antes de B entrar para garantir que A pegou o lock.
    await new Promise((r) => setTimeout(r, 5));
    promises.push(
      tabB.dedupedFetch('multi:fanout', fetcherB, { waitTimeout: 2_000 }),
      tabB.dedupedFetch('multi:fanout', fetcherB, { waitTimeout: 2_000 }),
    );

    const results = await Promise.all(promises);
    expect(fetcherA).toHaveBeenCalledTimes(1);
    expect(fetcherB).not.toHaveBeenCalled();
    expect(results.every((r) => r === 'shared')).toBe(true);
  });
});
