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
