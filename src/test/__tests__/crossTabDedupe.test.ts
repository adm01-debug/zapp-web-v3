import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  dedupedFetch,
  clearCrossTabDedupe,
  gcExpiredKeys,
} from '@/lib/realtime/crossTabDedupe';

/**
 * Testes do dedupe cross-tab. Como BroadcastChannel + localStorage não são
 * triviais de simular entre abas no mesmo runtime, focamos em:
 *   1. Inflight na mesma aba: chamadas concorrentes compartilham a Promise.
 *   2. Cache de resultado por TTL.
 *   3. Lock cross-tab via localStorage (simulado escrevendo lock de outro tabId).
 *   4. Liberação do lock após sucesso e após erro.
 */

describe('crossTabDedupe', () => {
  beforeEach(() => {
    clearCrossTabDedupe();
  });

  afterEach(() => {
    clearCrossTabDedupe();
  });

  it('dedupe inflight: 5 chamadas concorrentes para mesma key → 1 fetcher', async () => {
    const fetcher = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return 'payload';
    });
    const results = await Promise.all(
      Array.from({ length: 5 }, () => dedupedFetch('k1', fetcher)),
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(results.every((r) => r === 'payload')).toBe(true);
  });

  it('cache por TTL: segunda chamada após primeira completar usa cache', async () => {
    const fetcher = vi.fn(async () => 'cached');
    await dedupedFetch('k2', fetcher);
    await dedupedFetch('k2', fetcher);
    await dedupedFetch('k2', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('cache expira: após resultTtl, refaz a chamada', async () => {
    const fetcher = vi.fn(async () => 'v');
    await dedupedFetch('k3', fetcher, { resultTtl: 50 });
    await new Promise((r) => setTimeout(r, 80));
    await dedupedFetch('k3', fetcher, { resultTtl: 50 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('erro no fetcher é propagado e libera lock para próxima tentativa', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('ok');

    await expect(dedupedFetch('k4', fetcher)).rejects.toThrow('boom');
    const r = await dedupedFetch('k4', fetcher);
    expect(r).toBe('ok');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('lock cross-tab: outra aba detém lock → espera timeout e cai em fallback', async () => {
    // Simula outra aba escrevendo um lock no localStorage.
    const otherLock = {
      ownerId: 'other-tab',
      acquiredAt: Date.now(),
      expiresAt: Date.now() + 10_000,
    };
    localStorage.setItem('ctd:lock:k5', JSON.stringify(otherLock));

    const fetcher = vi.fn(async () => 'fallback-result');
    // waitTimeout curto para o teste não demorar.
    const r = await dedupedFetch('k5', fetcher, { waitTimeout: 50 });
    expect(r).toBe('fallback-result');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('lock expirado de outra aba é ignorado: nova aba pega lock e executa', async () => {
    const expiredLock = {
      ownerId: 'old-tab',
      acquiredAt: Date.now() - 60_000,
      expiresAt: Date.now() - 30_000, // expirado
    };
    localStorage.setItem('ctd:lock:k6', JSON.stringify(expiredLock));

    const fetcher = vi.fn(async () => 'won');
    const r = await dedupedFetch('k6', fetcher);
    expect(r).toBe('won');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('keys distintas executam em paralelo (não dedupam entre si)', async () => {
    const fetcher = vi.fn(async (n: number) => `v-${n}`);
    const [a, b, c] = await Promise.all([
      dedupedFetch('ka', () => fetcher(1)),
      dedupedFetch('kb', () => fetcher(2)),
      dedupedFetch('kc', () => fetcher(3)),
    ]);
    expect(a).toBe('v-1');
    expect(b).toBe('v-2');
    expect(c).toBe('v-3');
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('clearCrossTabDedupe remove cache e locks', async () => {
    const fetcher = vi.fn(async () => 'x');
    await dedupedFetch('k7', fetcher);
    clearCrossTabDedupe();
    await dedupedFetch('k7', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem('ctd:lock:k7')).toBeNull();
  });
});
