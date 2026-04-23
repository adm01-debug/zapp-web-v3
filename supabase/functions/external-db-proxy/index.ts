import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = Deno.env.get('EXTERNAL_SUPABASE_URL')
    const key = Deno.env.get('EXTERNAL_SUPABASE_ANON_KEY')
    if (!url || !key) {
      return new Response(JSON.stringify({ error: 'External DB not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const ext = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    })

    const body = await req.json()
    const { action, table, select, filters, order, limit, offset, countMode, rpc, params, data, match } = body

    // RPC call
    if (action === 'rpc' && rpc) {
      const { data: rpcData, error } = await ext.rpc(rpc, params || {})
      if (error) return new Response(JSON.stringify({ error: error.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
      return new Response(JSON.stringify({ data: rpcData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Mutation: insert
    if (action === 'insert' && table && data) {
      const { data: result, error } = await ext.from(table).insert(data).select()
      if (error) return new Response(JSON.stringify({ error: error.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
      return new Response(JSON.stringify({ data: result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Mutation: update
    if (action === 'update' && table && data && match) {
      let q = ext.from(table).update(data)
      for (const [k, v] of Object.entries(match)) q = q.eq(k, v as string)
      const { data: result, error } = await q.select()
      if (error) return new Response(JSON.stringify({ error: error.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
      return new Response(JSON.stringify({ data: result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // SELECT query (default)
    if (!table) {
      return new Response(JSON.stringify({ error: 'Missing table parameter' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Avoid exact COUNT on large tables — it scans the whole table and hits statement_timeout.
    // 'planned' uses pg_class estimate (instant); 'estimated' falls back to exact only if planned < threshold.
    const safeCount = countMode === 'exact' ? 'planned' : (countMode || undefined)
    let query = ext.from(table).select(select || '*', { count: safeCount as any })

    if (filters && Array.isArray(filters)) {
      for (const f of filters) {
        query = query.filter(f.column, f.operator, f.value)
      }
    }

    if (order) {
      query = query.order(order.column, { ascending: order.ascending ?? true })
    }

    const effectiveLimit = Math.min(limit || 50, 500)
    const effectiveOffset = offset || 0
    query = query.range(effectiveOffset, effectiveOffset + effectiveLimit - 1)

    const { data: queryData, error: queryError, count } = await query

    if (queryError) {
      return new Response(JSON.stringify({ error: queryError.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      data: queryData || [],
      count: count ?? (Array.isArray(queryData) ? queryData.length : 0),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
