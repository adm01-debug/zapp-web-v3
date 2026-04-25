import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-correlation-id',
}

const CORRELATION_HEADER = 'x-correlation-id'

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
    // Time-window filter on created_at (gt/gte) counts as a valid narrowing filter
    if (f.column === 'created_at' && (f.operator === 'gt' || f.operator === 'gte')) return true
    return false
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startedAt = Date.now()
  // Initial cid from header — may be upgraded from body.__cid below.
  let cid: string = req.headers.get(CORRELATION_HEADER) || shortRid()
  let jsonHeaders: Record<string, string> = {
    ...corsHeaders,
    'Content-Type': 'application/json',
    [CORRELATION_HEADER]: cid,
  }

  try {
    const url = Deno.env.get('EXTERNAL_SUPABASE_URL')
    const key = Deno.env.get('EXTERNAL_SUPABASE_ANON_KEY')
    if (!url || !key) {
      return new Response(JSON.stringify({ error: 'External DB not configured' }), {
        status: 500, headers: jsonHeaders
      })
    }

    // Per-request Postgres statement timeout (8s) — fail fast instead of
    // letting Postgres run up to its global default. This is what produces
    // "canceling statement due to statement timeout" — we want it to fire
    // BEFORE the edge function's 9s race so we can return a clean 504.
    const ext = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      db: { schema: 'public' },
      global: {
        headers: {
          // PostgREST exposes per-request settings via this header.
          'x-statement-timeout': '8000',
        },
      },
    })

    // Hard cap to fail fast (well below Edge Function 150s + Postgres default).
    const HARD_TIMEOUT_MS = 9000
    const withTimeout = <T>(p: PromiseLike<T>): Promise<T> => {
      let timer: number | undefined
      return Promise.race([
        Promise.resolve(p).then((v) => {
          if (timer !== undefined) clearTimeout(timer)
          return v
        }),
        new Promise<T>((_, reject) => {
          timer = setTimeout(() => reject(new Error('proxy_timeout')), HARD_TIMEOUT_MS) as unknown as number
        }),
      ])
    }

    const timeoutResponse = () =>
      new Response(
        JSON.stringify({ error: 'Query timed out. Try narrower filters or a smaller limit.' }),
        { status: 504, headers: jsonHeaders }
      )

    const body = await req.json()
    const { action, table, select, filters, order, limit, offset, countMode, rpc, params, data, match } = body
    // Upgrade cid from body if header was missing/auto-generated.
    if (!req.headers.get(CORRELATION_HEADER) && typeof body.__cid === 'string' && body.__cid) {
      cid = body.__cid
      jsonHeaders = { ...jsonHeaders, [CORRELATION_HEADER]: cid }
    }

    // RPC call
    if (action === 'rpc' && rpc) {
      try {
        const { data: rpcData, error } = await withTimeout(ext.rpc(rpc, params || {}))
        if (error) {
          const isTimeout = /statement timeout|canceling statement/i.test(error.message)
          return new Response(JSON.stringify({ error: error.message }), {
            status: isTimeout ? 504 : 400,
            headers: jsonHeaders,
          })
        }
        return new Response(JSON.stringify({ data: rpcData }), {
          headers: jsonHeaders
        })
      } catch (e) {
        if ((e as Error).message === 'proxy_timeout') return timeoutResponse()
        throw e
      }
    }

    // Mutation: insert
    if (action === 'insert' && table && data) {
      const { data: result, error } = await ext.from(table).insert(data).select()
      if (error) return new Response(JSON.stringify({ error: error.message }), {
        status: 400, headers: jsonHeaders
      })
      return new Response(JSON.stringify({ data: result }), {
        headers: jsonHeaders
      })
    }

    // Mutation: update
    if (action === 'update' && table && data && match) {
      let q = ext.from(table).update(data)
      for (const [k, v] of Object.entries(match)) q = q.eq(k, v as string)
      const { data: result, error } = await q.select()
      if (error) return new Response(JSON.stringify({ error: error.message }), {
        status: 400, headers: jsonHeaders
      })
      return new Response(JSON.stringify({ data: result }), {
        headers: jsonHeaders
      })
    }

    // SELECT query (default)
    if (!table) {
      return new Response(JSON.stringify({ error: 'Missing table parameter' }), {
        status: 400, headers: jsonHeaders
      })
    }

    const isHeavy = HEAVY_TABLES.has(table)
    const filtersArr: ProxyFilter[] | undefined = Array.isArray(filters) ? filters : undefined
    const hasNarrowingFilter = hasHeavyTableFilter(filtersArr)

    // Reject heavy queries with no selective filter AND a non-tiny limit
    if (isHeavy && !hasNarrowingFilter && (limit ?? 50) > 100) {
      return new Response(
        JSON.stringify({
          error: `Heavy table "${table}" requires a filter on remote_jid, conversation_id, instance_name, or a created_at window (gte/gt). Got limit=${limit} with no narrowing filter.`,
        }),
        { status: 400, headers: jsonHeaders }
      )
    }

    // Cap absolute limit
    const requestedLimit = limit ?? 50
    const maxAllowed = isHeavy ? HEAVY_TABLE_MAX_LIMIT : DEFAULT_MAX_LIMIT
    const effectiveLimit = Math.min(requestedLimit, maxAllowed)
    const effectiveOffset = offset || 0

    // 'exact' COUNT is the #1 cause of statement timeouts on large tables.
    const requestedExact = countMode === 'exact'
    const tinyLimit = effectiveLimit <= 50
    const safeCountMode = requestedExact && tinyLimit && hasNarrowingFilter
      ? 'exact'
      : (countMode ? 'planned' : undefined)

    let query = ext.from(table).select(select || '*', { count: safeCountMode as 'exact' | 'planned' | undefined })

    if (filtersArr) {
      for (const f of filtersArr) {
        query = query.filter(f.column, f.operator, f.value as string)
      }
    }

    if (order) {
      query = query.order(order.column, { ascending: order.ascending ?? true })
    }

    query = query.range(effectiveOffset, effectiveOffset + effectiveLimit - 1)

    let queryData: unknown, queryError: { message: string } | null = null, count: number | null = null
    try {
      const res = await withTimeout(query)
      queryData = (res as { data: unknown }).data
      queryError = (res as { error: { message: string } | null }).error
      count = (res as { count: number | null }).count
    } catch (e) {
      if ((e as Error).message === 'proxy_timeout') return timeoutResponse()
      throw e
    }

    const ms = Date.now() - startedAt
    console.log(JSON.stringify({
      fn: 'external-db-proxy',
      table,
      limit: effectiveLimit,
      heavy: isHeavy,
      hasFilter: hasNarrowingFilter,
      filterCount: filtersArr?.length ?? 0,
      ms,
      ok: !queryError,
    }))

    if (queryError) {
      const isTimeout = /statement timeout|canceling statement/i.test(queryError.message)
      return new Response(JSON.stringify({ error: queryError.message }), {
        status: isTimeout ? 504 : 400,
        headers: jsonHeaders
      })
    }

    return new Response(JSON.stringify({
      data: queryData || [],
      count: count ?? (Array.isArray(queryData) ? queryData.length : 0),
    }), {
      headers: jsonHeaders
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: jsonHeaders
    })
  }
})
