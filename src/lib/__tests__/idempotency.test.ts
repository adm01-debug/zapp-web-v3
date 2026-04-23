import { describe, it, expect } from 'vitest';
import {
  stableStringify,
  sha256Hex,
  normalizeIdempotencyKey,
  deriveIdempotencyKey,
} from '@/lib/idempotency';

describe('stableStringify', () => {
  it('sorts object keys consistently', () => {
    expect(stableStringify({ b: 2, a: 1 })).toBe(stableStringify({ a: 1, b: 2 }));
  });

  it('handles nested objects', () => {
    const a = stableStringify({ x: { c: 3, a: 1, b: 2 } });
    const b = stableStringify({ x: { a: 1, b: 2, c: 3 } });
    expect(a).toBe(b);
    expect(a).toBe('{"x":{"a":1,"b":2,"c":3}}');
  });

  it('preserves array order', () => {
    expect(stableStringify([3, 1, 2])).toBe('[3,1,2]');
  });

  it('removes undefined values', () => {
    expect(stableStringify({ a: 1, b: undefined })).toBe('{"a":1}');
  });

  it('handles null', () => {
    expect(stableStringify(null)).toBe('null');
  });
});

describe('sha256Hex', () => {
  it('returns 64 hex chars', async () => {
    const h = await sha256Hex('hello');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic', async () => {
    expect(await sha256Hex('abc')).toBe(await sha256Hex('abc'));
  });

  it('changes when input changes', async () => {
    expect(await sha256Hex('abc')).not.toBe(await sha256Hex('abd'));
  });
});

describe('normalizeIdempotencyKey', () => {
  it('returns undefined for undefined/empty/whitespace', () => {
    expect(normalizeIdempotencyKey(undefined)).toBeUndefined();
    expect(normalizeIdempotencyKey('')).toBeUndefined();
    expect(normalizeIdempotencyKey('   ')).toBeUndefined();
  });

  it('passes through safe ASCII', () => {
    expect(normalizeIdempotencyKey('abc-123_XYZ.+/=:')).toBe('abc-123_XYZ.+/=:');
  });

  it('replaces non-ASCII chars with _', () => {
    const out = normalizeIdempotencyKey('hello 🎉 ção')!;
    expect(out).toMatch(/^[A-Za-z0-9._\-:+/=]+$/);
    expect(out).toContain('hello');
  });

  it('truncates to 128 chars max with hash suffix', () => {
    const long = 'a'.repeat(200);
    const out = normalizeIdempotencyKey(long)!;
    expect(out.length).toBeLessThanOrEqual(128);
    expect(out).toMatch(/:h[0-9a-f]+$/);
  });

  it('produces different output for long keys with different suffixes', () => {
    const a = normalizeIdempotencyKey('x'.repeat(150) + 'AAA')!;
    const b = normalizeIdempotencyKey('x'.repeat(150) + 'BBB')!;
    expect(a).not.toBe(b);
  });
});

describe('deriveIdempotencyKey', () => {
  it('produces same key regardless of object key order', async () => {
    const a = await deriveIdempotencyKey('send', { a: 1, b: 2 });
    const b = await deriveIdempotencyKey('send', { b: 2, a: 1 });
    expect(a).toBe(b);
  });

  it('changes when payload changes', async () => {
    const a = await deriveIdempotencyKey('send', { a: 1 });
    const b = await deriveIdempotencyKey('send', { a: 2 });
    expect(a).not.toBe(b);
  });

  it('changes when action changes', async () => {
    const a = await deriveIdempotencyKey('send', { a: 1 });
    const b = await deriveIdempotencyKey('delete', { a: 1 });
    expect(a).not.toBe(b);
  });

  it('has auto_ prefix and bounded length', async () => {
    const k = await deriveIdempotencyKey('send', { a: 1 });
    expect(k.startsWith('auto_')).toBe(true);
    expect(k.length).toBeLessThanOrEqual(30);
  });
});
