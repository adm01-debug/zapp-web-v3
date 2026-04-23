import { describe, it, expect } from 'vitest';
import { buildSendIdempotencyKey } from '../sendIdempotency';

describe('buildSendIdempotencyKey', () => {
  it('returns a stable key prefixed with msg:', () => {
    expect(buildSendIdempotencyKey('abc-123')).toBe('msg:abc-123');
  });
  it('is deterministic for the same id', () => {
    expect(buildSendIdempotencyKey('x')).toBe(buildSendIdempotencyKey('x'));
  });
  it('differs across ids', () => {
    expect(buildSendIdempotencyKey('a')).not.toBe(buildSendIdempotencyKey('b'));
  });
});
