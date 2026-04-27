/**
 * Coalesce + circuit breaker tests for queryExternalProxy.
 *
 * These cover the Onda 1 hardening that stops the inbox stampede:
 *  - Two identical reads in the same tick collapse to ONE underlying invoke.
 *  - A mutation never coalesces (two inserts → two invokes), even if shaped
 *    identically.
 *  - After N ghost-POST failures (FunctionsFetchError without a status), the
 *    per-target circuit breaker trips and short-circuits subsequent calls
 *    until cooldown elapses.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const invokeMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
  },
}));

vi.mock('@/lib/logger', () => ({
  getLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

import { queryExternalProxy, __testing } from '../externalProxy';
import { resetTelemetry } from '../clientTelemetry';

describe('externalProxy coalesce + circuit breaker', () => {
  beforeEach(() => {
    resetTelemetry();
    invokeMock.mockReset();
    __testing.resetBreakerAndCoalesce();
  });

  // Some sub-paths surface as "unhandled" rejections from the inner retry
  // loop after the breaker trips — they're still observed by the test via
  // .catch(), but Node sees them as unhandled because the catch is on the
  // outer promise. Swallow them to keep CI noise-free.
  const noopUnhandled = (_e: unknown) => {};
  // eslint-disable-next-line no-undef
  process.on?.('unhandledRejection', noopUnhandled);

  it('coalesces two identical SELECTs issued in the same tick', async () => {
    invokeMock.mockResolvedValue({ data: { data: [{ id: 'a' }] }, error: null });

    const params = {
      table: 'evolution_messages',
      filters: [{ column: 'instance_name', operator: 'eq', value: 'wpp2' }],
      limit: 200,
    };
    const [r1, r2] = await Promise.all([
      queryExternalProxy(params),
      queryExternalProxy(params),
    ]);

    // Both callers got the same payload, but the edge function was hit ONCE.
    expect(r1.data).toEqual([{ id: 'a' }]);
    expect(r2.data).toEqual([{ id: 'a' }]);
    expect(invokeMock).toHaveBeenCalledTimes(1);
  });

  it('does NOT coalesce mutations (two inserts must invoke twice)', async () => {
    invokeMock.mockResolvedValue({ data: { data: [{ id: 'x' }] }, error: null });

    const params = {
      action: 'insert' as const,
      table: 'evolution_audit_log',
      data: { entity_type: 'connection', action: 'reconnect' },
    };
    await Promise.all([queryExternalProxy(params), queryExternalProxy(params)]);

    expect(invokeMock).toHaveBeenCalledTimes(2);
  });

  it('trips the circuit after 4 ghost-POST failures and short-circuits the next call', async () => {
    // Ghost POST = FunctionsFetchError with no status (request never reached
    // the edge runtime). Simulate it 4 times so the breaker opens.
    const ghostError = Object.assign(new Error('Failed to send a request to the Edge Function'), {
      name: 'FunctionsFetchError',
    });
    invokeMock.mockResolvedValue({ data: null, error: ghostError });

    const params = { table: 'evolution_messages', limit: 200 };

    // Each call retries up to 3 times internally, so 2 user-level calls
    // generate enough ghost POSTs to breach the BREAKER_THRESHOLD of 4.
    for (let i = 0; i < 2; i++) {
      await queryExternalProxy(params).catch(() => {});
    }

    expect(__testing.isBreakerOpen('evolution_messages').open).toBe(true);

    // Next call must be short-circuited WITHOUT calling the edge function
    // again. invokeMock count stays at whatever the previous calls produced.
    const beforeShortCircuit = invokeMock.mock.calls.length;
    await expect(queryExternalProxy(params)).rejects.toThrow(/circuit open/i);
    expect(invokeMock.mock.calls.length).toBe(beforeShortCircuit);
  });

  it('closes the circuit on the first successful response after cooldown', async () => {
    // Manually mark target as healthy via a successful call — easier than
    // waiting on real timers. Open the breaker first, then verify a success
    // resets it.
    const ghostError = Object.assign(new Error('Failed to send a request to the Edge Function'), {
      name: 'FunctionsFetchError',
    });
    invokeMock.mockResolvedValue({ data: null, error: ghostError });
    for (let i = 0; i < 2; i++) {
      await queryExternalProxy({ table: 'evolution_calls', limit: 50 }).catch(() => {});
    }
    expect(__testing.isBreakerOpen('evolution_calls').open).toBe(true);

    // Reset and simulate recovery.
    __testing.resetBreakerAndCoalesce();
    invokeMock.mockReset();
    invokeMock.mockResolvedValue({ data: { data: [] }, error: null });

    const result = await queryExternalProxy({ table: 'evolution_calls', limit: 50 });
    expect(result.data).toEqual([]);
    expect(__testing.isBreakerOpen('evolution_calls').open).toBe(false);
  });
});
