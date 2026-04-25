/**
 * crossTabDedupe — Integração: comportamento sob falha do fetcher.
 *
 * Garante que quando a aba LÍDER falha (rejeição da Promise do fetcher):
 *   1. Aba seguidora (B) faz EXATAMENTE 1 nova tentativa local (fallback)
 *      em vez de propagar o mesmo erro indefinidamente.
 *   2. O lock é liberado de forma confiável — chamadas subsequentes não
 *      ficam presas esperando broadcast antigo de uma chave "morta".
 *   3. Se TODAS as abas falham, o erro é propagado naturalmente, mas o
 *      sistema fica pronto para tentar de novo (sem lock residual).
 *   4. Mesmo sob race entre A e B com falha, o total de chamadas de rede
 *      é exatamente: 1 da líder + 1 do fallback de quem aguardava.
 *
 * Estratégia:
 *   - vi.resetModules para criar TAB_IDs distintos compartilhando localStorage
 *     e BroadcastChannel do jsdom (igual aos outros testes multi-aba).
 *   - Usamos Deferred para controlar o instante em que A rejeita.
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

describe('crossTabDedupe — falha do fetcher entre abas', () => {
  let tabA: DedupeModule;
  let tabB: DedupeModule;

  beforeEach(async () => {
    clearAllDedupeKeys();
    tabA = await loadTab();
    tabB = await loadTab();
    expect(tabA.__TAB_ID).not.toBe(tabB.__TAB_ID);
  });

  afterEach(() => {
    tabA?.clearCrossTabDedupe();
    tabB?.clearCrossTabDedupe();
    clearAllDedupeKeys();
  });

  it('aba A falha → aba B retenta EXATAMENTE 1 vez localmente e devolve sucesso', async () => {
    const KEY = 'fail:retry-once:k';
    const dA = makeDeferred<string>();
    // Líder falha após pequeno atraso (segura o lock primeiro).
    const fetcherA = vi.fn(() => dA.promise);
    const pA = tabA.dedupedFetch(KEY, fetcherA, {
      lockTtl: 5_000,
      waitTimeout: 2_000,
    }).catch((e) => e); // capturamos o erro pra não poluir teste

    await sleep(10); // A pega o lock
    // Sanity: lock pertence a A
    const lockRaw = localStorage.getItem(`ctd:lock:${KEY}`);
    expect(lockRaw && JSON.parse(lockRaw).ownerId).toBe(tabA.__TAB_ID);

    // B começa enquanto A ainda detém o lock — entra em waitForResult.
    const fetcherB = vi.fn(async () => 'B-recovery');
    const pB = tabB.dedupedFetch(KEY, fetcherB, {
      lockTtl: 5_000,
      waitTimeout: 2_000,
    });

    // Pequeno tick para garantir que B já está aguardando broadcast.
    await sleep(20);

    // A falha → broadcasta erro + libera lock. B sai do wait com {ok:false}
    // e cai no fallback executando seu próprio fetcher 1x.
    dA.reject(new Error('A-network-fail'));

    const resB = await pB;
    expect(resB).toBe('B-recovery');
    expect(fetcherB).toHaveBeenCalledTimes(1); // ← 1 retry, não múltiplas

    const errA = await pA;
    expect(errA).toBeInstanceOf(Error);
    expect((errA as Error).message).toBe('A-network-fail');
  });

  it('lock é liberado após falha — chave NÃO trava o sistema para chamadas futuras', async () => {
    const KEY = 'fail:no-lock-stall:k';

    // Aba A falha imediatamente.
    const fetcherA = vi.fn(async () => {
      throw new Error('boom');
    });
    await expect(
      tabA.dedupedFetch(KEY, fetcherA, { lockTtl: 5_000 }),
    ).rejects.toThrow('boom');

    // Pequeno tick para o `release` broadcast ser entregue.
    await sleep(20);

    // O lock NÃO pode ter ficado para trás.
    expect(localStorage.getItem(`ctd:lock:${KEY}`)).toBeNull();

    // Próxima chamada (qualquer aba) deve adquirir lock e executar
    // imediatamente — sem ficar presa esperando broadcast antigo.
    const fetcherB = vi.fn(async () => 'recovered');
    const t0 = Date.now();
    const resB = await tabB.dedupedFetch(KEY, fetcherB, {
      lockTtl: 5_000,
      waitTimeout: 5_000, // grande de propósito; deve resolver muito antes
    });
    const elapsed = Date.now() - t0;

    expect(resB).toBe('recovered');
    expect(fetcherB).toHaveBeenCalledTimes(1);
    expect(elapsed).toBeLessThan(500); // rápido — não houve espera de broadcast
  });

  it('B aguardando: erro broadcastado por A acorda B IMEDIATAMENTE (sem esperar waitTimeout)', async () => {
    const KEY = 'fail:fast-wakeup:k';
    const WAIT_TIMEOUT = 5_000; // exagerado de propósito

    const dA = makeDeferred<string>();
    const fetcherA = vi.fn(() => dA.promise);
    const pA = tabA.dedupedFetch(KEY, fetcherA, {
      lockTtl: 10_000,
      waitTimeout: 1_000,
    }).catch((e) => e);

    await sleep(10);

    const fetcherB = vi.fn(async () => 'B-took-over');
    const t0 = Date.now();
    const pB = tabB.dedupedFetch(KEY, fetcherB, {
      lockTtl: 10_000,
      waitTimeout: WAIT_TIMEOUT,
    });
    await sleep(20); // garante que B está em waitForResult

    dA.reject(new Error('upstream-500'));

    const resB = await pB;
    const elapsed = Date.now() - t0;

    expect(resB).toBe('B-took-over');
    expect(fetcherB).toHaveBeenCalledTimes(1);
    // Acordou via broadcast de erro — NÃO esperou o waitTimeout cheio.
    expect(elapsed).toBeLessThan(WAIT_TIMEOUT / 2);

    await pA; // não interfere
  });

  it('falha em A e em B (fallback) → erro propaga, mas chave fica limpa para nova tentativa', async () => {
    const KEY = 'fail:both:k';

    const fetcherA = vi.fn(async () => { throw new Error('A-fail'); });
    const fetcherB = vi.fn(async () => { throw new Error('B-fail'); });

    // A falha primeiro.
    await expect(
      tabA.dedupedFetch(KEY, fetcherA, { lockTtl: 5_000 }),
    ).rejects.toThrow('A-fail');

    await sleep(15);

    // B tenta agora — pega lock (A já liberou) e também falha.
    await expect(
      tabB.dedupedFetch(KEY, fetcherB, { lockTtl: 5_000 }),
    ).rejects.toThrow('B-fail');

    // Cada lado executou exatamente 1x.
    expect(fetcherA).toHaveBeenCalledTimes(1);
    expect(fetcherB).toHaveBeenCalledTimes(1);

    await sleep(15);
    // Lock está limpo — sistema NÃO travou.
    expect(localStorage.getItem(`ctd:lock:${KEY}`)).toBeNull();
    // Sem resultado em cache — próxima chamada de qualquer aba executa.
    expect(localStorage.getItem(`ctd:result:${KEY}`)).toBeNull();

    // Confirma destravado: nova tentativa funciona.
    const fetcherC = vi.fn(async () => 'finally-ok');
    const resC = await tabA.dedupedFetch(KEY, fetcherC, { lockTtl: 5_000 });
    expect(resC).toBe('finally-ok');
    expect(fetcherC).toHaveBeenCalledTimes(1);
  });

  it('race com falha: A e B começam juntos, líder falha → seguidor faz fallback com EXATAMENTE 1 chamada', async () => {
    const KEY = 'fail:race:k';

    // Ambos os fetchers contam — só um vence o lock; o outro entra em wait
    // e, ao receber broadcast de erro, executa seu fetcher como fallback.
    const dA = makeDeferred<string>();
    const fetcherA = vi.fn(() => dA.promise); // vai falhar
    const fetcherB = vi.fn(async () => 'B-wins-after-fail');

    const pA = tabA.dedupedFetch(KEY, fetcherA, {
      lockTtl: 5_000,
      waitTimeout: 2_000,
    }).catch((e) => e);
    const pB = tabB.dedupedFetch(KEY, fetcherB, {
      lockTtl: 5_000,
      waitTimeout: 2_000,
    }).catch((e) => e);

    await sleep(20);
    dA.reject(new Error('race-fail'));

    const [rA, rB] = await Promise.all([pA, pB]);

    // Caminhos possíveis:
    //   - A pegou o lock e falhou → B aguardou e fez fallback (B-wins-after-fail).
    //   - B pegou o lock e teve sucesso → A aguardou e recebeu B-wins-after-fail.
    // Em AMBOS, fetcherB roda exatamente 1x (e fetcherA 1x), e o seguidor
    // recebe o resultado/erro coerente.
    const aWasLeader = fetcherA.mock.calls.length === 1 && rA instanceof Error;
    const bWasLeader = fetcherB.mock.calls.length === 1 && rB === 'B-wins-after-fail';
    expect(aWasLeader || bWasLeader).toBe(true);
    expect(fetcherA).toHaveBeenCalledTimes(1);
    expect(fetcherB).toHaveBeenCalledTimes(1); // EXATAMENTE 1 fallback

    if (aWasLeader) {
      expect(rB).toBe('B-wins-after-fail'); // seguidor B se recuperou
    } else {
      // B foi líder e teve sucesso; A virou seguidor e recebe o sucesso de B.
      expect(rA).toBe('B-wins-after-fail');
    }

    await sleep(15);
    expect(localStorage.getItem(`ctd:lock:${KEY}`)).toBeNull();
  });
});
