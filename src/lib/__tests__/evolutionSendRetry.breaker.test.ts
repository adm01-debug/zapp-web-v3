import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invokeEvolutionWithRetry } from '@/lib/evolutionSendRetry';
import {
  inspect as inspectBreaker,
  __resetBreakerState,
  DEFAULT_BREAKER_CONFIG,
  CircuitOpenError,
} from '@/lib/evolutionCircuitBreaker';

// Mocks for the surface invokeEvolutionWithRetry actually calls.
const invokeMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
  },
}));

const enqueueDlqMock = vi.fn();
vi.mock('@/lib/failedMessagesEnqueue', () => ({
  enqueueClientFailedMessage: (row: unknown) => enqueueDlqMock(row),
}));

vi.mock('@/lib/retryConfig', () => ({
  loadRetryConfig: vi.fn().mockResolvedValue({
    maxRetries: 1,         // no in-loop retries — keeps the test fast and lets the breaker count each call as one failure
    baseBackoffMs: 0,
    maxBackoffMs: 0,
    timeoutMs: 5_000,
  }),
}));

vi.mock('@/lib/crossTabSendDedupe', () => ({
  // Bypass cross-tab leadership so every call runs locally.
  crossTabDedupe: <T,>(_key: string, fn: () => Promise<T>) => fn(),
}));

vi.mock('@/lib/requestDedupeKey', () => ({
  buildRequestDedupeKey: vi.fn().mockResolvedValue('k'),
}));

vi.mock('@/lib/sendFunctionRouter', () => ({
  resolveSendFunction: vi.fn().mockResolvedValue('evolution-api'),
}));

vi.mock('@/lib/logger', () => ({
  getLogger: () => ({
    error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn(),
  }),
}));

vi.mock('@/lib/retry', async () => {
  // Keep the production withRetry behaviour but with no jitter / no real sleeps.
  return {
    withRetry: async <T,>(fn: () => Promise<T>, opts: {
      maxRetries: number;
      shouldRetry?: (err: unknown) => boolean;
      onRetry?: (err: unknown, attempt: number) => void;
    }) => {
      let attempt = 0;
      let lastErr: unknown;
      while (attempt < opts.maxRetries) {
        attempt++;
        try {
          return await fn();
        } catch (err) {
          lastErr = err;
          const retry = opts.shouldRetry ? opts.shouldRetry(err) : true;
          if (!retry || attempt >= opts.maxRetries) throw err;
          opts.onRetry?.(err, attempt);
        }
      }
      throw lastErr;
    },
  };
});

const INSTANCE = 'wpp-test';

function transientError() {
  return Object.assign(new Error('Network timeout'), { status: 503 });
}

describe('invokeEvolutionWithRetry — circuit breaker integration', () => {
  beforeEach(() => {
    __resetBreakerState();
    invokeMock.mockReset();
    enqueueDlqMock.mockReset();
  });

  it('records success → breaker stays CLOSED', async () => {
    invokeMock.mockResolvedValue({ data: { ok: true }, error: null });
    await invokeEvolutionWithRetry('send-text', { body: { instanceName: INSTANCE, number: '5511' } });
    expect(inspectBreaker(INSTANCE).state).toBe('CLOSED');
    expect(inspectBreaker(INSTANCE).consecutiveFailures).toBe(0);
  });

  it('records transient failure → breaker counter increments', async () => {
    invokeMock.mockResolvedValue({ data: null, error: transientError() });
    await expect(
      invokeEvolutionWithRetry('send-text', { body: { instanceName: INSTANCE } })
    ).rejects.toBeInstanceOf(Error);
    expect(inspectBreaker(INSTANCE).consecutiveFailures).toBe(1);
    expect(inspectBreaker(INSTANCE).state).toBe('CLOSED'); // still under threshold
  });

  it('opens after N consecutive transient failures', async () => {
    invokeMock.mockResolvedValue({ data: null, error: transientError() });
    for (let i = 0; i < DEFAULT_BREAKER_CONFIG.failureThreshold; i++) {
      await invokeEvolutionWithRetry('send-text', { body: { instanceName: INSTANCE } })
        .catch(() => undefined);
    }
    expect(inspectBreaker(INSTANCE).state).toBe('OPEN');
  });

  it('rejects fast with CircuitOpenError when circuit is OPEN', async () => {
    // Trip the breaker.
    invokeMock.mockResolvedValue({ data: null, error: transientError() });
    for (let i = 0; i < DEFAULT_BREAKER_CONFIG.failureThreshold; i++) {
      await invokeEvolutionWithRetry('send-text', { body: { instanceName: INSTANCE } })
        .catch(() => undefined);
    }
    expect(inspectBreaker(INSTANCE).state).toBe('OPEN');

    invokeMock.mockClear();
    enqueueDlqMock.mockClear();

    // Next call must throw CircuitOpenError WITHOUT calling supabase.invoke.
    await expect(
      invokeEvolutionWithRetry('send-text', { body: { instanceName: INSTANCE, number: '5511' } })
    ).rejects.toBeInstanceOf(CircuitOpenError);
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('CircuitOpenError still enqueues to DLQ with error_code=circuit_open', async () => {
    invokeMock.mockResolvedValue({ data: null, error: transientError() });
    for (let i = 0; i < DEFAULT_BREAKER_CONFIG.failureThreshold; i++) {
      await invokeEvolutionWithRetry('send-text', { body: { instanceName: INSTANCE } })
        .catch(() => undefined);
    }
    enqueueDlqMock.mockClear();

    await invokeEvolutionWithRetry('send-text', {
      body: { instanceName: INSTANCE, number: '5511', text: 'hi' },
    }).catch(() => undefined);

    expect(enqueueDlqMock).toHaveBeenCalledTimes(1);
    const row = enqueueDlqMock.mock.calls[0][0] as { error_code?: string; instance_name?: string };
    expect(row.error_code).toBe('circuit_open');
    expect(row.instance_name).toBe(INSTANCE);
  });

  it('success after failure resets the breaker counter', async () => {
    // First call fails (transient).
    invokeMock.mockResolvedValueOnce({ data: null, error: transientError() });
    await invokeEvolutionWithRetry('send-text', { body: { instanceName: INSTANCE } })
      .catch(() => undefined);
    expect(inspectBreaker(INSTANCE).consecutiveFailures).toBe(1);

    // Second call succeeds — counter resets.
    invokeMock.mockResolvedValueOnce({ data: { ok: true }, error: null });
    await invokeEvolutionWithRetry('send-text', { body: { instanceName: INSTANCE } });
    expect(inspectBreaker(INSTANCE).state).toBe('CLOSED');
    expect(inspectBreaker(INSTANCE).consecutiveFailures).toBe(0);
  });

  it('breaker is per-instance: tripping A does not affect B', async () => {
    invokeMock.mockResolvedValue({ data: null, error: transientError() });
    const a = 'wpp-a';
    const b = 'wpp-b';
    for (let i = 0; i < DEFAULT_BREAKER_CONFIG.failureThreshold; i++) {
      await invokeEvolutionWithRetry('send-text', { body: { instanceName: a } })
        .catch(() => undefined);
    }
    expect(inspectBreaker(a).state).toBe('OPEN');
    expect(inspectBreaker(b).state).toBe('CLOSED');

    invokeMock.mockResolvedValueOnce({ data: { ok: true }, error: null });
    await invokeEvolutionWithRetry('send-text', { body: { instanceName: b } });
    expect(inspectBreaker(b).state).toBe('CLOSED');
  });

  it('non-transient error (4xx) does NOT count toward the breaker', async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: Object.assign(new Error('Bad request'), { status: 400 }),
    });
    await invokeEvolutionWithRetry('send-text', { body: { instanceName: INSTANCE } });
    expect(inspectBreaker(INSTANCE).consecutiveFailures).toBe(0);
    expect(inspectBreaker(INSTANCE).state).toBe('CLOSED');
  });
});
