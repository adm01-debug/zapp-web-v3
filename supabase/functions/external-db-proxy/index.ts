import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-correlation-id',
  'Access-Control-Expose-Headers': 'x-correlation-id, x-request-id, server-timing',
}

const CORRELATION_HEADER = 'x-correlation-id'
const REQUEST_ID_HEADER = 'x-request-id'

function shortRid(): string {
  try {
    return crypto.randomUUID().slice(0, 8)
  } catch {
    return Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0')
  }
}

// Tables that are large enough that an unfiltered scan reliably hits statement timeout.
const HEAVY_TABLES = new Set(['evolution_messages', 'evolution_webhook_events'])
const HEAVY_TABLE_MAX_LIMIT = 200
const DEFAULT_MAX_LIMIT = 500

// Filter columns that are considered "selective enough" on heavy tables (backed by indexes).
const HEAVY_TABLE_REQUIRED_FILTERS = new Set(['remote_jid', 'conversation_id', 'instance_name'])

interface ProxyFilter {
  column: string
  operator: string
  value: unknown
}

function hasHeavyTableFilter(filters: ProxyFilter[] | undefined): boolean {
  if (!Array.isArray(filters) || filters.length === 0) return false
  return filters.some((f) => {
    if (HEAVY_TABLE_REQUIRED_FILTERS.has(f.column)) return true
    if (f.column === 'created_at' && (f.operator === 'gt' || f.operator === 'gte')) return true
    return false
  })
}

// ---------- Structured logging ----------
// All logs share a stable shape so they can be queried by `cid` (correlation id)
// or `rid` (per-invocation request id) in Supabase analytics. The intent is to
// trace a 503 or 504 in production by following a single cid across:
//   - log "phase":"start"  → request received
//   - log "phase":"query"  → upstream Postgres call (with ms + ok + timeout flags)
//   - log "phase":"end"    → response sent (with final status + total ms)
type LogPayload = Record<string, unknown>

function logEvent(base: LogPayload, extra: LogPayload = {}) {
  try {
    console.log(JSON.stringify({ fn: 'external-db-proxy', ts: new Date().toISOString(), ...base, ...extra }))
  } catch {
    // Never let logging crash the worker
  }
}

export interface QueryLogContext {
  cid: string
  rid: string
  op: 'rpc' | 'select' | 'insert' | 'update'
  target: string
  startedAt: number
}

export interface QueryOutcome {
  ok: boolean
  ms: number
  status: number
  timeoutFired?: boolean
  pgTimeout?: boolean
  errCode?: string
  errMsg?: string
  rowCount?: number
  schemaRetries?: number
}

/** Build the structured log entry for an upstream query result. Exported for tests. */
export function buildQueryLog(ctx: QueryLogContext, outcome: QueryOutcome): LogPayload {
  return {
    phase: 'query',
    cid: ctx.cid,
    rid: ctx.rid,
    op: ctx.op,
    target: ctx.target,
    ms: outcome.ms,
    ok: outcome.ok,
    status: outcome.status,
    timeout_fired: outcome.timeoutFired ?? false,
    pg_timeout: outcome.pgTimeout ?? false,
    err_code: outcome.errCode,
    err_msg: outcome.errMsg,
    row_count: outcome.rowCount,
    schema_retries: outcome.schemaRetries ?? 0,
  }
}

/** Detect transient PostgREST schema-cache errors (PGRST002) that should be retried. */
export function isSchemaCacheError(err: { message?: string; code?: string } | null | undefined): boolean {
  if (!err) return false
  if (err.code === 'PGRST002') return true
  const msg = err.message || ''
  return /schema cache/i.test(msg) && /PGRST002|could not query the database/i.test(msg)
}

/** Detect Postgres statement timeout (57014). */
export function isStatementTimeout(err: { message?: string; code?: string } | null | undefined): boolean {
  if (!err) return false
  if (err.code === '57014') return true
  return /statement timeout|canceling statement/i.test(err.message || '')
}

/** Run an upstream query with automatic retry for PGRST002 (schema cache reload). */
export async function runWithSchemaRetry<T>(
  fn: () => PromiseLike<{ data: T; error: { message: string; code?: string } | null }>,
  maxAttempts = 3,
): Promise<{ data: T; error: { message: string; code?: string } | null; schemaRetries: number }> {
  let schemaRetries = 0
  let last: { data: T; error: { message: string; code?: string } | null } = { data: null as unknown as T, error: null }
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    last = await fn()
    if (!isSchemaCacheError(last.error)) break
    schemaRetries++
    await new Promise((r) => setTimeout(r, 250 * (attempt + 1)))
  }
  return { ...last, schemaRetries }
}

/** Classify an upstream error message into a status + flags. Exported for tests. */
export function classifyUpstreamError(
  message: string | undefined,
  timeoutFired: boolean,
  code?: string,
): {
  status: number
  pgTimeout: boolean
} {
  if (timeoutFired) return { status: 504, pgTimeout: false }
  if (!message) return { status: 400, pgTimeout: false }
  if (/statement timeout|canceling statement/i.test(message) || code === '57014') {
    return { status: 504, pgTimeout: true }
  }
  // Transient schema cache reload — surface as 503 so callers can retry.
  if (isSchemaCacheError({ message, code })) {
    return { status: 503, pgTimeout: false }
  }
  return { status: 400, pgTimeout: false }
}

/** Build a structured error response body with retry hint for the UI. */
function errorBody(
  cid: string,
  rid: string,
  err: { message: string; code?: string },
): Record<string, unknown> {
  const schemaCache = isSchemaCacheError(err)
  const stmtTimeout = isStatementTimeout(err)
  return {
    error: err.message,
    code: err.code,
    cid,
    rid,
    retryable: schemaCache,
    hint: stmtTimeout
      ? 'Query exceeded statement timeout. Add a more selective filter, reduce the page size, or paginate.'
      : schemaCache
        ? 'Upstream PostgREST is reloading its schema cache. Retry shortly.'
        : undefined,
  }
}

// ---------- Metrics persistence (fire-and-forget) ----------
// Writes to the Lovable Cloud `proxy_metrics` table so the proxy-health
// endpoint can compute error rates, p95 latency and trigger alerts.
// We use the SERVICE_ROLE key (which bypasses RLS) and never await the
// write — failures here must NEVER affect the user's response.
let metricsClient: ReturnType<typeof createClient> | null = null
function getMetricsClient() {
  if (metricsClient) return metricsClient
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return null
  metricsClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return metricsClient
}

interface MetricSample {
  cid: string
  rid: string
  op: string
  target: string
  status: number
  ms: number
  ok: boolean
  timeout_fired?: boolean
  pg_timeout?: boolean
  err_code?: string | null
  err_msg?: string | null
}

function recordMetric(sample: MetricSample) {
  const client = getMetricsClient()
  if (!client) return
  // Truncate long error messages to keep the table small
  const errMsg = sample.err_msg ? sample.err_msg.slice(0, 500) : null
  // Fire and forget — explicitly NOT awaited. Catch the rejection so the
  // worker doesn't log an unhandled promise warning.
  Promise.resolve(
    client.from('proxy_metrics').insert({
      cid: sample.cid,
      rid: sample.rid,
      op: sample.op,
      target: sample.target,
      status: sample.status,
      ms: sample.ms,
      ok: sample.ok,
      timeout_fired: sample.timeout_fired ?? false,
      pg_timeout: sample.pg_timeout ?? false,
      err_code: sample.err_code ?? null,
      err_msg: errMsg,
    })
  ).then((res) => {
    if (res?.error) {
      logEvent({ phase: 'metric_error', err: res.error.message })
    }
  }).catch((e: unknown) => {
    logEvent({ phase: 'metric_error', err: (e as Error)?.message })
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // ── Sentinel fast-path ────────────────────────────────────────────
  // GET ?ping=1 (or any GET) returns a tiny health payload WITHOUT touching
  // Postgres. Used by the admin Health panel to distinguish:
  //   - sentinel ok + queries failing → upstream Postgres / RLS issue
  //   - sentinel failing              → edge runtime cold-start / overload
  // Kept under 10ms so it can be polled aggressively without cost.
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ ok: true, fn: 'external-db-proxy', ts: Date.now() }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const startedAt = Date.now()
  const rid = shortRid() // unique per worker invocation, even if cid is shared across retries
  // Initial cid from header — may be upgraded from body.__cid below.
  let cid: string = req.headers.get(CORRELATION_HEADER) || shortRid()
  let jsonHeaders: Record<string, string> = {
    ...corsHeaders,
    'Content-Type': 'application/json',
    [CORRELATION_HEADER]: cid,
    [REQUEST_ID_HEADER]: rid,
  }

  // Capture request metadata for the start log (helps correlate 503s with
  // upstream gateway issues vs. our own timeouts).
  const reqMeta = {
    method: req.method,
    ua: req.headers.get('user-agent')?.slice(0, 80),
    has_auth: !!req.headers.get('authorization'),
    cid_from_header: !!req.headers.get(CORRELATION_HEADER),
  }

  const finish = (resp: Response, action: string, extra: LogPayload = {}) => {
    const total = Date.now() - startedAt
    logEvent({
      phase: 'end',
      cid,
      rid,
      action,
      status: resp.status,
      total_ms: total,
      ...extra,
    })
    // Persist a metric sample for /proxy-health to compute error rate + p95.
    // Skip CORS pre-flights, config errors and bad-request validations that
    // never reached upstream — they would skew the rate.
    const skipMetrics = action === 'config_error' || action === 'bad_request' ||
      (extra && (extra.reason === 'missing_table' || extra.reason === 'heavy_no_filter'))
    if (!skipMetrics) {
      const target = (extra?.table as string) || (extra?.rpc as string) || action
      recordMetric({
        cid,
        rid,
        op: action,
        target,
        status: resp.status,
        ms: total,
        ok: resp.status >= 200 && resp.status < 400,
        timeout_fired: !!extra?.timeout_fired,
        pg_timeout: !!extra?.pg_timeout,
      })
    }
    try {
      resp.headers.set('Server-Timing', `proxy;dur=${total}`)
    } catch { /* immutable headers in some runtimes */ }
    return resp
  }

  try {
    const url = Deno.env.get('EXTERNAL_SUPABASE_URL')
    const key = Deno.env.get('EXTERNAL_SUPABASE_ANON_KEY')
    if (!url || !key) {
      logEvent({ phase: 'start', cid, rid, ...reqMeta, error: 'missing_env' })
      return finish(
        new Response(JSON.stringify({ error: 'External DB not configured', cid, rid }), {
          status: 500, headers: jsonHeaders,
        }),
        'config_error',
      )
    }

    const ext = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      db: { schema: 'public' },
      global: {
        headers: {
          // Postgres cancela a query depois desse tempo. Subimos de 8s → 12s
          // para absorver picos de cache frio em tabelas grandes
          // (evolution_webhook_events / evolution_messages) sem cair no
          // proxy_timeout. Continua bem abaixo do limite de 150s do edge runtime.
          'x-statement-timeout': '12000',
        },
      },
    })

    // Hard cap to fail fast (well below Edge Function 150s + Postgres default).
    // Mantemos uma folga de ~2s sobre o statement_timeout para que o Postgres
    // tenha chance de cancelar e devolver erro estruturado antes do timer.
    const HARD_TIMEOUT_MS = 14000
    let timeoutFired = false
    const withTimeout = <T>(p: PromiseLike<T>): Promise<T> => {
      let timer: number | undefined
      return Promise.race([
        Promise.resolve(p).then((v) => {
          if (timer !== undefined) clearTimeout(timer)
          return v
        }),
        new Promise<T>((_, reject) => {
          timer = setTimeout(() => {
            timeoutFired = true
            reject(new Error('proxy_timeout'))
          }, HARD_TIMEOUT_MS) as unknown as number
        }),
      ])
    }

    const timeoutResponse = (op: string, target: string, queryStart: number) => {
      const ms = Date.now() - queryStart
      logEvent(buildQueryLog(
        { cid, rid, op: op as QueryLogContext['op'], target, startedAt: queryStart },
        { ok: false, ms, status: 504, timeoutFired: true, errMsg: 'proxy_timeout' },
      ))
      return new Response(
        JSON.stringify({
          error: 'Query timed out. Try narrower filters or a smaller limit.',
          cid,
          rid,
          timeout: 'proxy',
        }),
        { status: 504, headers: jsonHeaders },
      )
    }

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch (e) {
      logEvent({ phase: 'start', cid, rid, ...reqMeta, error: 'invalid_json', err_msg: (e as Error).message })
      return finish(
        new Response(JSON.stringify({ error: 'Invalid JSON body', cid, rid }), {
          status: 400, headers: jsonHeaders,
        }),
        'bad_request',
      )
    }
    const { action, table, select, filters, order, limit, offset, countMode, rpc, params, data, match } =
      body as Record<string, unknown>
    // Upgrade cid from body if header was missing/auto-generated.
    if (!req.headers.get(CORRELATION_HEADER) && typeof body.__cid === 'string' && body.__cid) {
      cid = body.__cid as string
      jsonHeaders = { ...jsonHeaders, [CORRELATION_HEADER]: cid }
    }

    logEvent({
      phase: 'start',
      cid,
      rid,
      ...reqMeta,
      action: action ?? 'select',
      table,
      rpc,
      has_filters: Array.isArray(filters) ? (filters as unknown[]).length : 0,
      limit,
      offset,
      count_mode: countMode,
    })

    // RPC call
    if (action === 'rpc' && rpc) {
      const queryStart = Date.now()
      const cleanParams = { ...((params as Record<string, unknown>) || {}) }
      delete cleanParams.__cid
      try {
        // Retry transient PGRST002 (schema cache) — up to 3 attempts with backoff.
        let rpcData: unknown = null
        let error: { message: string; code?: string } | null = null
        let schemaRetries = 0
        for (let attempt = 0; attempt < 3; attempt++) {
          const res = await withTimeout(ext.rpc(rpc as string, cleanParams))
          rpcData = (res as { data: unknown }).data
          error = (res as { error: { message: string; code?: string } | null }).error
          if (!isSchemaCacheError(error)) break
          schemaRetries++
          await new Promise((r) => setTimeout(r, 250 * (attempt + 1)))
        }
        const ms = Date.now() - queryStart
        const cls = classifyUpstreamError(error?.message, false, (error as { code?: string } | null)?.code)
        logEvent(buildQueryLog(
          { cid, rid, op: 'rpc', target: rpc as string, startedAt: queryStart },
          {
            ok: !error,
            ms,
            status: error ? cls.status : 200,
            pgTimeout: cls.pgTimeout,
            errCode: (error as { code?: string } | null)?.code,
            errMsg: error?.message,
            rowCount: Array.isArray(rpcData) ? rpcData.length : (rpcData == null ? 0 : 1),
            schemaRetries,
          },
        ))
        if (error) {
          return finish(
            new Response(JSON.stringify(errorBody(cid, rid, error)), {
              status: cls.status, headers: jsonHeaders,
            }),
            'rpc',
            { rpc, pg_timeout: cls.pgTimeout },
          )
        }
        return finish(
          new Response(JSON.stringify({ data: rpcData, cid, rid }), { headers: jsonHeaders }),
          'rpc',
          { rpc },
        )
      } catch (e) {
        if ((e as Error).message === 'proxy_timeout') {
          return finish(timeoutResponse('rpc', rpc as string, queryStart), 'rpc', { rpc, timeout_fired: true })
        }
        const ms = Date.now() - queryStart
        logEvent(buildQueryLog(
          { cid, rid, op: 'rpc', target: rpc as string, startedAt: queryStart },
          { ok: false, ms, status: 502, errMsg: (e as Error).message },
        ))
        return finish(
          new Response(JSON.stringify({ error: 'Upstream failure', cid, rid, detail: (e as Error).message }), {
            status: 502, headers: jsonHeaders,
          }),
          'rpc',
          { rpc, upstream_failure: true },
        )
      }
    }

    // Mutation: insert
    if (action === 'insert' && table && data) {
      const queryStart = Date.now()
      try {
        const { data: result, error } = await withTimeout(ext.from(table as string).insert(data).select())
        const ms = Date.now() - queryStart
        const cls = classifyUpstreamError(error?.message, false)
        logEvent(buildQueryLog(
          { cid, rid, op: 'insert', target: table as string, startedAt: queryStart },
          {
            ok: !error,
            ms,
            status: error ? cls.status : 200,
            pgTimeout: cls.pgTimeout,
            errCode: (error as { code?: string } | null)?.code,
            errMsg: error?.message,
            rowCount: Array.isArray(result) ? result.length : 0,
          },
        ))
        if (error) {
          return finish(
            new Response(JSON.stringify(errorBody(cid, rid, error)), {
              status: cls.status, headers: jsonHeaders,
            }),
            'insert',
            { table, pg_timeout: cls.pgTimeout },
          )
        }
        return finish(
          new Response(JSON.stringify({ data: result, cid, rid }), { headers: jsonHeaders }),
          'insert',
          { table },
        )
      } catch (e) {
        if ((e as Error).message === 'proxy_timeout') {
          return finish(timeoutResponse('insert', table as string, queryStart), 'insert', { table, timeout_fired: true })
        }
        throw e
      }
    }

    // Mutation: update
    if (action === 'update' && table && data && match) {
      const queryStart = Date.now()
      let q = ext.from(table as string).update(data)
      for (const [k, v] of Object.entries(match as Record<string, unknown>)) q = q.eq(k, v as string)
      try {
        const { data: result, error } = await withTimeout(q.select())
        const ms = Date.now() - queryStart
        const cls = classifyUpstreamError(error?.message, false)
        logEvent(buildQueryLog(
          { cid, rid, op: 'update', target: table as string, startedAt: queryStart },
          {
            ok: !error,
            ms,
            status: error ? cls.status : 200,
            pgTimeout: cls.pgTimeout,
            errCode: (error as { code?: string } | null)?.code,
            errMsg: error?.message,
            rowCount: Array.isArray(result) ? result.length : 0,
          },
        ))
        if (error) {
          return finish(
            new Response(JSON.stringify(errorBody(cid, rid, error)), {
              status: cls.status, headers: jsonHeaders,
            }),
            'update',
            { table, pg_timeout: cls.pgTimeout },
          )
        }
        return finish(
          new Response(JSON.stringify({ data: result, cid, rid }), { headers: jsonHeaders }),
          'update',
          { table },
        )
      } catch (e) {
        if ((e as Error).message === 'proxy_timeout') {
          return finish(timeoutResponse('update', table as string, queryStart), 'update', { table, timeout_fired: true })
        }
        throw e
      }
    }

    // SELECT query (default)
    if (!table) {
      return finish(
        new Response(JSON.stringify({ error: 'Missing table parameter', cid, rid }), {
          status: 400, headers: jsonHeaders,
        }),
        'select',
        { reason: 'missing_table' },
      )
    }

    const isHeavy = HEAVY_TABLES.has(table as string)
    const filtersArr: ProxyFilter[] | undefined = Array.isArray(filters) ? filters as ProxyFilter[] : undefined
    const hasNarrowingFilter = hasHeavyTableFilter(filtersArr)

    if (isHeavy && !hasNarrowingFilter && ((limit as number) ?? 50) > 100) {
      return finish(
        new Response(
          JSON.stringify({
            error: `Heavy table "${table}" requires a filter on remote_jid, conversation_id, instance_name, or a created_at window (gte/gt). Got limit=${limit} with no narrowing filter.`,
            cid,
            rid,
          }),
          { status: 400, headers: jsonHeaders },
        ),
        'select',
        { table, reason: 'heavy_no_filter' },
      )
    }

    const requestedLimit = (limit as number) ?? 50
    const maxAllowed = isHeavy ? HEAVY_TABLE_MAX_LIMIT : DEFAULT_MAX_LIMIT
    const effectiveLimit = Math.min(requestedLimit, maxAllowed)
    const effectiveOffset = (offset as number) || 0

    const requestedExact = countMode === 'exact'
    const tinyLimit = effectiveLimit <= 50
    const safeCountMode = requestedExact && tinyLimit && hasNarrowingFilter
      ? 'exact'
      : (countMode ? 'planned' : undefined)

    let query = ext.from(table as string).select((select as string) || '*', {
      count: safeCountMode as 'exact' | 'planned' | undefined,
    })

    if (filtersArr) {
      for (const f of filtersArr) {
        query = query.filter(f.column, f.operator, f.value as string)
      }
    }

    if (order) {
      const ord = order as { column: string; ascending?: boolean }
      query = query.order(ord.column, { ascending: ord.ascending ?? true })
    }

    query = query.range(effectiveOffset, effectiveOffset + effectiveLimit - 1)

    const queryStart = Date.now()
    let queryData: unknown, queryError: { message: string; code?: string } | null = null, count: number | null = null
    let schemaRetries = 0
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        const res = await withTimeout(query)
        queryData = (res as { data: unknown }).data
        queryError = (res as { error: { message: string; code?: string } | null }).error
        count = (res as { count: number | null }).count
        if (!isSchemaCacheError(queryError)) break
        schemaRetries++
        await new Promise((r) => setTimeout(r, 250 * (attempt + 1)))
      }
    } catch (e) {
      if ((e as Error).message === 'proxy_timeout') {
        return finish(timeoutResponse('select', table as string, queryStart), 'select', {
          table,
          heavy: isHeavy,
          timeout_fired: true,
        })
      }
      throw e
    }

    const ms = Date.now() - queryStart
    const cls = classifyUpstreamError(queryError?.message, timeoutFired, queryError?.code)
    logEvent(buildQueryLog(
      { cid, rid, op: 'select', target: table as string, startedAt: queryStart },
      {
        ok: !queryError,
        ms,
        status: queryError ? cls.status : 200,
        timeoutFired,
        pgTimeout: cls.pgTimeout,
        errCode: queryError?.code,
        errMsg: queryError?.message,
        rowCount: Array.isArray(queryData) ? queryData.length : 0,
        schemaRetries,
      },
    ))

    if (queryError) {
      return finish(
        new Response(JSON.stringify(errorBody(cid, rid, queryError)), {
          status: cls.status, headers: jsonHeaders,
        }),
        'select',
        { table, heavy: isHeavy, pg_timeout: cls.pgTimeout },
      )
    }

    return finish(
      new Response(
        JSON.stringify({
          data: queryData || [],
          count: count ?? (Array.isArray(queryData) ? queryData.length : 0),
          cid,
          rid,
        }),
        { headers: jsonHeaders },
      ),
      'select',
      { table, heavy: isHeavy, limit: effectiveLimit, row_count: Array.isArray(queryData) ? queryData.length : 0 },
    )

  } catch (error) {
    const total = Date.now() - startedAt
    logEvent({
      phase: 'end',
      cid,
      rid,
      action: 'unhandled',
      status: 500,
      total_ms: total,
      err_msg: (error as Error).message,
      stack: (error as Error).stack?.split('\n').slice(0, 3).join(' | '),
    })
    return new Response(JSON.stringify({ error: (error as Error).message, cid, rid }), {
      status: 500, headers: jsonHeaders,
    })
  }
})
