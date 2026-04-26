## Goal

Make every `external-db-proxy` retry attempt observable so recurring 503s can be diagnosed: each attempt's status, duration, error, transient classification, and the final outcome (success-after-retry vs exhausted) should be logged and counted.

## Changes

### 1. `src/lib/externalProxy.ts` — log every attempt

Inside the retry loop:

- Time each attempt independently (`attemptStartedAt = performance.now()`).
- After each `supabase.functions.invoke(...)`, emit a structured log via `getLogger('externalProxy')`:
  - `cid` (correlationId), `target`, `operation`, `attempt`, `maxAttempts`
  - `attemptDurationMs`
  - `ok` (boolean), `errorName`, `errorMessage`
  - `transient` (true when matched by `isTransientRuntimeError`)
  - `willRetry` (true if transient and attempt < MAX)
  - `backoffMs` (the delay that will be waited)
- Use `log.warn` for transient/error attempts, `log.debug` for successful ones.

Track `attemptsMade` and pass it through to telemetry.

### 2. Final-outcome log + telemetry enrichment

Extend `recordQueryEvent` calls in `externalProxy.ts` to include retry context in the `filters` field (already a free-form bag) under a stable key:

```
filters: { ...existingFilters, __retry: { attempts, transientCount, recovered } }
```

- `recovered = attempts > 1 && success` → emit a `log.info('proxy recovered after retry', {...})`.
- `exhausted = attempts === MAX && !success` → emit `log.error('proxy retry exhausted', {...})`.

### 3. `src/lib/clientTelemetry.ts` — aggregate retry counters

Add to `State` and `TelemetrySnapshot`:

```ts
retry: {
  totalRetries: number;       // sum of (attempts - 1)
  recoveredAfterRetry: number; // succeeded on attempt > 1
  exhausted: number;           // failed all attempts
  transientByTarget: Record<string, number>;
}
```

Expose a new helper `recordRetryOutcome({ target, attempts, recovered, exhausted, transientCount })` called from `externalProxy.ts` in the `finally`-style branch. Mirror to `window.__queryTelemetry` (already published) so it shows up in DevTools.

### 4. Optional: tag the edge function with `x-attempt`

Add `x-attempt: <n>` header on each invoke so the existing edge function logs (which already log `cid`/`rid`) can be cross-referenced with the client-side attempt number when diagnosing.

## Files touched

- `src/lib/externalProxy.ts` — retry loop instrumentation, per-attempt log, final-outcome log, attempt header
- `src/lib/clientTelemetry.ts` — `retry` counters in snapshot + `recordRetryOutcome` helper

No UI, no schema, no edge function code changes.

## How you'll diagnose 503s after this lands

1. Open DevTools → console: each retry prints `[externalProxy] attempt 1 failed transient=true willRetry=true cid=… target=evolution_messages durationMs=…`.
2. `window.__queryTelemetry.retry` shows running totals: how many recoveries vs exhaustions, which `target` is hit most.
3. Cross-reference `cid` with `external-db-proxy` edge logs (already include `cid`) to see whether the request reached the function or died at the gateway (true 503 = no edge log for that `cid`/attempt).
