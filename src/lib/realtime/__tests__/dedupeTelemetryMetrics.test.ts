import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordDedupeEvent,
  resetDedupeTelemetry,
  getDedupeTelemetrySnapshot,
  subscribeDedupeTelemetry,
} from '@/lib/realtime/dedupeTelemetry';

describe('dedupeTelemetry — métricas leader/follower + latência', () => {
  beforeEach(() => resetDedupeTelemetry());

  it('classifica leader, follower e local cache corretamente', () => {
    recordDedupeEvent({ key: 'inbox:initial:A:100', reason: 'lock_acquired_lead', durationMs: 250 });
    recordDedupeEvent({ key: 'inbox:initial:A:100', reason: 'fallback_after_wait', durationMs: 300 });
    recordDedupeEvent({ key: 'inbox:initial:B:100', reason: 'broadcast_wait', durationMs: 50 });
    recordDedupeEvent({ key: 'inbox:initial:C:100', reason: 'persisted_cache', durationMs: 5 });
    recordDedupeEvent({ key: 'inbox:initial:D:100', reason: 'memory_cache' });
    recordDedupeEvent({ key: 'inbox:initial:E:100', reason: 'inflight_local' });

    const snap = getDedupeTelemetrySnapshot();
    expect(snap.leaderCount).toBe(2);
    expect(snap.followerCount).toBe(2);
    expect(snap.localCacheCount).toBe(2);
    // Hits = follower + localCache; misses = leader.
    expect(snap.hits).toBe(4);
    expect(snap.misses).toBe(2);
    expect(snap.callsSaved).toBe(4);
  });

  it('agrega latência por bucket com avg/p50/p95/max', () => {
    [100, 200, 300, 400, 500].forEach((ms) =>
      recordDedupeEvent({ key: `inbox:initial:X:${ms}`, reason: 'lock_acquired_lead', durationMs: ms }),
    );
    [10, 20, 30, 40, 50].forEach((ms) =>
      recordDedupeEvent({ key: `inbox:initial:Y:${ms}`, reason: 'broadcast_wait', durationMs: ms }),
    );

    const snap = getDedupeTelemetrySnapshot();
    expect(snap.leaderLatency.count).toBe(5);
    expect(snap.leaderLatency.avgMs).toBe(300); // (100+200+300+400+500)/5
    expect(snap.leaderLatency.maxMs).toBe(500);
    expect(snap.leaderLatency.p50Ms).toBeGreaterThanOrEqual(200);
    expect(snap.leaderLatency.p95Ms).toBeGreaterThanOrEqual(400);

    expect(snap.followerLatency.count).toBe(5);
    expect(snap.followerLatency.avgMs).toBe(30);
    // Follower deve ser bem mais rápido em média.
    expect(snap.followerLatency.avgMs).toBeLessThan(snap.leaderLatency.avgMs);
  });

  it('subscribeDedupeTelemetry dispara em cada evento e devolve snapshot atualizado', () => {
    const seen: number[] = [];
    const unsub = subscribeDedupeTelemetry((snap) => seen.push(snap.total));

    recordDedupeEvent({ key: 'inbox:initial:Z:100', reason: 'memory_cache' });
    recordDedupeEvent({ key: 'inbox:initial:Z:100', reason: 'lock_acquired_lead', durationMs: 5 });
    unsub();
    recordDedupeEvent({ key: 'inbox:initial:Z:100', reason: 'memory_cache' });

    // Recebeu 2 atualizações (uma por evento), parou após unsub.
    expect(seen).toEqual([1, 2]);
  });

  it('reset zera buckets e notifica subscribers', () => {
    recordDedupeEvent({ key: 'inbox:initial:R:100', reason: 'lock_acquired_lead', durationMs: 99 });
    expect(getDedupeTelemetrySnapshot().leaderLatency.count).toBe(1);
    let resets = 0;
    const unsub = subscribeDedupeTelemetry((s) => { if (s.total === 0) resets++; });
    resetDedupeTelemetry();
    unsub();
    expect(getDedupeTelemetrySnapshot().leaderLatency.count).toBe(0);
    expect(resets).toBe(1);
  });
});
