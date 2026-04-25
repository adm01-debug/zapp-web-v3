/**
 * crossTabDedupe — Expiração de lockTtl entre abas.
 *
 * Cenário central: a aba A adquire o lock para uma chave mas a chamada de
 * rede "trava" (ex.: backend lento, conexão pendurada). Após `lockTtl`
 * expirar, qualquer outra aba que tente a mesma chave precisa:
 *   1. Reconhecer que o lock está expirado (não ficar presa esperando
 *      broadcast antigo da aba A indefinidamente).
 *   2. Fazer EXATAMENTE 1 nova chamada de rede própria (assumir liderança).
 *   3. Não disparar múltiplas tentativas concorrentes mesmo sob race.
 *
 * Estratégia de simulação:
 *   - Carregamos o módulo duas vezes via vi.resetModules (TAB_IDs distintos).
 *   - A aba A inicia um fetch que NÃO resolve (controla via Deferred).
 *   - Configuramos `lockTtl` curto e `waitTimeout` < lockTtl + folga.
 *   - Aguardamos `lockTtl + 50ms` real (sem fake timers — a expiração é
 *     comparada via `Date.now()` no `readLock`, então tempo real importa).
 *   - Disparamos B e validamos: fetcherB chamado 1x, resultado de B retorna,
 *     e fetcherA permanece pendurado sem afetar B.
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

describe('crossTabDedupe — expiração de lockTtl', () => {
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

  it('após lockTtl expirar, aba B faz EXATAMENTE 1 nova chamada de rede para a mesma chave', async () => {
    const KEY = 'expire:single:k';
    const LOCK_TTL = 100;       // 100ms — curto pra teste rápido
    const WAIT_TIMEOUT = 60;    // < lockTtl, garante que B cai no fallback antes do lock expirar a 1ª vez,
                                // depois a 2ª chamada de B (após sleep) acha o lock expirado.

    // A: fetcher que NUNCA resolve no escopo do teste (simula backend pendurado).
    const dA = makeDeferred<string>();
    const fetcherA = vi.fn(() => dA.promise);
    const pA = tabA.dedupedFetch(KEY, fetcherA, {
      lockTtl: LOCK_TTL,
      resultTtl: 5_000,
      waitTimeout: WAIT_TIMEOUT,
    });

    // Confirma que A é o líder (pegou o lock).
    await sleep(10);
    const lockA = localStorage.getItem(`ctd:lock:${KEY}`);
    expect(lockA).toBeTruthy();
    expect(JSON.parse(lockA!).ownerId).toBe(tabA.__TAB_ID);

    // Aguarda o lockTtl expirar (com folga). Sem fake timers porque a
    // expiração é validada via Date.now() em runtime no readLock.
    await sleep(LOCK_TTL + 50);

    // B inicia agora — o readLock vai descartar o lock expirado (ttl < now)
    // e B deve adquirir o lock e executar EXATAMENTE 1x.
    const fetcherB = vi.fn(async () => 'B-result');
    const pB = tabB.dedupedFetch(KEY, fetcherB, {
      lockTtl: LOCK_TTL,
      resultTtl: 5_000,
      waitTimeout: WAIT_TIMEOUT,
    });

    const resB = await pB;

    expect(resB).toBe('B-result');
    expect(fetcherB).toHaveBeenCalledTimes(1); // ← garantia central
    // A continua pendurado, mas isso não afeta B.
    expect(fetcherA).toHaveBeenCalledTimes(1);

    // Limpa: resolve A para evitar warnings de promise pendente.
    dA.resolve('A-late');
    await pA.catch(() => {/* qualquer outcome ok */});
  });

  it('B não fica preso esperando broadcast antigo após lock expirar (timeout não excede waitTimeout)', async () => {
    const KEY = 'expire:no-wait:k';
    const LOCK_TTL = 80;
    const WAIT_TIMEOUT = 500; // grande propositalmente

    // A pega o lock e fica pendurado.
    const dA = makeDeferred<string>();
    const fetcherA = vi.fn(() => dA.promise);
    const pA = tabA.dedupedFetch(KEY, fetcherA, {
      lockTtl: LOCK_TTL,
      resultTtl: 5_000,
      waitTimeout: WAIT_TIMEOUT,
    });
    await sleep(10);

    // Espera o lock expirar.
    await sleep(LOCK_TTL + 50);

    // B começa — como o lock está expirado, deve adquirir imediatamente
    // e NÃO esperar pelos 500ms do waitTimeout. Mede tempo de B.
    const fetcherB = vi.fn(async () => 'fast');
    const t0 = Date.now();
    const pB = tabB.dedupedFetch(KEY, fetcherB, {
      lockTtl: LOCK_TTL,
      resultTtl: 5_000,
      waitTimeout: WAIT_TIMEOUT,
    });
    const resB = await pB;
    const elapsed = Date.now() - t0;

    expect(resB).toBe('fast');
    expect(fetcherB).toHaveBeenCalledTimes(1);
    // Tolerância generosa: o importante é que B NÃO esperou ~500ms.
    expect(elapsed).toBeLessThan(WAIT_TIMEOUT / 2);

    dA.resolve('late');
    await pA.catch(() => {});
  });

  it('lock expirado + corrida de 2 chamadas paralelas em B → fetcher dispara 1x só (inflight local)', async () => {
    const KEY = 'expire:race:k';
    const LOCK_TTL = 80;

    // A trava o lock e expira.
    const dA = makeDeferred<string>();
    const fetcherA = vi.fn(() => dA.promise);
    const pA = tabA.dedupedFetch(KEY, fetcherA, {
      lockTtl: LOCK_TTL,
      resultTtl: 5_000,
      waitTimeout: 50,
    });
    await sleep(10);
    await sleep(LOCK_TTL + 50); // lock expira

    // B dispara DUAS chamadas concorrentes para a mesma chave: o inflight
    // local da própria aba B deve garantir que apenas 1 chamada de rede
    // ocorre — mesmo após a expiração do lock cross-tab.
    const fetcherB = vi.fn(async () => {
      await sleep(20);
      return 'B-once';
    });
    const [r1, r2] = await Promise.all([
      tabB.dedupedFetch(KEY, fetcherB, { lockTtl: LOCK_TTL, resultTtl: 5_000 }),
      tabB.dedupedFetch(KEY, fetcherB, { lockTtl: LOCK_TTL, resultTtl: 5_000 }),
    ]);

    expect(r1).toBe('B-once');
    expect(r2).toBe('B-once');
    expect(fetcherB).toHaveBeenCalledTimes(1); // ← inflight dedupe local

    dA.resolve('late');
    await pA.catch(() => {});
  });

  it('resultado tardio de A (após lock expirar) NÃO substitui resultado já entregue por B', async () => {
    // Cobre o cenário em que A finalmente responde DEPOIS de B já ter
    // entregue um resultado próprio. A deve cachear/broadcastar o seu
    // resultado, mas as chamadas subsequentes de B podem usar EITHER cache
    // — o importante é: nenhuma chamada extra de rede além das 2 esperadas
    // (1 de A original + 1 de B), e o resultado retornado a B continua
    // sendo o que B mediu, não o de A.
    const KEY = 'expire:late:k';
    const LOCK_TTL = 80;

    const dA = makeDeferred<string>();
    const fetcherA = vi.fn(() => dA.promise);
    const pA = tabA.dedupedFetch(KEY, fetcherA, {
      lockTtl: LOCK_TTL,
      resultTtl: 5_000,
      waitTimeout: 30,
    });
    await sleep(10);
    await sleep(LOCK_TTL + 50);

    const fetcherB = vi.fn(async () => 'B-wins');
    const resB = await tabB.dedupedFetch(KEY, fetcherB, {
      lockTtl: LOCK_TTL,
      resultTtl: 5_000,
    });
    expect(resB).toBe('B-wins');
    expect(fetcherB).toHaveBeenCalledTimes(1);

    // Agora A finalmente responde — não deve disparar fetcher novo em ninguém.
    dA.resolve('A-late');
    await pA.catch(() => {});

    // Outra chamada de B na sequência reaproveita cache (de B ou de A —
    // ambos válidos), mas SEM nova chamada de rede.
    const fetcherB2 = vi.fn(async () => 'should-not-run');
    const resB2 = await tabB.dedupedFetch(KEY, fetcherB2, { resultTtl: 5_000 });
    expect(fetcherB2).not.toHaveBeenCalled();
    // resB2 pode ser 'B-wins' ou 'A-late' dependendo de qual escreveu por
    // último no cache persistente — ambos representam dedupe correto.
    expect(['B-wins', 'A-late']).toContain(resB2);
  });
});
