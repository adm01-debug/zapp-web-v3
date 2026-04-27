/**
 * Client helper for calling the external-db-proxy edge function.
 *
 * Every call is timed, tagged with a correlationId and recorded via
 * `clientTelemetry` so DevTools and the telemetry panel can inspect
 * duration, limit, filters, recordCount, severity and trace id in one
 * place. The same correlationId is propagated to the edge function via
 * the `x-correlation-id` header AND echoed in the JSON body as `__cid`
 * (Supabase Functions client does not always forward custom headers
 * to the underlying request, so the body field is the reliable channel).
 */
import { supabase } from '@/integrations/supabase/client';
import { recordQueryEvent, recordRetryOutcome, classifySeverity, type QueryOperation } from '@/lib/clientTelemetry';
import { generateCorrelationId, CORRELATION_HEADER } from '@/lib/correlationId';
import { getLogger } from '@/lib/logger';

const proxyLog = getLogger('externalProxy');

interface ProxySelectParams {
  table: string;
  select?: string;
  filters?: { column: string; operator: string; value: unknown }[];
  order?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
  countMode?: 'exact' | 'planned' | 'estimated';
  /**
   * Optional cursor sugar — pushed into `filters` server-side.
   * Use for pagination by created_at (gt for forward, lt for older).
   */
  cursor?: { column: string; operator: 'gt' | 'lt' | 'gte' | 'lte'; value: string };
  /** Optional AbortSignal — cancels the underlying fetch. */
  signal?: AbortSignal;
}

interface ProxyMutationParams {
  action: 'insert' | 'update';
  table: string;
  data?: Record<string, unknown> | Record<string, unknown>[];
  match?: Record<string, unknown>;
}

interface ProxyRPCParams {
  action: 'rpc';
  rpc: string;
  params?: Record<string, unknown>;
}

type ProxyParams = ProxySelectParams | ProxyMutationParams | ProxyRPCParams;

interface ProxyResponse<T = unknown> {
  data: T[];
  count?: number;
  error?: string;
}

function deriveTelemetryMeta(body: Record<string, unknown>): {
  operation: QueryOperation;
  target: string;
  limit: number | null;
  offset: number | null;
  filters: Record<string, unknown> | null;
} {
  const action = body.action as string | undefined;
  let operation: QueryOperation = 'select';
  if (action === 'rpc') operation = 'rpc';
  else if (action === 'insert') operation = 'insert';
  else if (action === 'update') operation = 'update';
  else if (action === 'delete') operation = 'delete';

  const target =
    (body.rpc as string | undefined) ??
    (body.table as string | undefined) ??
    'unknown';

  const limit = typeof body.limit === 'number' ? body.limit : null;
  const offset = typeof body.offset === 'number' ? body.offset : null;

  let filters: Record<string, unknown> | null = null;
  if (body.filters) filters = { filters: body.filters };
  else if (body.match) filters = { match: body.match };
  else if (body.params) filters = body.params as Record<string, unknown>;
  else if (body.cursor) filters = { cursor: body.cursor };

  return { operation, target, limit, offset, filters };
}

// ─── Request coalescing ──────────────────────────────────────────────
// Many components mount in parallel and hit the same proxy endpoint within
// a few ms (sidebar + crossTab + queryFn etc). Without coalescing this
// causes a stampede that the edge runtime cannot absorb (we observed 40+
// OPTIONS preflights with zero POST completions). We dedupe by a stable
// signature of the request body for a short window and return the same
// in-flight Promise to all callers.
const COALESCE_WINDOW_MS = 250;
const inflight = new Map<string, { promise: Promise<ProxyResponse<unknown>>; expiresAt: number }>();

function coalesceKey(body: Record<string, unknown>): string | null {
  // Mutations must NEVER be coalesced — two identical inserts are two real
  // operations. Only SELECT and read-only RPCs are eligible.
  const action = body.action as string | undefined;
  if (action === 'insert' || action === 'update' || action === 'delete') return null;
  try {
    // Stable key: action + table/rpc + filters/match/params + limit + offset.
    // We intentionally drop __cid and signal — they don't change the result.
    const { __cid, signal, ...stable } = body as Record<string, unknown> & { __cid?: string; signal?: unknown };
    void __cid; void signal;
    return JSON.stringify(stable);
  } catch {
    return null;
  }
}

// ─── Per-target circuit breaker ──────────────────────────────────────
// After N consecutive ghost-POST failures (FunctionsFetchError without a
// status code — the request never made it to the server), the breaker
// trips for COOLDOWN_MS so we stop bombarding an already-overloaded edge.
// Closes automatically on the first successful response after cooldown.
const BREAKER_THRESHOLD = 4;
const BREAKER_COOLDOWN_MS = 5_000;
const breaker = new Map<string, { fails: number; openedAt: number }>();

function isBreakerOpen(target: string): { open: boolean; remainingMs: number } {
  const entry = breaker.get(target);
  if (!entry || entry.fails < BREAKER_THRESHOLD) return { open: false, remainingMs: 0 };
  const elapsed = Date.now() - entry.openedAt;
  if (elapsed >= BREAKER_COOLDOWN_MS) {
    breaker.delete(target);
    return { open: false, remainingMs: 0 };
  }
  return { open: true, remainingMs: BREAKER_COOLDOWN_MS - elapsed };
}

function recordBreakerFailure(target: string): void {
  const cur = breaker.get(target) ?? { fails: 0, openedAt: 0 };
  cur.fails += 1;
  if (cur.fails >= BREAKER_THRESHOLD && cur.openedAt === 0) {
    cur.openedAt = Date.now();
    proxyLog.warn('proxy circuit opened', { target, fails: cur.fails, cooldownMs: BREAKER_COOLDOWN_MS });
  }
  breaker.set(target, cur);
}

function recordBreakerSuccess(target: string): void {
  if (breaker.has(target)) {
    proxyLog.info('proxy circuit closed', { target });
    breaker.delete(target);
  }
}

// Test-only reset hook — exported via __testing namespace below.
function __resetBreakerAndCoalesce(): void {
  breaker.clear();
  inflight.clear();
}

export async function queryExternalProxy<T = unknown>(params: ProxyParams): Promise<ProxyResponse<T>> {
  // Extract signal so it isn't sent in the JSON body.
  const { signal, ...body } = params as ProxyParams & { signal?: AbortSignal };

  const correlationId = generateCorrelationId();
  // Echo the trace id in the body so the edge function can log it even when
  // headers are stripped by intermediate layers.
  const bodyWithCid = { ...body, __cid: correlationId } as Record<string, unknown>;

  const invokeOptions: { body: unknown; signal?: AbortSignal; headers?: Record<string, string> } = {
    body: bodyWithCid,
    headers: { [CORRELATION_HEADER]: correlationId },
  };
  if (signal) invokeOptions.signal = signal;

  const startedAt = performance.now();
  const meta = deriveTelemetryMeta(body as Record<string, unknown>);

  // Transient 503 retry: the Supabase Edge runtime occasionally fails to spin
  // up an isolate (cold start) and returns SUPABASE_EDGE_RUNTIME_ERROR /
  // "non-2xx status code". These are not real failures — a quick retry usually
  // succeeds. We retry up to 2 times with small exponential backoff, but never
  // for AbortError (caller-initiated cancellation).
  const normalizeInvokeError = (err: unknown): { name?: string; message?: string; code?: string; status?: number } => {
    if (!err || typeof err !== 'object') {
      return { message: typeof err === 'string' ? err : String(err) };
    }
    const maybeError = err as {
      name?: string;
      message?: string;
      code?: string;
      status?: number;
      context?: { status?: number };
    };
    return {
      name: maybeError.name,
      message: maybeError.message,
      code: maybeError.code,
      status: maybeError.status ?? maybeError.context?.status,
    };
  };

  const isTransientRuntimeError = (err: unknown): boolean => {
    const normalized = normalizeInvokeError(err);
    const message = normalized.message ?? '';
    const code = normalized.code ?? '';
    const status = normalized.status;
    return (
      /SUPABASE_EDGE_RUNTIME_ERROR/i.test(code) ||
      /SUPABASE_EDGE_RUNTIME_ERROR/i.test(message) ||
      /temporarily unavailable/i.test(message) ||
      /non-2xx status code/i.test(message) ||
      status === 502 ||
      status === 503 ||
      status === 504 ||
      /\b503\b/.test(message) ||
      /\b502\b/.test(message) ||
      /\b504\b/.test(message)
    );
  };

  try {
    let data: ProxyResponse<T> | null = null;
    let error: { name?: string; message?: string; code?: string; status?: number } | null = null;
    const MAX_ATTEMPTS = 3;
    let attemptsMade = 0;
    let transientCount = 0;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      attemptsMade = attempt;
      const attemptStartedAt = performance.now();
      const perAttemptOptions = {
        ...invokeOptions,
        headers: { ...(invokeOptions.headers ?? {}), 'x-attempt': String(attempt) },
      };
      try {
        const result = await supabase.functions.invoke('external-db-proxy', perAttemptOptions);
        data = result.data as ProxyResponse<T> | null;
        error = result.error ? normalizeInvokeError(result.error) : null;
      } catch (invokeErr) {
        data = null;
        error = normalizeInvokeError(invokeErr);
      }
      const attemptDurationMs = Math.round(performance.now() - attemptStartedAt);

      const ok = !error;
      const transient = error ? isTransientRuntimeError(error) : false;
      if (transient) transientCount += 1;
      const isAbort = error?.name === 'AbortError';
      const willRetry = !ok && !isAbort && transient && attempt < MAX_ATTEMPTS;
      const backoffMs = willRetry ? (attempt === 1 ? 150 : 400) : 0;

      const attemptMeta = {
        cid: correlationId,
        target: meta.target,
        operation: meta.operation,
        attempt,
        maxAttempts: MAX_ATTEMPTS,
        attemptDurationMs,
        ok,
        errorName: error?.code ?? error?.name,
        errorMessage: error?.message,
        status: error?.status,
        transient,
        willRetry,
        backoffMs,
      };
      if (ok) {
        if (attempt > 1) {
          proxyLog.info('proxy attempt succeeded after retry', attemptMeta);
        } else {
          proxyLog.debug('proxy attempt ok', attemptMeta);
        }
      } else {
        proxyLog.warn('proxy attempt failed', attemptMeta);
      }

      if (ok) break;
      if (isAbort) break;
      if (!transient) break;
      if (attempt === MAX_ATTEMPTS) break;
      await new Promise((r) => setTimeout(r, backoffMs));
    }

    const finalSuccess = !error;
    const recovered = finalSuccess && attemptsMade > 1;
    const exhausted = !finalSuccess && attemptsMade === MAX_ATTEMPTS && transientCount > 0;

    recordRetryOutcome({
      target: meta.target,
      attempts: attemptsMade,
      recovered,
      exhausted,
      transientCount,
      correlationId,
    });

    if (recovered) {
      proxyLog.info('proxy recovered after retry', {
        cid: correlationId,
        target: meta.target,
        attempts: attemptsMade,
        transientCount,
      });
    } else if (exhausted) {
      proxyLog.error('proxy retry exhausted', {
        cid: correlationId,
        target: meta.target,
        attempts: attemptsMade,
        transientCount,
        lastError: error?.message,
      });
    }

    if (error) {
      const name = (error as { name?: string }).name;
      const message = error.message || '';
      const isAbort = name === 'AbortError' || /aborted/i.test(message);
      const isTimeout = name === 'TimeoutError' || /timeout/i.test(message);
      const durationMs = Math.round(performance.now() - startedAt);

      recordQueryEvent({
        ...meta,
        source: 'externalProxy',
        durationMs,
        recordCount: null,
        errorMessage: message || 'External DB proxy error',
        severity: isTimeout ? 'timeout' : 'error',
        startedAt,
        correlationId,
      });

      if (isAbort) {
        const abortErr = new Error('Aborted');
        abortErr.name = 'AbortError';
        throw abortErr;
      }
      throw new Error(message ? `[cid=${correlationId}] ${message}` : `[cid=${correlationId}] External DB proxy error`);
    }

    if (data?.error) {
      const durationMs = Math.round(performance.now() - startedAt);
      recordQueryEvent({
        ...meta,
        source: 'externalProxy',
        durationMs,
        recordCount: null,
        errorMessage: data.error,
        severity: classifySeverity(durationMs, true, false),
        startedAt,
        correlationId,
      });
      throw new Error(data.error);
    }

    const durationMs = Math.round(performance.now() - startedAt);
    const recordCount = Array.isArray(data?.data) ? data.data.length : null;
    recordQueryEvent({
      ...meta,
      source: 'externalProxy',
      durationMs,
      recordCount,
      startedAt,
      correlationId,
    });

    return data as ProxyResponse<T>;
  } catch (err) {
    const name = (err as Error)?.name;
    const message = (err as Error)?.message ?? '';
    if (name === 'AbortError') throw err;

    // Only record if this looks like an unexpected throw (not already recorded).
    if (!/External DB proxy error|Aborted/i.test(message)) {
      const durationMs = Math.round(performance.now() - startedAt);
      const isTimeout = name === 'TimeoutError' || /timeout/i.test(message);
      recordQueryEvent({
        ...meta,
        source: 'externalProxy',
        durationMs,
        recordCount: null,
        errorMessage: message || 'unknown',
        severity: isTimeout ? 'timeout' : 'error',
        startedAt,
        correlationId,
      });
    }
    throw err;
  }
}
