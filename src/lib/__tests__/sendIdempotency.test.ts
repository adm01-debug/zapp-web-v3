import { describe, it, expect } from 'vitest';
import {
  buildSendIdempotencyKey,
  buildSendIdempotencyKeyFromFingerprint,
} from '../sendIdempotency';

describe('buildSendIdempotencyKey (row-id form)', () => {
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

describe('buildSendIdempotencyKeyFromFingerprint (content-aware form)', () => {
  const baseFp = {
    contactId: 'contact-1',
    messageType: 'text',
    content: 'Olá',
    mediaUrl: null,
    bucketMs: 5 * 60 * 1000,
    now: 1_700_000_000_000,
  };

  it('returns a key with the mfp: prefix and a known algo tag', async () => {
    const k = await buildSendIdempotencyKeyFromFingerprint(baseFp);
    expect(k).toMatch(/^mfp:(s256|fb1):[0-9a-f]{32}$/);
  });

  it('produces the SAME key for two sends with identical content within the bucket', async () => {
    const a = await buildSendIdempotencyKeyFromFingerprint(baseFp);
    const b = await buildSendIdempotencyKeyFromFingerprint({
      ...baseFp,
      // Different timestamp but same 5-minute bucket.
      now: baseFp.now + 60_000,
    });
    expect(a).toBe(b);
  });

  it('treats a manual resend (new row, same content) as the same key', async () => {
    // Caller does NOT pass a row id — that's the whole point: the key is
    // derived from the logical content, not the storage row.
    const firstSend = await buildSendIdempotencyKeyFromFingerprint(baseFp);
    const manualResend = await buildSendIdempotencyKeyFromFingerprint(baseFp);
    expect(manualResend).toBe(firstSend);
  });

  it('normalizes whitespace so trivial edits collapse to the same key', async () => {
    const a = await buildSendIdempotencyKeyFromFingerprint({ ...baseFp, content: 'Olá' });
    const b = await buildSendIdempotencyKeyFromFingerprint({ ...baseFp, content: '  Olá  ' });
    expect(a).toBe(b);
  });

  it('produces DIFFERENT keys for different contacts', async () => {
    const a = await buildSendIdempotencyKeyFromFingerprint(baseFp);
    const b = await buildSendIdempotencyKeyFromFingerprint({ ...baseFp, contactId: 'contact-2' });
    expect(a).not.toBe(b);
  });

  it('produces DIFFERENT keys for different content', async () => {
    const a = await buildSendIdempotencyKeyFromFingerprint(baseFp);
    const b = await buildSendIdempotencyKeyFromFingerprint({ ...baseFp, content: 'Outro' });
    expect(a).not.toBe(b);
  });

  it('produces DIFFERENT keys for different message types', async () => {
    const a = await buildSendIdempotencyKeyFromFingerprint(baseFp);
    const b = await buildSendIdempotencyKeyFromFingerprint({ ...baseFp, messageType: 'image' });
    expect(a).not.toBe(b);
  });

  it('produces DIFFERENT keys when the media URL changes', async () => {
    const a = await buildSendIdempotencyKeyFromFingerprint({
      ...baseFp,
      messageType: 'image',
      mediaUrl: 'https://cdn/a.jpg',
    });
    const b = await buildSendIdempotencyKeyFromFingerprint({
      ...baseFp,
      messageType: 'image',
      mediaUrl: 'https://cdn/b.jpg',
    });
    expect(a).not.toBe(b);
  });

  it('produces DIFFERENT keys across different time buckets', async () => {
    const a = await buildSendIdempotencyKeyFromFingerprint(baseFp);
    const b = await buildSendIdempotencyKeyFromFingerprint({
      ...baseFp,
      // Jump forward a full bucket.
      now: baseFp.now + baseFp.bucketMs + 1,
    });
    expect(a).not.toBe(b);
  });
});
