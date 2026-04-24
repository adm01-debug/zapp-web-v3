// Testes para backoff exponencial e idempotency key da DLQ.
// Rodar: deno test supabase/functions/_shared/__tests__/dlq-backoff.test.ts

import { assert, assertEquals, assertNotEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  computeBackoffMs,
  stableStringify,
  buildIdempotencyKey,
  classifyRetryReason,
  computeBackoffMsByReason,
} from '../dlq-backoff.ts';

Deno.test('computeBackoffMs sem jitter é determinístico e cresce exponencialmente', () => {
  assertEquals(computeBackoffMs(1, false), 60_000);
  assertEquals(computeBackoffMs(2, false), 120_000);
  assertEquals(computeBackoffMs(3, false), 240_000);
  assertEquals(computeBackoffMs(4, false), 480_000);
  assertEquals(computeBackoffMs(5, false), 960_000);
});

Deno.test('computeBackoffMs respeita o teto de 60min', () => {
  assertEquals(computeBackoffMs(10, false), 3_600_000);
  assertEquals(computeBackoffMs(99, false), 3_600_000);
});

Deno.test('computeBackoffMs com jitter fica dentro de ±15% do valor base', () => {
  for (let i = 0; i < 50; i++) {
    const v = computeBackoffMs(2, true); // base 120000
    assert(v >= 120_000 * 0.85 - 1, `valor ${v} abaixo do esperado`);
    assert(v <= 120_000 * 1.15 + 1, `valor ${v} acima do esperado`);
  }
});

Deno.test('computeBackoffMs trata attempt inválido como 1', () => {
  assertEquals(computeBackoffMs(0, false), 60_000);
  assertEquals(computeBackoffMs(-5, false), 60_000);
});

Deno.test('stableStringify produz mesma saída independente da ordem das chaves', () => {
  const a = stableStringify({ b: 2, a: 1, c: { y: 2, x: 1 } });
  const b = stableStringify({ a: 1, c: { x: 1, y: 2 }, b: 2 });
  assertEquals(a, b);
});

Deno.test('buildIdempotencyKey é determinístico para mesmo (instance,path,payload)', async () => {
  const k1 = await buildIdempotencyKey('wpp2', '/message/sendText', { number: '5511999', text: 'oi' });
  const k2 = await buildIdempotencyKey('wpp2', '/message/sendText', { text: 'oi', number: '5511999' });
  assertEquals(k1, k2);
  assertEquals(k1.length, 64); // SHA-256 hex
});

Deno.test('buildIdempotencyKey muda quando payload muda', async () => {
  const k1 = await buildIdempotencyKey('wpp2', '/message/sendText', { number: '1', text: 'a' });
  const k2 = await buildIdempotencyKey('wpp2', '/message/sendText', { number: '1', text: 'b' });
  assertNotEquals(k1, k2);
});

Deno.test('buildIdempotencyKey muda quando rota muda', async () => {
  const p = { number: '1', text: 'a' };
  const k1 = await buildIdempotencyKey('wpp2', '/message/sendText', p);
  const k2 = await buildIdempotencyKey('wpp2', '/message/sendMedia', p);
  assertNotEquals(k1, k2);
});

Deno.test('buildIdempotencyKey ignora __path injetado no payload', async () => {
  const k1 = await buildIdempotencyKey('wpp2', '/message/sendText', { number: '1' });
  const k2 = await buildIdempotencyKey('wpp2', '/message/sendText', { number: '1', __path: '/message/sendText' });
  assertEquals(k1, k2);
});

// ============================================================================
// Reason-aware backoff
// ============================================================================

Deno.test('classifyRetryReason: status HTTP tem precedência', () => {
  assertEquals(classifyRetryReason(429, null), 'rate_limit');
  assertEquals(classifyRetryReason(503, null), 'unavailable');
  assertEquals(classifyRetryReason(502, null), 'unavailable');
  assertEquals(classifyRetryReason(401, null), 'auth');
  assertEquals(classifyRetryReason(404, null), 'not_found');
  assertEquals(classifyRetryReason(422, null), 'invalid_payload');
  assertEquals(classifyRetryReason(500, null), 'server_error');
});

Deno.test('classifyRetryReason: heurística por mensagem quando sem status', () => {
  assertEquals(classifyRetryReason(null, 'request timeout after 30s'), 'timeout');
  assertEquals(classifyRetryReason(null, 'ECONNRESET on socket'), 'network');
  assertEquals(classifyRetryReason(null, 'Too Many Requests'), 'rate_limit');
  assertEquals(classifyRetryReason(null, ''), 'unknown');
  assertEquals(classifyRetryReason(null, null), 'unknown');
});

Deno.test('computeBackoffMsByReason: rate_limit respeita piso de 2min', () => {
  assert(computeBackoffMsByReason(1, 'rate_limit', false) >= 120_000);
});

Deno.test('computeBackoffMsByReason: timeout reagenda mais rápido que rate_limit', () => {
  const t = computeBackoffMsByReason(1, 'timeout', false);
  const r = computeBackoffMsByReason(1, 'rate_limit', false);
  assert(t <= r, `timeout ${t} deveria ser <= rate_limit ${r}`);
});

Deno.test('computeBackoffMsByReason: respeita teto de 1h mesmo com multiplier alto', () => {
  assertEquals(computeBackoffMsByReason(10, 'rate_limit', false), 3_600_000);
  assertEquals(computeBackoffMsByReason(99, 'rate_limit', false), 3_600_000);
});

Deno.test('computeBackoffMsByReason: unknown attempt=1 equivale ao backoff base', () => {
  assertEquals(computeBackoffMsByReason(1, 'unknown', false), computeBackoffMs(1, false));
});

Deno.test('computeBackoffMsByReason: jitter ±15% mantido', () => {
  for (let i = 0; i < 50; i++) {
    const v = computeBackoffMsByReason(1, 'unavailable', true);
    // base attempt=1 (60s) * mult=2 = 120000, ±15%
    assert(v >= 120_000 * 0.85 - 1, `valor ${v} abaixo do esperado`);
    assert(v <= 120_000 * 1.15 + 1, `valor ${v} acima do esperado`);
  }
});
