import { describe, it, expect } from 'vitest';
import { classifyRootCause, aggregateByRootCause } from '../failureRootCause';

describe('classifyRootCause', () => {
  it('classifies HTTP 429 as rate_limit', () => {
    expect(classifyRootCause({ http_status: 429 })).toBe('rate_limit');
  });

  it('classifies 502/503/504 as unavailable', () => {
    expect(classifyRootCause({ http_status: 502 })).toBe('unavailable');
    expect(classifyRootCause({ http_status: 503 })).toBe('unavailable');
    expect(classifyRootCause({ http_status: 504 })).toBe('unavailable');
  });

  it('classifies 401/403 as auth', () => {
    expect(classifyRootCause({ http_status: 401 })).toBe('auth');
    expect(classifyRootCause({ http_status: 403 })).toBe('auth');
  });

  it('classifies 404 as not_found', () => {
    expect(classifyRootCause({ http_status: 404 })).toBe('not_found');
  });

  it('classifies 400/422 as invalid_payload', () => {
    expect(classifyRootCause({ http_status: 400 })).toBe('invalid_payload');
    expect(classifyRootCause({ http_status: 422 })).toBe('invalid_payload');
  });

  it('classifies generic 5xx as server_error', () => {
    expect(classifyRootCause({ http_status: 500 })).toBe('server_error');
    expect(classifyRootCause({ http_status: 599 })).toBe('server_error');
  });

  it('respects explicit error_code over status', () => {
    expect(classifyRootCause({ error_code: 'timeout', http_status: 200 })).toBe('timeout');
    expect(classifyRootCause({ error_code: 'rate_limit' })).toBe('rate_limit');
    expect(classifyRootCause({ error_code: 'network_error' })).toBe('network');
    expect(classifyRootCause({ error_code: 'unauthorized' })).toBe('auth');
  });

  it('parses http_xxx error_code pattern', () => {
    expect(classifyRootCause({ error_code: 'http_429' })).toBe('rate_limit');
    expect(classifyRootCause({ error_code: 'http_503' })).toBe('unavailable');
    expect(classifyRootCause({ error_code: 'http_401' })).toBe('auth');
  });

  it('falls back to error_message heuristics', () => {
    expect(classifyRootCause({ error_message: 'Request timed out after 30s' })).toBe('timeout');
    expect(classifyRootCause({ error_message: 'Too Many Requests' })).toBe('rate_limit');
    expect(classifyRootCause({ error_message: 'ECONNRESET on socket' })).toBe('network');
    expect(classifyRootCause({ error_message: 'Invalid token' })).toBe('auth');
  });

  it('returns unknown when no context available', () => {
    expect(classifyRootCause({})).toBe('unknown');
    expect(classifyRootCause({ error_code: 'wat' })).toBe('unknown');
  });
});

describe('aggregateByRootCause', () => {
  it('groups and sorts by count desc', () => {
    const agg = aggregateByRootCause([
      { http_status: 429 },
      { http_status: 429 },
      { http_status: 503 },
      { error_code: 'timeout' },
    ]);
    expect(agg[0]).toMatchObject({ cause: 'rate_limit', count: 2 });
    expect(agg.find(a => a.cause === 'unavailable')?.count).toBe(1);
    expect(agg.find(a => a.cause === 'timeout')?.count).toBe(1);
  });

  it('returns empty array for empty input', () => {
    expect(aggregateByRootCause([])).toEqual([]);
  });
});
