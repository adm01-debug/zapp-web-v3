import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  canCall,
  recordSuccess,
  recordFailure,
  inspect,
  CircuitOpenError,
  subscribeBreakerEvents,
  getAllBreakerStates,
  __resetBreakerState,
  __setBreakerNow,
  DEFAULT_BREAKER_CONFIG,
  type BreakerEvent,
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

  it('emits a transition event when CLOSED → OPEN', () => {
    const cfg = { failureThreshold: 2, cooldownMs: 7_000 };
    const events: BreakerEvent[] = [];
    subscribeBreakerEvents((e) => events.push(e));
    recordFailure('i', cfg); // still CLOSED — no event
    expect(events).toHaveLength(0);
    recordFailure('i', cfg); // CLOSED → OPEN
    expect(events).toHaveLength(1);
    expect(events[0].from).toBe('CLOSED');
    expect(events[0].to).toBe('OPEN');
    expect(events[0].instance).toBe('i');
    expect(events[0].consecutiveFailures).toBe(2);
    expect(events[0].cooldownMs).toBe(7_000);
    expect(events[0].tag).toBe('evolution-breaker');
  });

  it('emits OPEN → HALF_OPEN on cooldown elapsed', () => {
    const cfg = { failureThreshold: 1, cooldownMs: 5_000 };
    const events: BreakerEvent[] = [];
    subscribeBreakerEvents((e) => events.push(e));
    recordFailure('i', cfg); // → OPEN (1st event)
    mockNow += 5_001;
    canCall('i', cfg); // → HALF_OPEN (2nd event)
    expect(events).toHaveLength(2);
    expect(events[1].from).toBe('OPEN');
    expect(events[1].to).toBe('HALF_OPEN');
    expect(events[1].cooldownMs).toBeNull();
  });

  it('emits HALF_OPEN → OPEN on probe failure', () => {
    const cfg = { failureThreshold: 1, cooldownMs: 5_000 };
    const events: BreakerEvent[] = [];
    subscribeBreakerEvents((e) => events.push(e));
    recordFailure('i', cfg); // → OPEN
    mockNow += 5_001;
    canCall('i', cfg); // → HALF_OPEN
    recordFailure('i', cfg); // → OPEN
    expect(events.map(e => `${e.from}->${e.to}`)).toEqual([
      'CLOSED->OPEN',
      'OPEN->HALF_OPEN',
      'HALF_OPEN->OPEN',
    ]);
  });

  it('emits HALF_OPEN → CLOSED on probe success', () => {
    const cfg = { failureThreshold: 1, cooldownMs: 5_000 };
    const events: BreakerEvent[] = [];
    subscribeBreakerEvents((e) => events.push(e));
    recordFailure('i', cfg); // → OPEN
    mockNow += 5_001;
    canCall('i', cfg); // → HALF_OPEN
    recordSuccess('i'); // → CLOSED
    expect(events[events.length - 1].from).toBe('HALF_OPEN');
    expect(events[events.length - 1].to).toBe('CLOSED');
  });

  it('does NOT emit when recording success on already-CLOSED instance with no failures', () => {
    const events: BreakerEvent[] = [];
    subscribeBreakerEvents((e) => events.push(e));
    recordSuccess('untouched');
    expect(events).toHaveLength(0);
  });

  it('subscriber errors do not break the breaker', () => {
    const cfg = { failureThreshold: 1, cooldownMs: 5_000 };
    subscribeBreakerEvents(() => { throw new Error('boom'); });
    // Recording the failure must still trip the breaker even when the subscriber throws.
    expect(() => recordFailure('i', cfg)).not.toThrow();
    expect(inspect('i').state).toBe('OPEN');
  });

  it('unsubscribe stops delivering events', () => {
    const cfg = { failureThreshold: 1, cooldownMs: 5_000 };
    const seen: BreakerEvent[] = [];
    const unsub = subscribeBreakerEvents((e) => seen.push(e));
    recordFailure('a', cfg); // → OPEN, event 1
    unsub();
    recordSuccess('a'); // would be event 2, but we unsubscribed
    expect(seen).toHaveLength(1);
  });

  it('getAllBreakerStates returns snapshot of every tracked instance', () => {
    const cfg = { failureThreshold: 2, cooldownMs: 5_000 };
    recordFailure('a', cfg);
    recordFailure('b', cfg);
    recordFailure('b', cfg); // b → OPEN
    const all = getAllBreakerStates();
    const byInst = Object.fromEntries(all.map(s => [s.instance, s]));
    expect(byInst.a.state).toBe('CLOSED');
    expect(byInst.a.consecutiveFailures).toBe(1);
    expect(byInst.b.state).toBe('OPEN');
    expect(byInst.b.consecutiveFailures).toBe(2);
  });

  it('event timestamps are ISO-8601 strings derived from the breaker clock', () => {
    const cfg = { failureThreshold: 1, cooldownMs: 5_000 };
    const events: BreakerEvent[] = [];
    subscribeBreakerEvents((e) => events.push(e));
    mockNow = Date.UTC(2026, 3, 26, 12, 0, 0); // 2026-04-26T12:00:00Z
    recordFailure('i', cfg);
    expect(events[0].ts).toBe('2026-04-26T12:00:00.000Z');
  });
});
