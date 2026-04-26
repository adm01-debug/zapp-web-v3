/**
 * Per-instance circuit breaker for `invokeEvolutionWithRetry`.
 *
 * Why: when Evolution is down for an extended window, the existing retry +
 * DLQ pipeline still pays full cost (3 attempts × backoff per send) on every
 * outbound message. A long outage can therefore turn into hundreds of DLQ
 * rows — each one a "failed" toast and an entry in `client_failed_messages`
 * that the reprocess cron has to chew through later.
 *
 * The breaker short-circuits this: after N consecutive transient failures
 * targeting the same instance, subsequent sends fail-fast for a cooldown
 * window. The DLQ still receives the payload (so nothing is lost), but the
 * caller gets an immediate `circuit_open` error instead of a 30s+ retry loop.
 *
 * State machine:
 *   CLOSED   → all requests allowed; failures count toward threshold.
 *   OPEN     → all requests rejected fast until cooldown elapses.
 *   HALF_OPEN → first request after cooldown is allowed as a probe; success
 *               returns to CLOSED, failure returns to OPEN with a fresh cooldown.
 *
 * State is in-memory only (per-tab). Reloading the page resets it. That is
 * intentional — a stale OPEN state shouldn't survive across page loads, and
 * the breaker is a soft optimization on top of the existing retry + DLQ
 * stack, not a source of truth.
 */

import { getLogger } from '@/lib/logger';

const log = getLogger('EvolutionCircuitBreaker');

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  /** Consecutive failures to OPEN the circuit. Default 5. */
  failureThreshold: number;
  /** Cooldown in ms after OPEN before trying HALF_OPEN. Default 30000. */
  cooldownMs: number;
}

export const DEFAULT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  cooldownMs: 30_000,
};

interface BreakerEntry {
  state: CircuitState;
  consecutiveFailures: number;
  /** When state=OPEN: timestamp at which we may transition to HALF_OPEN. */
  openUntil: number;
}

const breakers = new Map<string, BreakerEntry>();

/** Time source — overridable in tests via `__setBreakerNow`. */
let now: () => number = () => Date.now();

/** @internal — for tests only. */
export function __setBreakerNow(fn: () => number) { now = fn; }

/** @internal — for tests only. Wipes all breaker state. */
export function __resetBreakerState() { breakers.clear(); now = () => Date.now(); }

function getEntry(instance: string): BreakerEntry {
  let e = breakers.get(instance);
  if (!e) {
    e = { state: 'CLOSED', consecutiveFailures: 0, openUntil: 0 };
    breakers.set(instance, e);
  }
  return e;
}

/**
 * Check whether a call to `instance` is allowed right now.
 * Side-effect: transitions OPEN → HALF_OPEN when cooldown has elapsed.
 *
 * Returns `{ allowed: true }` when the call may proceed, or
 * `{ allowed: false, retryAfterMs }` when the circuit is OPEN.
 */
export function canCall(
  instance: string,
  cfg: CircuitBreakerConfig = DEFAULT_BREAKER_CONFIG,
): { allowed: true; state: CircuitState } | { allowed: false; retryAfterMs: number; state: CircuitState } {
  const e = getEntry(instance);
  if (e.state === 'OPEN') {
    const remaining = e.openUntil - now();
    if (remaining > 0) {
      return { allowed: false, retryAfterMs: remaining, state: 'OPEN' };
    }
    // Cooldown elapsed → transition to HALF_OPEN, allow one probe.
    e.state = 'HALF_OPEN';
    log.info(`[breaker] instance=${instance} OPEN → HALF_OPEN (cooldown elapsed)`);
  }
  return { allowed: true, state: e.state };
  // (CLOSED and HALF_OPEN both return allowed=true; HALF_OPEN limits to a
  // single in-flight probe by virtue of the caller awaiting the result before
  // making another call. Concurrent probes are accepted — the breaker still
  // converges to OPEN/CLOSED based on the eventual outcomes.)
}

/**
 * Record a successful call. Resets failure counter and closes the circuit
 * (whether it was CLOSED or HALF_OPEN).
 */
export function recordSuccess(instance: string): void {
  const e = getEntry(instance);
  if (e.state !== 'CLOSED' || e.consecutiveFailures > 0) {
    log.info(`[breaker] instance=${instance} ${e.state} → CLOSED (success after ${e.consecutiveFailures} failures)`);
  }
  e.state = 'CLOSED';
  e.consecutiveFailures = 0;
  e.openUntil = 0;
}

/**
 * Record a transient failure. Increments counter; opens the circuit when the
 * threshold is reached, or immediately if a HALF_OPEN probe failed.
 */
export function recordFailure(
  instance: string,
  cfg: CircuitBreakerConfig = DEFAULT_BREAKER_CONFIG,
): { state: CircuitState; failures: number } {
  const e = getEntry(instance);
  e.consecutiveFailures += 1;

  if (e.state === 'HALF_OPEN') {
    // Probe failed → re-open with fresh cooldown.
    e.state = 'OPEN';
    e.openUntil = now() + cfg.cooldownMs;
    log.warn(`[breaker] instance=${instance} HALF_OPEN → OPEN (probe failed, cooldown ${cfg.cooldownMs}ms)`);
  } else if (e.state === 'CLOSED' && e.consecutiveFailures >= cfg.failureThreshold) {
    e.state = 'OPEN';
    e.openUntil = now() + cfg.cooldownMs;
    log.warn(`[breaker] instance=${instance} CLOSED → OPEN (${e.consecutiveFailures} consecutive failures, cooldown ${cfg.cooldownMs}ms)`);
  }
  return { state: e.state, failures: e.consecutiveFailures };
}

/**
 * Inspect the current state for an instance without mutating it. Useful for
 * dashboards/debug only — production code should use `canCall`.
 */
export function inspect(instance: string): Readonly<BreakerEntry> {
  return { ...getEntry(instance) };
}

/**
 * Error thrown when a request is rejected by the breaker. Tagged so callers
 * can distinguish circuit-open from real network errors.
 */
export class CircuitOpenError extends Error {
  readonly code = 'circuit_open';
  readonly retryAfterMs: number;
  constructor(instance: string, retryAfterMs: number) {
    super(`Circuit breaker is open for instance "${instance}" — retry after ${Math.ceil(retryAfterMs / 1000)}s`);
    this.name = 'CircuitOpenError';
    this.retryAfterMs = retryAfterMs;
  }
}
