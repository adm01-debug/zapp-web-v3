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

  // === EDGE CASES ===

  describe('internal whitespace', () => {
    it('replaces internal spaces with _', () => {
      const out = normalizeIdempotencyKey('hello world key')!;
      expect(out).toBe('hello_world_key');
    });

    it('replaces tabs and newlines with _', () => {
      const out = normalizeIdempotencyKey('a\tb\nc\rd')!;
      expect(out).toBe('a_b_c_d');
    });

    it('trims outer whitespace but preserves internal as _', () => {
      const out = normalizeIdempotencyKey('  hello world  ')!;
      expect(out).toBe('hello_world');
    });

    it('collapses keys that are only whitespace into undefined', () => {
      expect(normalizeIdempotencyKey('\t\n\r ')).toBeUndefined();
    });
  });

  describe('strings with only forbidden characters', () => {
    it('converts emoji-only string into all underscores', () => {
      const out = normalizeIdempotencyKey('🎉🎊✨')!;
      expect(out).toBeDefined();
      expect(out).toMatch(/^_+$/);
    });

    it('converts non-ASCII letter-only string into all underscores', () => {
      const out = normalizeIdempotencyKey('çãñ')!;
      expect(out).toMatch(/^_+$/);
    });

    it('handles single forbidden char', () => {
      expect(normalizeIdempotencyKey('é')).toBe('_');
    });
  });

  describe('boundary around 128-char limit', () => {
    it('passes through unchanged at exactly 128 chars', () => {
      const input = 'a'.repeat(128);
      const out = normalizeIdempotencyKey(input)!;
      expect(out).toBe(input);
      expect(out.length).toBe(128);
      expect(out).not.toMatch(/:h[0-9a-f]+$/);
    });

    it('passes through unchanged at 127 chars', () => {
      const input = 'a'.repeat(127);
      const out = normalizeIdempotencyKey(input)!;
      expect(out).toBe(input);
      expect(out.length).toBe(127);
    });

    it('truncates with hash suffix at 129 chars', () => {
      const input = 'a'.repeat(129);
      const out = normalizeIdempotencyKey(input)!;
      expect(out.length).toBeLessThanOrEqual(128);
      expect(out).toMatch(/:h[0-9a-f]+$/);
    });

    it('keeps unique suffixes for inputs differing only past the limit', () => {
      const a = normalizeIdempotencyKey('a'.repeat(128) + 'X')!;
      const b = normalizeIdempotencyKey('a'.repeat(128) + 'Y')!;
      expect(a).not.toBe(b);
      expect(a.length).toBeLessThanOrEqual(128);
      expect(b.length).toBeLessThanOrEqual(128);
    });

    it('truncated output preserves head prefix from original', () => {
      const input = 'prefix-' + 'a'.repeat(200);
      const out = normalizeIdempotencyKey(input)!;
      expect(out.startsWith('prefix-')).toBe(true);
      expect(out.length).toBeLessThanOrEqual(128);
    });
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
