import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordDedupeEvent,
  getDedupeSnapshot,
  subscribeDedupeEvents,
  __resetDedupeMetricsForTests,
} from '@/lib/dedupeMetrics';

describe('dedupeMetrics', () => {
  beforeEach(() => __resetDedupeMetricsForTests());

  it('records an event and updates counters', () => {
    recordDedupeEvent({ key: 'req:idem:msg:1', outcome: 'leader', durationMs: 12, ok: true });
    const snap = getDedupeSnapshot();
    expect(snap.events).toHaveLength(1);
    expect(snap.events[0]).toMatchObject({
      key: 'req:idem:msg:1',
      outcome: 'leader',
      durationMs: 12,
      ok: true,
    });
    expect(snap.counters.leader).toBe(1);
    expect(snap.counters.total).toBe(1);
    expect(snap.counters.saved).toBe(0);
  });

  it('counts saved calls when follower replays successfully', () => {
    recordDedupeEvent({ key: 'k', outcome: 'follower-replay', durationMs: 5, ok: true });
    recordDedupeEvent({ key: 'k', outcome: 'follower-replay', durationMs: 5, ok: false });
    const snap = getDedupeSnapshot();
    expect(snap.counters.followerReplay).toBe(2);
    expect(snap.counters.saved).toBe(1);
  });

  it('tracks follower fallback separately', () => {
    recordDedupeEvent({ key: 'k', outcome: 'follower-fallback', durationMs: 80, ok: true });
    expect(getDedupeSnapshot().counters.followerFallback).toBe(1);
    expect(getDedupeSnapshot().counters.saved).toBe(0);
  });

  it('caps the ring buffer at 50 events (newest first)', () => {
    for (let i = 0; i < 60; i++) {
      recordDedupeEvent({ key: `k${i}`, outcome: 'leader', durationMs: 1, ok: true });
    }
    const snap = getDedupeSnapshot();
    expect(snap.events).toHaveLength(50);
    expect(snap.events[0].key).toBe('k59');
    expect(snap.counters.total).toBe(60);
  });

  it('notifies subscribers on each event', () => {
    let calls = 0;
    const unsub = subscribeDedupeEvents(() => {
      calls += 1;
    });
    recordDedupeEvent({ key: 'a', outcome: 'leader', durationMs: 1, ok: true });
    recordDedupeEvent({ key: 'b', outcome: 'leader', durationMs: 1, ok: true });
    expect(calls).toBe(2);
    unsub();
    recordDedupeEvent({ key: 'c', outcome: 'leader', durationMs: 1, ok: true });
    expect(calls).toBe(2);
  });

  it('clamps negative durations to 0', () => {
    recordDedupeEvent({ key: 'k', outcome: 'leader', durationMs: -7, ok: true });
    expect(getDedupeSnapshot().events[0].durationMs).toBe(0);
  });
});
