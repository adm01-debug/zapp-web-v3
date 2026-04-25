import { assertEquals, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { computeMetrics, evaluateAlerts, quantile } from './index.ts'

Deno.test('quantile: empty array returns 0', () => {
  assertEquals(quantile([], 0.5), 0)
})

Deno.test('quantile: single element', () => {
  assertEquals(quantile([100], 0.95), 100)
})

Deno.test('quantile: p50 of 1..100 ≈ 50.5', () => {
  const arr = Array.from({ length: 100 }, (_, i) => i + 1)
  const p50 = quantile(arr, 0.5)
  assert(p50 > 50 && p50 < 51, `expected ~50.5, got ${p50}`)
})

Deno.test('computeMetrics: empty input → zeros', () => {
  const m = computeMetrics([], 15)
  assertEquals(m.sample_size, 0)
  assertEquals(m.error_rate, 0)
  assertEquals(m.latency_p95_ms, 0)
})

Deno.test('computeMetrics: counts 503/504 + computes error rate', () => {
  const rows = [
    { status: 200, ms: 100, ok: true, timeout_fired: false, pg_timeout: false, target: 'evolution_messages', op: 'select' },
    { status: 200, ms: 150, ok: true, timeout_fired: false, pg_timeout: false, target: 'evolution_messages', op: 'select' },
    { status: 504, ms: 9000, ok: false, timeout_fired: true, pg_timeout: false, target: 'evolution_messages', op: 'select' },
    { status: 503, ms: 200, ok: false, timeout_fired: false, pg_timeout: false, target: 'rpc_dashboard_home', op: 'rpc' },
    { status: 400, ms: 50, ok: false, timeout_fired: false, pg_timeout: false, target: 'evolution_contacts', op: 'select' },
  ]
  const m = computeMetrics(rows, 15)
  assertEquals(m.total, 5)
  assertEquals(m.status_5xx, 2)
  assertEquals(m.status_504, 1)
  assertEquals(m.status_503, 1)
  assertEquals(m.status_4xx, 1)
  assertEquals(m.timeouts, 1)
  assertEquals(m.error_rate, 0.4)
  assertEquals(m.timeout_rate, 0.2)
})

Deno.test('computeMetrics: groups by target', () => {
  const rows = Array.from({ length: 10 }, () => ({
    status: 200, ms: 100, ok: true, timeout_fired: false, pg_timeout: false,
    target: 'evolution_messages', op: 'select',
  }))
  rows.push({
    status: 504, ms: 9000, ok: false, timeout_fired: true, pg_timeout: false,
    target: 'evolution_messages', op: 'select',
  })
  const m = computeMetrics(rows, 15)
  assertEquals(m.by_target.length, 1)
  assertEquals(m.by_target[0].target, 'evolution_messages')
  assertEquals(m.by_target[0].count, 11)
})

Deno.test('evaluateAlerts: under min sample size → no alerts', () => {
  const m = computeMetrics(
    Array.from({ length: 5 }, () => ({
      status: 504, ms: 9000, ok: false, timeout_fired: true, pg_timeout: false,
      target: 't', op: 'select',
    })),
    15,
  )
  assertEquals(evaluateAlerts(m).length, 0)
})

Deno.test('evaluateAlerts: 50% error rate → critical', () => {
  const rows = [
    ...Array.from({ length: 25 }, () => ({ status: 500, ms: 100, ok: false, timeout_fired: false, pg_timeout: false, target: 't', op: 'select' })),
    ...Array.from({ length: 25 }, () => ({ status: 200, ms: 100, ok: true,  timeout_fired: false, pg_timeout: false, target: 't', op: 'select' })),
  ]
  const m = computeMetrics(rows, 15)
  const alerts = evaluateAlerts(m)
  const er = alerts.find((a) => a.kind === 'error_rate')
  assert(er, 'expected error_rate alert')
  assertEquals(er!.severity, 'critical')
})

Deno.test('evaluateAlerts: high p95 latency → warning', () => {
  // 25 fast + 25 slow → p95 will be ~3000ms (> 2000 warn, < 5000 crit)
  const rows = [
    ...Array.from({ length: 45 }, () => ({ status: 200, ms: 100,  ok: true, timeout_fired: false, pg_timeout: false, target: 't', op: 'select' })),
    ...Array.from({ length: 5 },  () => ({ status: 200, ms: 3000, ok: true, timeout_fired: false, pg_timeout: false, target: 't', op: 'select' })),
  ]
  const m = computeMetrics(rows, 15)
  const lat = evaluateAlerts(m).find((a) => a.kind === 'latency_p95')
  assert(lat, 'expected latency_p95 alert')
  assertEquals(lat!.severity, 'warning')
})
