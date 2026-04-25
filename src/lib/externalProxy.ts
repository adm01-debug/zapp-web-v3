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
import { recordQueryEvent, classifySeverity, type QueryOperation } from '@/lib/clientTelemetry';
import { generateCorrelationId, CORRELATION_HEADER } from '@/lib/correlationId';

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

  try {
    const { data, error } = await supabase.functions.invoke('external-db-proxy', invokeOptions);

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
      throw new Error(message || 'External DB proxy error');
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
