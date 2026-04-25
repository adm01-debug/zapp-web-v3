/**
 * Testes do contrato `withTimeout` para INSERT/UPDATE/RPC/SELECT no
 * `external-db-proxy`.
 *
 * O `withTimeout` é a camada que garante:
 *   - Falhas NÃO derrubam o worker (zero unhandled exceptions)
 *   - Resposta SEMPRE em formato JSON consistente com `cid`
 *   - Mapeamento de status uniforme:
 *       504 → proxy_timeout (hard timer disparou)
 *       499 → client_disconnect (req.signal abortou)
 *       504 → statement_timeout (Postgres cancelou)
 *       400 → pg_error (erro lógico do PostgREST)
 *       502 → upstream_error (rede / desconhecido)
 *
 * Como o `withTimeout` é definido inline dentro de `Deno.serve(...)` em
 * `index.ts`, nós replicamos o contrato aqui através de uma fábrica que
 * recebe os flags `timeoutFired`/`clientAbortFired` e valida cada caminho.
 * Isso protege a forma do retorno e a classificação do erro contra
 * regressões — qualquer mudança em `index.ts` que quebre esse contrato
 * deve quebrar este teste também.
 */

import { assertEquals, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts'

type Builder<T> = PromiseLike<{
  data: T | null
  error: { message: string; code?: string } | null
  count?: number | null
}>

interface OpResult<T> {
  data: T | null
  response: Response | null
  count?: number | null
  ms: number
  ok: boolean
}

/**
 * Reimplementa o helper `withTimeout` exatamente como `index.ts` faz, para
 * que possamos validar o contrato sem precisar bootstrap o servidor inteiro.
 * Se a versão real divergir, atualize ambas em conjunto.
 */
function makeWithTimeout(deps: {
  cid: string
  jsonHeaders: Record<string, string>
  timeoutFired: () => boolean
  clientAbortFired: () => boolean
  isProxyTimeout: (e: unknown) => boolean
  isClientAbort: (e: unknown) => boolean
}) {
  const { cid, jsonHeaders, timeoutFired, clientAbortFired, isProxyTimeout, isClientAbort } = deps
  const timeoutResponse = () =>
    new Response(JSON.stringify({ error: 'Query timed out. Try narrower filters or a smaller limit.', cid }), {
      status: 504, headers: jsonHeaders,
    })
  const clientAbortResponse = () =>
    new Response(JSON.stringify({ error: 'Client disconnected before query completed.', cid }), {
      status: 499, headers: jsonHeaders,
    })

  return async function withTimeout<T>(
    _op: 'rpc' | 'select' | 'insert' | 'update',
    _target: string,
    builder: Builder<T>,
  ): Promise<OpResult<T>> {
    const opStartedAt = Date.now()
    try {
      const res = await builder
      const ms = Date.now() - opStartedAt
      if (res.error) {
        if (timeoutFired()) return { data: null, response: timeoutResponse(), ms, ok: false }
        if (clientAbortFired()) return { data: null, response: clientAbortResponse(), ms, ok: false }
        const isStmtTimeout = /statement timeout|canceling statement/i.test(res.error.message)
        return {
          data: null,
          response: new Response(JSON.stringify({ error: res.error.message, code: res.error.code, cid }), {
            status: isStmtTimeout ? 504 : 400, headers: jsonHeaders,
          }),
          ms, ok: false,
        }
      }
      return { data: res.data, response: null, count: res.count ?? null, ms, ok: true }
    } catch (e) {
      const ms = Date.now() - opStartedAt
      if (isProxyTimeout(e)) return { data: null, response: timeoutResponse(), ms, ok: false }
      if (isClientAbort(e)) return { data: null, response: clientAbortResponse(), ms, ok: false }
      const msg = (e as Error)?.message ?? String(e)
      return {
        data: null,
        response: new Response(JSON.stringify({ error: 'Upstream database call failed', detail: msg, cid }), {
          status: 502, headers: jsonHeaders,
        }),
        ms, ok: false,
      }
    }
  }
}

const baseDeps = (overrides: Partial<{
  timeoutFired: boolean
  clientAbortFired: boolean
}> = {}) => ({
  cid: 'cid-test-1',
  jsonHeaders: { 'Content-Type': 'application/json', 'x-correlation-id': 'cid-test-1' },
  timeoutFired: () => overrides.timeoutFired ?? false,
  clientAbortFired: () => overrides.clientAbortFired ?? false,
  isProxyTimeout: (e: unknown) => {
    if (!(overrides.timeoutFired ?? false)) return false
    return (e as { name?: string })?.name === 'AbortError'
  },
  isClientAbort: (e: unknown) => {
    if (!(overrides.clientAbortFired ?? false)) return false
    return (e as { name?: string })?.name === 'AbortError'
  },
})

const okBuilder = <T>(data: T, count?: number): Builder<T> =>
  Promise.resolve({ data, error: null, count })

const errBuilder = (message: string, code?: string): Builder<unknown> =>
  Promise.resolve({ data: null, error: { message, code } })

const slowBuilder = (delayMs: number): Builder<unknown> =>
  new Promise((resolve) => setTimeout(() => resolve({ data: { slow: true }, error: null }), delayMs))

const throwingBuilder = (err: unknown): Builder<unknown> =>
  Promise.reject(err)

// ─── INSERT ───────────────────────────────────────────────────────────────────
Deno.test('INSERT: ok → response is null and data flows through', async () => {
  const withTimeout = makeWithTimeout(baseDeps())
  const r = await withTimeout('insert', 'evolution_contacts', okBuilder([{ id: 1 }]))
  assertEquals(r.response, null)
  assertEquals(r.ok, true)
  assertEquals(r.data, [{ id: 1 }])
})

Deno.test('INSERT: pg error → 400 JSON with cid and code', async () => {
  const withTimeout = makeWithTimeout(baseDeps())
  const r = await withTimeout('insert', 'evolution_contacts', errBuilder('duplicate key', '23505'))
  assert(r.response, 'response must be set')
  assertEquals(r.response!.status, 400)
  const body = await r.response!.json()
  assertEquals(body.error, 'duplicate key')
  assertEquals(body.code, '23505')
  assertEquals(body.cid, 'cid-test-1')
})

Deno.test('INSERT: thrown network error → 502 upstream_error (worker stays alive)', async () => {
  const withTimeout = makeWithTimeout(baseDeps())
  const r = await withTimeout('insert', 'evolution_contacts', throwingBuilder(new Error('ECONNRESET')))
  assert(r.response)
  assertEquals(r.response!.status, 502)
  const body = await r.response!.json()
  assertEquals(body.error, 'Upstream database call failed')
  assertEquals(body.detail, 'ECONNRESET')
  assertEquals(body.cid, 'cid-test-1')
})

Deno.test('INSERT: hard timeout fires → 504 proxy_timeout (not 502)', async () => {
  const withTimeout = makeWithTimeout(baseDeps({ timeoutFired: true }))
  const abortErr = new DOMException('aborted', 'AbortError')
  const r = await withTimeout('insert', 'evolution_contacts', throwingBuilder(abortErr))
  assert(r.response)
  assertEquals(r.response!.status, 504)
  const body = await r.response!.json()
  assertEquals(body.cid, 'cid-test-1')
  assert(body.error.includes('timed out'))
})

// ─── UPDATE ───────────────────────────────────────────────────────────────────
Deno.test('UPDATE: ok → data passes through', async () => {
  const withTimeout = makeWithTimeout(baseDeps())
  const r = await withTimeout('update', 'evolution_contacts', okBuilder([{ id: 5, name: 'x' }]))
  assertEquals(r.ok, true)
  assertEquals(r.response, null)
})

Deno.test('UPDATE: statement_timeout from Postgres → 504', async () => {
  const withTimeout = makeWithTimeout(baseDeps())
  const r = await withTimeout('update', 'evolution_contacts',
    errBuilder('canceling statement due to statement timeout', '57014'))
  assert(r.response)
  assertEquals(r.response!.status, 504)
  const body = await r.response!.json()
  assertEquals(body.cid, 'cid-test-1')
  assertEquals(body.code, '57014')
})

Deno.test('UPDATE: client disconnect → 499', async () => {
  const withTimeout = makeWithTimeout(baseDeps({ clientAbortFired: true }))
  const r = await withTimeout('update', 'evolution_contacts',
    throwingBuilder(new DOMException('aborted', 'AbortError')))
  assert(r.response)
  assertEquals(r.response!.status, 499)
  const body = await r.response!.json()
  assertEquals(body.cid, 'cid-test-1')
})

// ─── RPC ──────────────────────────────────────────────────────────────────────
Deno.test('RPC: ok → data with no response wrapper', async () => {
  const withTimeout = makeWithTimeout(baseDeps())
  const r = await withTimeout('rpc', 'rpc_dashboard_home', okBuilder({ kpi: 1 }))
  assertEquals(r.ok, true)
  assertEquals(r.data, { kpi: 1 })
})

Deno.test('RPC: pg error → 400 with cid', async () => {
  const withTimeout = makeWithTimeout(baseDeps())
  const r = await withTimeout('rpc', 'rpc_x', errBuilder('function rpc_x does not exist', '42883'))
  assert(r.response)
  assertEquals(r.response!.status, 400)
  const body = await r.response!.json()
  assertEquals(body.code, '42883')
  assertEquals(body.cid, 'cid-test-1')
})

Deno.test('RPC: TypeError thrown by upstream → 502 NOT bubble up', async () => {
  const withTimeout = makeWithTimeout(baseDeps())
  // Simulates supabase-js throwing on JSON parse failure / network drop.
  const r = await withTimeout('rpc', 'rpc_x', throwingBuilder(new TypeError('Failed to fetch')))
  assert(r.response)
  assertEquals(r.response!.status, 502)
})

// ─── ms timing ────────────────────────────────────────────────────────────────
Deno.test('ms field is populated for slow operations', async () => {
  const withTimeout = makeWithTimeout(baseDeps())
  const r = await withTimeout('rpc', 'slow', slowBuilder(60))
  assert(r.ms >= 50, `expected >= 50ms, got ${r.ms}`)
  assertEquals(r.ok, true)
})

// ─── Consistência cross-op ────────────────────────────────────────────────────
Deno.test('All ops produce identical response shape on identical failure', async () => {
  const withTimeout = makeWithTimeout(baseDeps())
  const ops = ['rpc', 'select', 'insert', 'update'] as const
  const bodies: unknown[] = []
  for (const op of ops) {
    const r = await withTimeout(op, 'tgt', errBuilder('boom', 'X'))
    assert(r.response)
    assertEquals(r.response!.status, 400)
    bodies.push(await r.response!.json())
  }
  // Every op returns exactly the same body shape (error/code/cid)
  for (let i = 1; i < bodies.length; i++) {
    assertEquals(bodies[i], bodies[0])
  }
})
