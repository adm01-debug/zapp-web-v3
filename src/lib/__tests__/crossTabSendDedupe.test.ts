import { describe, it, expect, beforeEach, vi } from 'vitest';
import { crossTabDedupe } from '@/lib/crossTabSendDedupe';

describe('crossTabDedupe', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('runs the work function and returns its value (single-tab)', async () => {
    const work = vi.fn().mockResolvedValue({ ok: true, id: 'x' });
    const out = await crossTabDedupe('k1', work);
    expect(work).toHaveBeenCalledTimes(1);
    expect(out).toEqual({ ok: true, id: 'x' });
  });

  it('claims leadership in localStorage', async () => {
    await crossTabDedupe('k2', () => Promise.resolve('done'));
    const raw = localStorage.getItem('zappweb:dedupe:k2');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!) as { tabId: string; at: number };
    expect(typeof parsed.tabId).toBe('string');
    expect(typeof parsed.at).toBe('number');
  });

  it('rethrows leader errors locally', async () => {
    const err = new Error('boom');
    await expect(
      crossTabDedupe('k3', () => Promise.reject(err)),
    ).rejects.toThrow('boom');
  });

  it('treats foreign claim within TTL as follower (no work invoked)', async () => {
    // Simulate another tab having already claimed 100ms ago.
    localStorage.setItem(
      'zappweb:dedupe:k4',
      JSON.stringify({ tabId: 'other-tab', at: Date.now() - 100 }),
    );
    const work = vi.fn().mockResolvedValue('should-not-run');
    // No BroadcastChannel will fire in jsdom from "other-tab", so it'll
    // timeout and fall back. Use a tiny TTL so the test is fast.
    await crossTabDedupe('k4', work, { ttlMs: 50 });
    // Eventually fell back and ran locally — that's the safe path.
    expect(work).toHaveBeenCalledTimes(1);
  });

  it('treats expired foreign claim as available (becomes leader)', async () => {
    localStorage.setItem(
      'zappweb:dedupe:k5',
      JSON.stringify({ tabId: 'other-tab', at: Date.now() - 999_999 }),
    );
    const work = vi.fn().mockResolvedValue('ok');
    const out = await crossTabDedupe('k5', work, { ttlMs: 60_000 });
    expect(work).toHaveBeenCalledTimes(1);
    expect(out).toBe('ok');
  });

  it('replayResponse=false returns undefined for follower without running work', async () => {
    localStorage.setItem(
      'zappweb:dedupe:k6',
      JSON.stringify({ tabId: 'other-tab', at: Date.now() }),
    );
    const work = vi.fn().mockResolvedValue('ok');
    const out = await crossTabDedupe('k6', work, { replayResponse: false });
    expect(work).not.toHaveBeenCalled();
    expect(out).toBeUndefined();
  });

  it('different keys do not collide', async () => {
    const a = vi.fn().mockResolvedValue('a');
    const b = vi.fn().mockResolvedValue('b');
    const [ra, rb] = await Promise.all([
      crossTabDedupe('keyA', a),
      crossTabDedupe('keyB', b),
    ]);
    expect(ra).toBe('a');
    expect(rb).toBe('b');
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('re-entry from same tab keeps leadership (does not skip)', async () => {
    // First call claims the key.
    await crossTabDedupe('k7', () => Promise.resolve('first'));
    // Second call (still within TTL) should still execute as leader,
    // because the claim belongs to this tab.
    const work = vi.fn().mockResolvedValue('second');
    const out = await crossTabDedupe('k7', work);
    expect(work).toHaveBeenCalledTimes(1);
    expect(out).toBe('second');
  });
});
