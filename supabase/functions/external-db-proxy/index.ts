import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import {
  corsHeaders,
  shortRid,
  logEvent,
  recordMetric
} from './lib/utils.ts'
import { handleRpc, handleQuery } from './lib/handlers.ts'
import { QueryLogContext } from './lib/types.ts'

const CORRELATION_HEADER = 'x-correlation-id'
const REQUEST_ID_HEADER = 'x-request-id'
const SCHEMA_ALLOWLIST = new Set(['public', 'evo_api'])

async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ ok: true, fn: 'external-db-proxy', ts: Date.now() }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const startedAt = Date.now()
  const rid = shortRid()
  let cid: string = req.headers.get(CORRELATION_HEADER) || shortRid()
  
  let jsonHeaders: Record<string, string> = {
    ...corsHeaders,
    'Content-Type': 'application/json',
    [CORRELATION_HEADER]: cid,
    [REQUEST_ID_HEADER]: rid,
  }

  const reqMeta = {
    method: req.method,
    ua: req.headers.get('user-agent')?.slice(0, 80),
    has_auth: !!req.headers.get('authorization'),
    cid_from_header: !!req.headers.get(CORRELATION_HEADER),
  }

  const finish = (resp: Response, action: string, extra: Record<string, any> = {}) => {
    const total = Date.now() - startedAt
    logEvent({ phase: 'end', cid, rid, action, status: resp.status, total_ms: total, ...extra })
    
    const skipMetrics = action === 'config_error' || action === 'bad_request'
    if (!skipMetrics) {
      recordMetric({
        cid, rid, op: action,
        target: (extra?.table as string) || (extra?.rpc as string) || action,
        status: resp.status, ms: total,
        ok: resp.status >= 200 && resp.status < 400,
        timeout_fired: !!extra?.timeout_fired,
        pg_timeout: !!extra?.pg_timeout,
      })
    }
    return resp
  }

  try {
    const url = Deno.env.get('EXTERNAL_SUPABASE_URL')
    const key = Deno.env.get('EXTERNAL_SUPABASE_ANON_KEY')
    if (!url || !key) {
      logEvent({ phase: 'start', cid, rid, ...reqMeta, error: 'missing_env' })
      return finish(
        new Response(JSON.stringify({ error: 'External DB not configured', cid, rid }), { status: 500, headers: jsonHeaders }),
        'config_error'
      )
    }

    let body: any
    try {
      body = await req.json()
    } catch (e: any) {
      logEvent({ phase: 'start', cid, rid, ...reqMeta, error: 'invalid_json', err_msg: e.message })
      return finish(
        new Response(JSON.stringify({ error: 'Invalid JSON body', cid, rid }), { status: 400, headers: jsonHeaders }),
        'bad_request'
      )
    }

    if (!req.headers.get(CORRELATION_HEADER) && typeof body.__cid === 'string' && body.__cid) {
      cid = body.__cid
      jsonHeaders[CORRELATION_HEADER] = cid
    }

    const { action, table, rpc, schema } = body
    const requestedSchema = typeof schema === 'string' && schema.length > 0 ? schema : 'public'
    
    if (!SCHEMA_ALLOWLIST.has(requestedSchema)) {
      return finish(
        new Response(JSON.stringify({ error: `Schema not allowed: ${requestedSchema}`, cid, rid }), { status: 400, headers: jsonHeaders }),
        'bad_request'
      )
    }

    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      db: { schema: requestedSchema },
      global: { headers: { 'x-statement-timeout': '12000' } },
    })

    const ctx: QueryLogContext = { cid, rid, op: action || 'select', target: (rpc || table || 'unknown'), startedAt }

    logEvent({ phase: 'start', cid, rid, ...reqMeta, action: action ?? 'select', table, rpc })

    if (action === 'rpc' && rpc) {
      return finish(await handleRpc(client, rpc, body.params || {}, ctx, jsonHeaders), 'rpc', { rpc })
    }

    if ((action === 'select' || action === 'update') && table) {
      return finish(await handleQuery(client, action, table, body, ctx, jsonHeaders), action, { table })
    }

    return finish(
      new Response(JSON.stringify({ error: 'Missing action, table or rpc', cid, rid }), { status: 400, headers: jsonHeaders }),
      'bad_request'
    )

  } catch (e: any) {
    const total = Date.now() - startedAt
    logEvent({ phase: 'crash', cid, rid, err: e.message, stack: e.stack, total_ms: total })
    return new Response(JSON.stringify({ error: 'Internal server error', cid, rid }), { status: 500, headers: jsonHeaders })
  }
}

Deno.serve(handler)
