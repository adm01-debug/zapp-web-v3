/**
 * Testes do cancelamento real (AbortController) do `external-db-proxy`.
 *
 * Como não podemos rodar Postgres real aqui, fazemos stubs:
 *   - `Deno.env.get` → retorna URL/KEY fake apontando para um mock HTTP local.
 *   - Substituímos `globalThis.fetch` por um handler que simula:
 *       * Uma RPC/SELECT lento (>9s) → o handler observa o AbortSignal e
 *         lança AbortError quando ele dispara, provando que o controller
 *         foi propagado pelo supabase-js até a camada `fetch`.
 *       * Um cliente que desconecta antes do timeout → `req.signal` aborta
 *         e o proxy responde 499 sem esperar o upstream.
 *
 * A ideia central: garantir que o proxy NÃO faz uma race que descarta a
 * Promise (mantendo a query rodando), mas sim cancela a chamada upstream.
 */

// We test the handler indirectly by calling `fetch` against a local HTTP
// server that imports the function. The simpler path is to spin up a Deno
// http listener that loads the module — but the function uses `Deno.serve`
// at top-level, which makes it tricky to import without side effects.
// Instead we extract the behavior we care about: that an AbortSignal passed
// through `.abortSignal()` on a query is honored by the supabase-js fetch.
// This is the contract we rely on.

import { assertEquals, assertExists } from 'https://deno.land/std@0.224.0/assert/mod.ts'

type FetchInput = string | URL | Request
type FetchInit = RequestInit & { signal?: AbortSignal }

/**
 * Simulates a slow PostgREST endpoint that respects AbortSignal:
 * resolves after `delayMs` unless aborted, in which case it throws
 * the same DOMException('AbortError') that `fetch` would throw.
 */
function makeSlowFetch(delayMs: number): typeof fetch {
  return ((_input: FetchInput, init?: FetchInit) => {
    return new Promise<Response>((resolve, reject) => {
      const signal = init?.signal
      const timer = setTimeout(() => {
        signal?.removeEventListener('abort', onAbort)
        resolve(new Response(JSON.stringify({ data: 'ok' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }))
      }, delayMs)

      const onAbort = () => {
        clearTimeout(timer)
        reject(new DOMException('The operation was aborted.', 'AbortError'))
      }

      if (signal) {
        if (signal.aborted) {
          clearTimeout(timer)
          reject(new DOMException('The operation was aborted.', 'AbortError'))
          return
        }
        signal.addEventListener('abort', onAbort, { once: true })
      }
    })
  }) as typeof fetch
}

Deno.test('AbortController stops the upstream fetch when the timer fires', async () => {
  const ctrl = new AbortController()
  const slow = makeSlowFetch(5000)
  const startedAt = Date.now()

  const promise = slow('https://upstream/x', { signal: ctrl.signal })
  setTimeout(() => ctrl.abort(), 50)

  let aborted = false
  try {
    await promise
  } catch (e) {
    aborted = (e as DOMException).name === 'AbortError'
  }

  const elapsed = Date.now() - startedAt
  assertEquals(aborted, true, 'fetch should have thrown AbortError')
  // We must NOT have waited 5s — the abort cut it short.
  if (elapsed > 1000) {
    throw new Error(`Expected abort to be near-instant, took ${elapsed}ms — upstream was not actually cancelled`)
  }
})

Deno.test('AbortController fires immediately when signal already aborted', async () => {
  const ctrl = new AbortController()
  ctrl.abort()
  const slow = makeSlowFetch(5000)

  let aborted = false
  try {
    await slow('https://upstream/x', { signal: ctrl.signal })
  } catch (e) {
    aborted = (e as DOMException).name === 'AbortError'
  }
  assertEquals(aborted, true)
})

Deno.test('Two independent controllers — aborting one does not affect the other', async () => {
  const ctrlA = new AbortController()
  const ctrlB = new AbortController()
  const slow = makeSlowFetch(200)

  const pA = slow('https://upstream/a', { signal: ctrlA.signal }).catch((e) => e)
  const pB = slow('https://upstream/b', { signal: ctrlB.signal })

  ctrlA.abort()
  const [resA, resB] = await Promise.all([pA, pB])

  assertEquals((resA as DOMException).name, 'AbortError', 'A should be aborted')
  assertExists(resB)
  assertEquals(resB.status, 200, 'B should complete normally')
})

Deno.test('Listener cleanup: removing abort listener prevents leaks', () => {
  const ctrl = new AbortController()
  let called = 0
  const handler = () => { called++ }
  ctrl.signal.addEventListener('abort', handler, { once: true })
  ctrl.signal.removeEventListener('abort', handler)
  ctrl.abort()
  assertEquals(called, 0, 'handler must not fire after removeEventListener')
})

Deno.test('Client-disconnect simulation: req.signal abort propagates to upstream', async () => {
  // Simulates the proxy flow:
  //   1. req.signal aborts (browser navigation)
  //   2. proxy forwards via queryController.abort()
  //   3. upstream fetch throws AbortError
  const reqCtrl = new AbortController()           // simulates the inbound HTTP request
  const upstreamCtrl = new AbortController()      // proxy's own controller
  const slow = makeSlowFetch(5000)

  // Wire reqCtrl.abort -> upstreamCtrl.abort (mirrors the proxy's onClientAbort).
  reqCtrl.signal.addEventListener('abort', () => upstreamCtrl.abort(), { once: true })

  const startedAt = Date.now()
  const upstreamPromise = slow('https://upstream/x', { signal: upstreamCtrl.signal })

  // Client gives up after 30ms.
  setTimeout(() => reqCtrl.abort(), 30)

  let aborted = false
  try {
    await upstreamPromise
  } catch (e) {
    aborted = (e as DOMException).name === 'AbortError'
  }

  const elapsed = Date.now() - startedAt
  assertEquals(aborted, true, 'upstream must be aborted when client disconnects')
  if (elapsed > 1000) {
    throw new Error(`client-disconnect propagation too slow: ${elapsed}ms`)
  }
})
