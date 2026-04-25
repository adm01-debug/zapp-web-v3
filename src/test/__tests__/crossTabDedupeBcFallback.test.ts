import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Verifica que crossTabDedupe funciona corretamente quando BroadcastChannel
 * NÃO está disponível (ex.: Safari antigo, sandboxes restritos), caindo no
 * transporte alternativo via `storage` event.
 *
 * Estratégia: removemos `globalThis.BroadcastChannel` ANTES de re-importar
 * o módulo (vi.resetModules) — o módulo expõe `__getActiveTransport()` para
 * inspeção do transporte ativo.
 */
describe('crossTabDedupe — fallback sem BroadcastChannel', () => {
  let originalBC: typeof BroadcastChannel | undefined;

  beforeEach(() => {
    originalBC = (globalThis as { BroadcastChannel?: typeof BroadcastChannel }).BroadcastChannel;
    // Força ausência de BroadcastChannel.
    delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
    vi.resetModules();
    try { localStorage.clear(); } catch { /* noop */ }
  });

  afterEach(() => {
    if (originalBC) {
      (globalThis as { BroadcastChannel?: typeof BroadcastChannel }).BroadcastChannel = originalBC;
    }
    try { localStorage.clear(); } catch { /* noop */ }
  });

  it('elege transporte storage-event quando BroadcastChannel está indisponível', async () => {
    const mod = await import('@/lib/realtime/crossTabDedupe');
    const result = await mod.dedupedFetch('fallback:k1', async () => 'value-1');
    expect(result).toBe('value-1');
    expect(mod.__getActiveTransport()).toBe('storage-event');
  });

  it('inflight + cache continuam funcionando dentro da mesma aba sem BC', async () => {
    const mod = await import('@/lib/realtime/crossTabDedupe');
    const fetcher = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return 'shared';
    });
    const results = await Promise.all(
      Array.from({ length: 4 }, () => mod.dedupedFetch('fallback:k2', fetcher)),
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(results.every((r) => r === 'shared')).toBe(true);
    // Segunda chamada: cache hit (não dispara fetcher de novo).
    await mod.dedupedFetch('fallback:k2', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('subscribeDedupe é notificado quando o próprio fetcher conclui (source=local)', async () => {
    const mod = await import('@/lib/realtime/crossTabDedupe');
    const handler = vi.fn();
    const unsub = mod.subscribeDedupe<string>('fallback:sub', handler);
    await mod.dedupedFetch('fallback:sub:k', async () => 'payload');
    expect(handler).toHaveBeenCalledWith('fallback:sub:k', 'payload', 'local');
    unsub();
  });

  it('publica payload no slot de bus do localStorage para outras abas observarem', async () => {
    const mod = await import('@/lib/realtime/crossTabDedupe');
    await mod.dedupedFetch('fallback:bus:k', async () => ({ ok: true }));
    // O slot é apagado após ~250ms (sinalização). Como o teste roda síncrono
    // após o setTimeout, validamos via spy:
    const spy = vi.spyOn(localStorage.__proto__, 'setItem');
    await mod.dedupedFetch('fallback:bus:k2', async () => ({ ok: true }));
    const busSets = spy.mock.calls.filter(([k]) => typeof k === 'string' && (k as string).startsWith('ctd:bus:'));
    expect(busSets.length).toBeGreaterThan(0);
    spy.mockRestore();
  });
});
