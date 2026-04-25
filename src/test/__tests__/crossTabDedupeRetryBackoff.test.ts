/**
 * Garante que dedupedFetch não fica preso em lock quando o fetcher falha:
 *   - Libera o lock entre tentativas (libera waiters em outras abas).
 *   - Re-tenta com backoff exponencial conforme `retry.maxRetries`.
 *   - Honra `shouldRetry` para abortar antes do limite.
 *   - Quando esgotam os retries, propaga o erro e deixa o lock livre para o próximo caller.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  dedupedFetch,
  clearCrossTabDedupe,
  LS_PREFIX,
} from '@/lib/realtime/crossTabDedupe';

const flushTimers = async () => {
  // Avança backoff (+ jitter ~30%): 1s cobre os defaults de teste.
  await vi.advanceTimersByTimeAsync(8_000);
};

describe('crossTabDedupe — fallback / retry com backoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearCrossTabDedupe();
  });

  it('re-tenta o fetcher até maxRetries quando ele falha', async () => {
    const fetcher = vi.fn()
      .mockRejectedValueOnce(new Error('boom-1'))
      .mockRejectedValueOnce(new Error('boom-2'))
      .mockResolvedValueOnce({ ok: true });

    const p = dedupedFetch('inbox:v2:initial:test:50', fetcher, {
      retry: { maxRetries: 2, baseDelayMs: 50, maxDelayMs: 200 },
    });
    // Anexa handler imediatamente para evitar unhandled rejection durante drenagem.
    const tracked = p.then((v) => ({ ok: true as const, v }), (e) => ({ ok: false as const, e }));
    for (let i = 0; i < 10; i++) {
      await Promise.resolve();
      await flushTimers();
    }
    await expect(tracked).resolves.toEqual({ ok: true, v: { ok: true } });
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(localStorage.getItem(LS_PREFIX + 'inbox:v2:initial:test:50')).toBeNull();
  });

  it('libera o lock quando todas as tentativas falham', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('always-fails'));
    const key = 'inbox:v2:initial:fail:50';

    const p = dedupedFetch(key, fetcher, {
      retry: { maxRetries: 2, baseDelayMs: 30, maxDelayMs: 100 },
    });
    const tracked = p.then((v) => ({ ok: true as const, v }), (e) => ({ ok: false as const, msg: (e as Error).message }));
    for (let i = 0; i < 10; i++) {
      await Promise.resolve();
      await flushTimers();
    }
    await expect(tracked).resolves.toEqual({ ok: false, msg: 'always-fails' });
    expect(fetcher).toHaveBeenCalledTimes(3);
    // Lock NÃO permanece preso após a falha definitiva.
    expect(localStorage.getItem(LS_PREFIX + key)).toBeNull();

    // Próximo caller consegue executar normalmente (não está preso).
    const fetcher2 = vi.fn().mockResolvedValue({ recovered: true });
    await expect(dedupedFetch(key, fetcher2)).resolves.toEqual({ recovered: true });
    expect(fetcher2).toHaveBeenCalledTimes(1);
  });

  it('respeita shouldRetry=false para abortar imediatamente', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('aborted'));
    const key = 'inbox:v2:older:abort:before:50';

    const p = dedupedFetch(key, fetcher, {
      retry: {
        maxRetries: 5,
        baseDelayMs: 30,
        shouldRetry: () => false,
      },
    });
    await expect(p).rejects.toThrow('aborted');
    // Sem retry → 1 única chamada, lock livre.
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(LS_PREFIX + key)).toBeNull();
  });

  it('sem retry configurado mantém comportamento legado (1 tentativa, lock liberado)', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('no-retry'));
    const key = 'inbox:v2:initial:legacy:50';

    await expect(dedupedFetch(key, fetcher)).rejects.toThrow('no-retry');
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(LS_PREFIX + key)).toBeNull();
  });
});
