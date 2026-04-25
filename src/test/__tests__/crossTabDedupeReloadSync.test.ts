/**
 * crossTabDedupe — Sincronização após reload de aba.
 *
 * Cenário real: o usuário recarrega (F5) uma das abas enquanto outra aba
 * já está com um fetch em andamento (lock ativo no localStorage). A aba
 * "recarregada" — simulada via vi.resetModules() para gerar um TAB_ID novo
 * com estruturas em memória zeradas — deve:
 *   1. Detectar o lock pré-existente em localStorage e NÃO disparar fetch.
 *   2. Receber o resultado via BroadcastChannel quando a aba ativa terminar.
 *   3. Reaproveitar o cache persistido se a aba ativa terminou ANTES do
 *      reload completar (cenário "tarde demais para o broadcast").
 *   4. Mesmo com múltiplas chamadas concorrentes na aba recarregada,
 *      executar o fetcher 0 vezes (resultado vem da outra aba).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

type DedupeModule = typeof import('@/lib/realtime/crossTabDedupe');

async function loadTab(): Promise<DedupeModule> {
  vi.resetModules();
  return (await import('@/lib/realtime/crossTabDedupe')) as DedupeModule;
}

function clearAllDedupeKeys() {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && (k.startsWith('ctd:lock:') || k.startsWith('ctd:result:') || k.startsWith('ctd:bus:'))) {
      keys.push(k);
    }
  }
  keys.forEach((k) => localStorage.removeItem(k));
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (v: T) => void;
  reject: (e: unknown) => void;
}
function makeDeferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('crossTabDedupe — reload de aba com lock ativo em outra', () => {
  beforeEach(() => {
    clearAllDedupeKeys();
  });

  afterEach(() => {
    clearAllDedupeKeys();
  });

  it('aba reloadada (TAB_ID novo) vê lock pré-existente e aguarda broadcast — fetcher local NÃO dispara', async () => {
    const KEY = 'reload:wait-bcast:k';

    // Aba A: começa um fetch pendurado (controlado por Deferred) — segura o lock.
    const tabA = await loadTab();
    const dA = makeDeferred<{ payload: number[] }>();
    const fetcherA = vi.fn(() => dA.promise);
    const pA = tabA.dedupedFetch(KEY, fetcherA, {
      lockTtl: 5_000,
      resultTtl: 5_000,
      waitTimeout: 4_000,
    });

    await sleep(15); // garante que A escreveu o lock
    const lockBefore = localStorage.getItem(`ctd:lock:${KEY}`);
    expect(lockBefore).toBeTruthy();
    const ownerBefore = JSON.parse(lockBefore!).ownerId;
    expect(ownerBefore).toBe(tabA.__TAB_ID);

    // Simula RELOAD da aba B: resetModules + import → novo TAB_ID, sem
    // memória in-process; localStorage e BroadcastChannel são preservados.
    const tabB = await loadTab();
    expect(tabB.__TAB_ID).not.toBe(tabA.__TAB_ID);
    // O lock segue lá (pertence a A) — a aba B não pode tê-lo apagado.
    const lockAfterReload = localStorage.getItem(`ctd:lock:${KEY}`);
    expect(lockAfterReload).toBeTruthy();
    expect(JSON.parse(lockAfterReload!).ownerId).toBe(ownerBefore);

    // B inicia uma chamada para a MESMA chave — deve esperar broadcast.
    const fetcherB = vi.fn(async () => ({ payload: [-1] }));
    const pB = tabB.dedupedFetch(KEY, fetcherB, {
      lockTtl: 5_000,
      resultTtl: 5_000,
      waitTimeout: 4_000,
    });

    await sleep(20); // B já está em waitForResult

    // A finalmente termina e broadcasta o resultado.
    dA.resolve({ payload: [10, 20, 30] });

    const [resA, resB] = await Promise.all([pA, pB]);

    expect(resA).toEqual({ payload: [10, 20, 30] });
    expect(resB).toEqual({ payload: [10, 20, 30] }); // recebido via broadcast
    expect(fetcherA).toHaveBeenCalledTimes(1);
    expect(fetcherB).not.toHaveBeenCalled(); // ← garantia central: 0 fetch local

    tabA.clearCrossTabDedupe();
    tabB.clearCrossTabDedupe();
  });

  it('reload TARDE: A já terminou antes do reload — B recém-carregada usa cache persistido (0 fetch)', async () => {
    const KEY = 'reload:late-cache:k';

    const tabA = await loadTab();
    const fetcherA = vi.fn(async () => ({ value: 'persisted-by-A' }));
    await tabA.dedupedFetch(KEY, fetcherA, { lockTtl: 5_000, resultTtl: 10_000 });

    // Resultado deve estar em localStorage e o lock liberado.
    expect(localStorage.getItem(`ctd:result:${KEY}`)).toBeTruthy();
    expect(localStorage.getItem(`ctd:lock:${KEY}`)).toBeNull();

    // Reload da aba B AGORA (após A já ter terminado). Sem memória local,
    // só tem o que está em localStorage para se basear.
    const tabB = await loadTab();
    expect(tabB.__TAB_ID).not.toBe(tabA.__TAB_ID);

    const fetcherB = vi.fn(async () => ({ value: 'should-not-run' }));
    const resB = await tabB.dedupedFetch(KEY, fetcherB, { resultTtl: 10_000 });

    expect(resB).toEqual({ value: 'persisted-by-A' });
    expect(fetcherB).not.toHaveBeenCalled(); // 0 fetch — veio do cache persistido

    tabA.clearCrossTabDedupe();
    tabB.clearCrossTabDedupe();
  });

  it('múltiplas chamadas concorrentes na aba recarregada → fetcher local 0x (compartilham broadcast)', async () => {
    const KEY = 'reload:fanout:k';

    const tabA = await loadTab();
    const dA = makeDeferred<string>();
    const fetcherA = vi.fn(() => dA.promise);
    const pA = tabA.dedupedFetch(KEY, fetcherA, {
      lockTtl: 5_000,
      resultTtl: 5_000,
      waitTimeout: 4_000,
    });
    await sleep(15); // A pegou o lock

    // Reload de B.
    const tabB = await loadTab();
    expect(tabB.__TAB_ID).not.toBe(tabA.__TAB_ID);

    // 4 componentes da aba B chamam dedupedFetch para a mesma chave em paralelo.
    const fetcherB = vi.fn(async () => 'should-not-run');
    const promisesB = Array.from({ length: 4 }, () =>
      tabB.dedupedFetch(KEY, fetcherB, { lockTtl: 5_000, waitTimeout: 4_000 }),
    );
    await sleep(20);

    dA.resolve('shared-by-A');
    const [resA, ...resBs] = await Promise.all([pA, ...promisesB]);

    expect(resA).toBe('shared-by-A');
    expect(resBs.every((r) => r === 'shared-by-A')).toBe(true);
    expect(fetcherA).toHaveBeenCalledTimes(1);
    expect(fetcherB).not.toHaveBeenCalled(); // ← 0 fetch local apesar das 4 chamadas

    tabA.clearCrossTabDedupe();
    tabB.clearCrossTabDedupe();
  });

  it('subscribers da aba recarregada recebem o resultado via BroadcastChannel (source=remote)', async () => {
    const KEY = 'reload:subscribers:k';

    const tabA = await loadTab();
    const dA = makeDeferred<{ items: string[] }>();
    const fetcherA = vi.fn(() => dA.promise);
    const pA = tabA.dedupedFetch(KEY, fetcherA, {
      lockTtl: 5_000,
      resultTtl: 5_000,
    });
    await sleep(15);

    // Reload de B + UI inscreve em dedupe ANTES do término de A.
    const tabB = await loadTab();
    const handlerB = vi.fn();
    const unsub = tabB.subscribeDedupe<{ items: string[] }>(KEY, handlerB);
    await sleep(10); // garante que o BroadcastChannel da B está ativo

    dA.resolve({ items: ['a', 'b', 'c'] });
    await pA;
    await sleep(40); // BC é assíncrono — espera entrega

    expect(handlerB).toHaveBeenCalledTimes(1);
    const [key, data, source] = handlerB.mock.calls[0];
    expect(key).toBe(KEY);
    expect(data).toEqual({ items: ['a', 'b', 'c'] });
    expect(source).toBe('remote'); // veio da aba A após reload de B

    unsub();
    tabA.clearCrossTabDedupe();
    tabB.clearCrossTabDedupe();
  });

  it('reload coincidente com término de A: B captura via late_cache se broadcast já passou', async () => {
    const KEY = 'reload:late-bcast-window:k';

    // A termina rapidamente — escreve resultado e broadcasta.
    const tabA = await loadTab();
    const fetcherA = vi.fn(async () => 'A-quick');
    await tabA.dedupedFetch(KEY, fetcherA, { lockTtl: 5_000, resultTtl: 5_000 });

    // Tempo passa antes de B "acordar" (reload demora). O broadcast já foi
    // disparado em uma janela em que B não existia. B só tem localStorage.
    await sleep(20);
    const tabB = await loadTab();

    const fetcherB = vi.fn(async () => 'should-not-run');
    const resB = await tabB.dedupedFetch(KEY, fetcherB, { resultTtl: 5_000 });

    expect(resB).toBe('A-quick'); // veio do cache persistido (broadcast perdido)
    expect(fetcherB).not.toHaveBeenCalled();

    tabA.clearCrossTabDedupe();
    tabB.clearCrossTabDedupe();
  });
});
