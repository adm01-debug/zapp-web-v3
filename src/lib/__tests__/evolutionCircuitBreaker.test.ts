import { describe, it, expect, beforeEach } from 'vitest';
import {
  canCall,
  recordSuccess,
  recordFailure,
  inspect,
  CircuitOpenError,
  __resetBreakerState,
  __setBreakerNow,
  DEFAULT_BREAKER_CONFIG,
} from '@/lib/evolutionCircuitBreaker';

describe('evolutionCircuitBreaker', () => {
  let mockNow = 1_000_000;
  beforeEach(() => {
    __resetBreakerState();
    mockNow = 1_000_000;
    __setBreakerNow(() => mockNow);
  });

  it('starts CLOSED and allows calls', () => {
    const r = canCall('inst1');
    expect(r.allowed).toBe(true);
    if (r.allowed) expect(r.state).toBe('CLOSED');
  });

  it('opens after N consecutive failures', () => {
    const cfg = { failureThreshold: 3, cooldownMs: 5_000 };
    expect(recordFailure('i', cfg).state).toBe('CLOSED');
    expect(recordFailure('i', cfg).state).toBe('CLOSED');
    expect(recordFailure('i', cfg).state).toBe('OPEN');
    const r = canCall('i', cfg);
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.retryAfterMs).toBeGreaterThan(0);
  });

  it('uses default threshold (5) when no config provided', () => {
    for (let i = 0; i < DEFAULT_BREAKER_CONFIG.failureThreshold - 1; i++) {
      expect(recordFailure('i').state).toBe('CLOSED');
    }
    expect(recordFailure('i').state).toBe('OPEN');
  });

  it('success resets the counter and closes if open', () => {
    const cfg = { failureThreshold: 2, cooldownMs: 5_000 };
    recordFailure('i', cfg);
    recordFailure('i', cfg);
    expect(inspect('i').state).toBe('OPEN');
    recordSuccess('i');
    expect(inspect('i').state).toBe('CLOSED');
    expect(inspect('i').consecutiveFailures).toBe(0);
  });

  it('rejects fast while OPEN, returns retryAfterMs', () => {
    const cfg = { failureThreshold: 1, cooldownMs: 10_000 };
    recordFailure('i', cfg);
    const r = canCall('i', cfg);
    expect(r.allowed).toBe(false);
    if (!r.allowed) {
      expect(r.retryAfterMs).toBeGreaterThan(9_900);
      expect(r.retryAfterMs).toBeLessThanOrEqual(10_000);
    }
  });

  it('transitions OPEN → HALF_OPEN once cooldown elapses', () => {
    const cfg = { failureThreshold: 1, cooldownMs: 5_000 };
    recordFailure('i', cfg);
    expect(canCall('i', cfg).allowed).toBe(false);

    mockNow += 5_001;
    const r = canCall('i', cfg);
    expect(r.allowed).toBe(true);
    if (r.allowed) expect(r.state).toBe('HALF_OPEN');
  });

  it('HALF_OPEN probe success → CLOSED', () => {
    const cfg = { failureThreshold: 1, cooldownMs: 5_000 };
    recordFailure('i', cfg);
    mockNow += 5_001;
    canCall('i', cfg); // transitions to HALF_OPEN
    recordSuccess('i');
    expect(inspect('i').state).toBe('CLOSED');
  });

  it('HALF_OPEN probe failure → OPEN with fresh cooldown', () => {
    const cfg = { failureThreshold: 1, cooldownMs: 5_000 };
    recordFailure('i', cfg);
    mockNow += 5_001;
    canCall('i', cfg); // → HALF_OPEN
    expect(inspect('i').state).toBe('HALF_OPEN');

    const before = mockNow;
    recordFailure('i', cfg);
    expect(inspect('i').state).toBe('OPEN');
    expect(inspect('i').openUntil).toBe(before + 5_000);
  });

  it('different instances are independent', () => {
    const cfg = { failureThreshold: 2, cooldownMs: 5_000 };
    recordFailure('a', cfg);
    recordFailure('a', cfg);
    expect(inspect('a').state).toBe('OPEN');
    expect(inspect('b').state).toBe('CLOSED');
    expect(canCall('b', cfg).allowed).toBe(true);
  });

  it('CircuitOpenError carries instance + retryAfterMs', () => {
    const err = new CircuitOpenError('wpp2', 30_000);
    expect(err.code).toBe('circuit_open');
    expect(err.retryAfterMs).toBe(30_000);
    expect(err.message).toContain('wpp2');
    expect(err.message).toMatch(/30s/);
    expect(err.name).toBe('CircuitOpenError');
  });

  it('mid-cooldown retry stays OPEN', () => {
    const cfg = { failureThreshold: 1, cooldownMs: 10_000 };
    recordFailure('i', cfg);
    mockNow += 5_000; // halfway
    const r = canCall('i', cfg);
    expect(r.allowed).toBe(false);
    if (!r.allowed) {
      expect(r.retryAfterMs).toBeLessThanOrEqual(5_000);
      expect(r.retryAfterMs).toBeGreaterThan(4_900);
    }
  });

  it('inspect does not mutate state', () => {
    const cfg = { failureThreshold: 5, cooldownMs: 5_000 };
    recordFailure('i', cfg);
    const before = inspect('i');
    inspect('i');
    inspect('i');
    const after = inspect('i');
    expect(after).toEqual(before);
  });
});
