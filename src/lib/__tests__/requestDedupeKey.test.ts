import { describe, it, expect } from 'vitest';
import {
  buildRequestDedupeKey,
  normalizeEndpoint,
  shouldIncludeBody,
} from '@/lib/requestDedupeKey';

describe('shouldIncludeBody', () => {
  it.each(['GET', 'HEAD', 'OPTIONS', 'get', ' head '])('skips body for %s', (m) => {
    expect(shouldIncludeBody(m)).toBe(false);
  });
  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('includes body for %s', (m) => {
    expect(shouldIncludeBody(m)).toBe(true);
  });
});

describe('normalizeEndpoint', () => {
  it('lowercases host but preserves path case', () => {
    expect(normalizeEndpoint('HTTPS://Api.Example.com/v1/Send')).toBe(
      'https://api.example.com/v1/Send',
    );
  });
  it('removes hash fragment', () => {
    expect(normalizeEndpoint('https://x.com/a#frag')).toBe('https://x.com/a');
  });
  it('strips trailing slash from non-root path', () => {
    expect(normalizeEndpoint('https://x.com/a/')).toBe('https://x.com/a');
    expect(normalizeEndpoint('https://x.com/')).toBe('https://x.com/');
  });
  it('sorts query params alphabetically (absolute)', () => {
    expect(normalizeEndpoint('https://x.com/a?b=2&a=1')).toBe(
      normalizeEndpoint('https://x.com/a?a=1&b=2'),
    );
  });
  it('sorts query params alphabetically (relative)', () => {
    expect(normalizeEndpoint('/api/x?b=2&a=1')).toBe('/api/x?a=1&b=2');
  });
  it('handles empty / whitespace', () => {
    expect(normalizeEndpoint('  ')).toBe('');
    expect(normalizeEndpoint('')).toBe('');
    expect(normalizeEndpoint(undefined as unknown as string)).toBe('');
  });

  describe('relative endpoints', () => {
    it('preserves leading-slash absolute vs bare-relative distinction', () => {
      expect(normalizeEndpoint('/api/x')).toBe('/api/x');
      expect(normalizeEndpoint('api/x')).toBe('api/x');
      expect(normalizeEndpoint('/api/x')).not.toBe(normalizeEndpoint('api/x'));
    });

    it('collapses redundant `./` and `//` segments', () => {
      expect(normalizeEndpoint('/api/./x')).toBe('/api/x');
      expect(normalizeEndpoint('/api//x')).toBe('/api/x');
      expect(normalizeEndpoint('/api///x///y')).toBe('/api/x/y');
      expect(normalizeEndpoint('./api/x')).toBe('api/x');
    });

    it('resolves `..` segments up to the root', () => {
      expect(normalizeEndpoint('/api/v1/../v2/x')).toBe('/api/v2/x');
      expect(normalizeEndpoint('/a/b/c/../../d')).toBe('/a/d');
      expect(normalizeEndpoint('/../../api/x')).toBe('/api/x');
      expect(normalizeEndpoint('../api/x')).toBe('../api/x');
    });

    it('treats `?` with no query (or only separators) as no query at all', () => {
      expect(normalizeEndpoint('/api/x?')).toBe('/api/x');
      expect(normalizeEndpoint('/api/x?&')).toBe('/api/x');
      expect(normalizeEndpoint('/api/x?&&')).toBe('/api/x');
      expect(normalizeEndpoint('/api/x?=value')).toBe('/api/x');
      expect(normalizeEndpoint('/api/x?=')).toBe('/api/x');
    });

    it('strips trailing slashes consistently (single or multiple)', () => {
      expect(normalizeEndpoint('/api/x/')).toBe('/api/x');
      expect(normalizeEndpoint('/api/x///')).toBe('/api/x');
      expect(normalizeEndpoint('/')).toBe('/');
      expect(normalizeEndpoint('/api/x/?b=2&a=1')).toBe('/api/x?a=1&b=2');
    });

    it('preserves explicit empty value `?a=` distinct from missing `=` `?a`', () => {
      expect(normalizeEndpoint('/api/x?a=')).toBe('/api/x?a=');
      expect(normalizeEndpoint('/api/x?a')).toBe('/api/x?a');
      expect(normalizeEndpoint('/api/x?a=')).not.toBe(normalizeEndpoint('/api/x?a'));
    });
  });

  describe('absolute endpoints', () => {
    it('treats trailing slash as equivalent to no slash on absolute URLs', () => {
      expect(normalizeEndpoint('https://x.com/a/')).toBe('https://x.com/a');
      expect(normalizeEndpoint('https://x.com/a///')).toBe('https://x.com/a');
      expect(normalizeEndpoint('https://x.com/')).toBe('https://x.com/');
      expect(normalizeEndpoint('https://x.com')).toBe('https://x.com/');
    });

    it('treats `?` with no query as no query', () => {
      expect(normalizeEndpoint('https://x.com/a?')).toBe('https://x.com/a');
      expect(normalizeEndpoint('https://x.com/a?&')).toBe('https://x.com/a');
    });

    it('resolves `..` segments inside absolute paths', () => {
      expect(normalizeEndpoint('https://x.com/api/v1/../v2/x')).toBe('https://x.com/api/v2/x');
      expect(normalizeEndpoint('https://x.com/a//b')).toBe('https://x.com/a/b');
    });
  });

  describe('cross-form equivalence', () => {
    it('all variants of the same logical relative endpoint produce the same key', () => {
      const expected = '/api/x?a=1&b=2';
      expect(normalizeEndpoint('/api/x?a=1&b=2')).toBe(expected);
      expect(normalizeEndpoint('/api/x?b=2&a=1')).toBe(expected);
      expect(normalizeEndpoint('/api/x/?a=1&b=2')).toBe(expected);
      expect(normalizeEndpoint('/api/./x?a=1&b=2')).toBe(expected);
      expect(normalizeEndpoint('/api//x?a=1&b=2#frag')).toBe(expected);
      expect(normalizeEndpoint('  /api/x?a=1&b=2  ')).toBe(expected);
    });

    it('all variants of the same logical absolute endpoint produce the same key', () => {
      const expected = normalizeEndpoint('https://api.x.com/v1/send');
      expect(normalizeEndpoint('HTTPS://API.X.com/v1/send')).toBe(expected);
      expect(normalizeEndpoint('https://api.x.com/v1/send/')).toBe(expected);
      expect(normalizeEndpoint('https://api.x.com/v1/send#x')).toBe(expected);
      expect(normalizeEndpoint('https://api.x.com/v1/send?')).toBe(expected);
      expect(normalizeEndpoint('https://api.x.com/v1/extra/../send')).toBe(expected);
    });
  });
});

describe('buildRequestDedupeKey — endpoint normalization parity', () => {
  it('relative endpoint variants collapse to the same dedupe key', async () => {
    const variants = [
      '/api/x?a=1&b=2',
      '/api/x?b=2&a=1',
      '/api/x/?a=1&b=2',
      '/api/./x?a=1&b=2',
      '/api//x?a=1&b=2#frag',
      '/api/x?a=1&b=2&',
    ];
    const keys = await Promise.all(
      variants.map((endpoint) => buildRequestDedupeKey({ endpoint, method: 'POST' })),
    );
    for (const k of keys) expect(k).toBe(keys[0]);
  });

  it('absolute endpoint variants collapse to the same dedupe key', async () => {
    const variants = [
      'https://API.X.com/v1/send',
      'https://api.x.com/v1/send/',
      'https://api.x.com/v1/send#frag',
      'https://api.x.com/v1/send?',
      'https://api.x.com/v1/extra/../send',
    ];
    const keys = await Promise.all(
      variants.map((endpoint) => buildRequestDedupeKey({ endpoint, method: 'POST' })),
    );
    for (const k of keys) expect(k).toBe(keys[0]);
  });

  it('empty-effective queries do not perturb the dedupe key', async () => {
    const base = await buildRequestDedupeKey({ endpoint: '/api/x', method: 'GET' });
    const variants = ['/api/x?', '/api/x?&', '/api/x?&&', '/api/x?='];
    for (const endpoint of variants) {
      const k = await buildRequestDedupeKey({ endpoint, method: 'GET' });
      expect(k).toBe(base);
    }
  });
});

describe('buildRequestDedupeKey', () => {
  it('produces the same key for identical input', async () => {
    const a = await buildRequestDedupeKey({ endpoint: '/api/x', method: 'POST', body: { a: 1 } });
    const b = await buildRequestDedupeKey({ endpoint: '/api/x', method: 'POST', body: { a: 1 } });
    expect(a).toBe(b);
    expect(a).toMatch(/^req:h:[a-f0-9]{24}$/);
  });

  it('collides regardless of body key order (stableStringify)', async () => {
    const a = await buildRequestDedupeKey({
      endpoint: '/api/x',
      method: 'POST',
      body: { a: 1, b: 2 },
    });
    const b = await buildRequestDedupeKey({
      endpoint: '/api/x',
      method: 'POST',
      body: { b: 2, a: 1 },
    });
    expect(a).toBe(b);
  });

  it('collides regardless of query param order in endpoint', async () => {
    const a = await buildRequestDedupeKey({ endpoint: '/api/x?b=2&a=1', method: 'POST' });
    const b = await buildRequestDedupeKey({ endpoint: '/api/x?a=1&b=2', method: 'POST' });
    expect(a).toBe(b);
  });

  it('different methods → different keys', async () => {
    const a = await buildRequestDedupeKey({ endpoint: '/api/x', method: 'POST' });
    const b = await buildRequestDedupeKey({ endpoint: '/api/x', method: 'PUT' });
    expect(a).not.toBe(b);
  });

  it('different endpoints → different keys', async () => {
    const a = await buildRequestDedupeKey({ endpoint: '/api/x', method: 'POST' });
    const b = await buildRequestDedupeKey({ endpoint: '/api/y', method: 'POST' });
    expect(a).not.toBe(b);
  });

  it('different bodies → different keys', async () => {
    const a = await buildRequestDedupeKey({ endpoint: '/api/x', method: 'POST', body: { a: 1 } });
    const b = await buildRequestDedupeKey({ endpoint: '/api/x', method: 'POST', body: { a: 2 } });
    expect(a).not.toBe(b);
  });

  it('GET ignores body', async () => {
    const a = await buildRequestDedupeKey({ endpoint: '/api/x', method: 'GET', body: { a: 1 } });
    const b = await buildRequestDedupeKey({ endpoint: '/api/x', method: 'GET', body: { a: 999 } });
    const c = await buildRequestDedupeKey({ endpoint: '/api/x', method: 'GET' });
    expect(a).toBe(b);
    expect(a).toBe(c);
  });

  it('POST without body equals POST with body=undefined', async () => {
    const a = await buildRequestDedupeKey({ endpoint: '/api/x', method: 'POST' });
    const b = await buildRequestDedupeKey({ endpoint: '/api/x', method: 'POST', body: undefined });
    expect(a).toBe(b);
  });

  it('Idempotency-Key wins over endpoint/method/body', async () => {
    const a = await buildRequestDedupeKey({
      endpoint: '/api/x',
      method: 'POST',
      body: { a: 1 },
      idempotencyKey: 'msg:abc-123',
    });
    const b = await buildRequestDedupeKey({
      endpoint: '/api/totally-different',
      method: 'PUT',
      body: { z: 9 },
      idempotencyKey: 'msg:abc-123',
    });
    expect(a).toBe(b);
    expect(a).toBe('req:idem:msg:abc-123');
  });

  it('empty / whitespace idempotency key falls back to hash', async () => {
    const a = await buildRequestDedupeKey({
      endpoint: '/api/x',
      method: 'POST',
      idempotencyKey: '   ',
    });
    expect(a).toMatch(/^req:h:/);
  });

  it('non-ASCII idempotency key is normalized (sanitized to safe charset)', async () => {
    const a = await buildRequestDedupeKey({
      endpoint: '/api/x',
      method: 'POST',
      idempotencyKey: 'msg:áéí-✓',
    });
    expect(a.startsWith('req:idem:')).toBe(true);
    expect(a).not.toContain('✓');
  });

  it('host case-insensitive collision', async () => {
    const a = await buildRequestDedupeKey({
      endpoint: 'https://API.X.com/v1/send',
      method: 'POST',
    });
    const b = await buildRequestDedupeKey({
      endpoint: 'https://api.x.com/v1/send',
      method: 'POST',
    });
    expect(a).toBe(b);
  });

  it('path case-sensitive distinction', async () => {
    const a = await buildRequestDedupeKey({
      endpoint: 'https://x.com/Send',
      method: 'POST',
    });
    const b = await buildRequestDedupeKey({
      endpoint: 'https://x.com/send',
      method: 'POST',
    });
    expect(a).not.toBe(b);
  });

  it('trailing slash and hash are normalized away', async () => {
    const a = await buildRequestDedupeKey({
      endpoint: 'https://x.com/a/',
      method: 'POST',
    });
    const b = await buildRequestDedupeKey({
      endpoint: 'https://x.com/a#frag',
      method: 'POST',
    });
    expect(a).toBe(b);
  });
});
