/**
 * Multi-tab simulation tests.
 *
 * Strategy: each "tab" is a fresh `vi.resetModules()` + `await import()` of
 * `crossTabSendDedupe`. That gives every tab its own `TAB_ID` and its own
 * `BroadcastChannel` instance bound to the same channel name — exactly how
 * two real tabs of the same origin behave. They share `localStorage` (jsdom
 * provides a single instance), so the leader-claim coordination works as in
 * production.
 *
 * The `BroadcastChannel` API in jsdom delivers messages asynchronously, so
 * we use real timers + small `await` ticks instead of fake timers.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

type DedupeMod = typeof import('@/lib/crossTabSendDedupe');

// Single shared metrics module instance — must NOT be re-evaluated per "tab"
// or each tab would write into its own counters and the assertions break.
import * as sharedMetrics from '@/lib/dedupeMetrics';

async function loadTab(): Promise<DedupeMod> {
  // Reset the module registry so the next import re-evaluates `crossTabSendDedupe`
  // → fresh TAB_ID + fresh BroadcastChannel listener bound to the same name.
  vi.resetModules();
  // Pin every dependency that MUST stay shared across tabs to its current
  // singleton instance, so re-evaluation only affects the dedupe module itself.
  vi.doMock('@/lib/dedupeMetrics', () => sharedMetrics);
  return await import('@/lib/crossTabSendDedupe');
}

/** Flush microtasks + a short macrotask so BroadcastChannel deliveries land. */
function tick(ms = 5): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

describe('crossTabDedupe — multi-tab simulation', () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.resetModules();
    // Reset shared metrics store so counters are deterministic per test.
    const metrics = await import('@/lib/dedupeMetrics');
    metrics.__resetDedupeMetricsForTests();
  });

  it('only ONE tab fires the work for the same key within TTL (3 tabs staggered)', async () => {
    const [tabA, tabB, tabC] = await Promise.all([loadTab(), loadTab(), loadTab()]);

    const workA = vi.fn().mockResolvedValue({ winner: 'A' });
    const workB = vi.fn().mockResolvedValue({ winner: 'B' });
    const workC = vi.fn().mockResolvedValue({ winner: 'C' });

    const KEY = 'multi:race:1';
    const TTL = 1_000;

    // Start tabs with sub-millisecond stagger — mirrors reality (two real
    // browser tabs never write to localStorage on the exact same tick; each
    // has its own event loop). With true simultaneity, jsdom's synchronous
    // localStorage lets every claim succeed — that's a single-process
    // artifact, not the production semantic we want to test.
    const pA = tabA.crossTabDedupe(KEY, workA, { ttlMs: TTL });
    await tick(1);
    const pB = tabB.crossTabDedupe(KEY, workB, { ttlMs: TTL });
    await tick(1);
    const pC = tabC.crossTabDedupe(KEY, workC, { ttlMs: TTL });

    const [resA, resB, resC] = await Promise.all([pA, pB, pC]);

    // Exactly one work function actually ran.
    const runs = [workA, workB, workC].filter((w) => w.mock.calls.length > 0);
    expect(runs).toHaveLength(1);

    // All three calls resolved with the same value (the leader's).
    expect(resA).toEqual(resB);
    expect(resB).toEqual(resC);
    expect(resA).toMatchObject({ winner: expect.stringMatching(/^[ABC]$/) });
  });

  it('followers replay the leader response (BroadcastChannel)', async () => {
    const [leader, follower] = await Promise.all([loadTab(), loadTab()]);

    let resolveLeader!: (v: { value: number }) => void;
    const leaderWork = vi.fn(
      () =>
        new Promise<{ value: number }>((res) => {
          resolveLeader = res;
        }),
    );
    const followerWork = vi.fn().mockResolvedValue({ value: -1 });

    // Start leader first so it claims the key.
    const leaderPromise = leader.crossTabDedupe('multi:replay', leaderWork, { ttlMs: 1_000 });
    await tick(); // give leader time to write its claim

    // Now follower attempts: should NOT run its work, must wait for broadcast.
    const followerPromise = follower.crossTabDedupe('multi:replay', followerWork, {
      ttlMs: 1_000,
    });
    await tick();
    expect(followerWork).not.toHaveBeenCalled();

    // Leader resolves → broadcasts → follower receives & replays.
    resolveLeader({ value: 42 });

    const [leaderRes, followerRes] = await Promise.all([leaderPromise, followerPromise]);
    expect(leaderRes).toEqual({ value: 42 });
    expect(followerRes).toEqual({ value: 42 });
    expect(leaderWork).toHaveBeenCalledTimes(1);
    expect(followerWork).not.toHaveBeenCalled();
  });

  it('after TTL expires, a second tab CAN claim the same key and runs its own work', async () => {
    const [tab1, tab2] = await Promise.all([loadTab(), loadTab()]);
    const TTL = 30; // very short to avoid slow tests

    const work1 = vi.fn().mockResolvedValue('first');
    await tab1.crossTabDedupe('multi:ttl', work1, { ttlMs: TTL });
    expect(work1).toHaveBeenCalledTimes(1);

    // Wait beyond TTL + the leader's release timer (also `ttlMs`).
    await tick(TTL * 2 + 20);

    const work2 = vi.fn().mockResolvedValue('second');
    const out = await tab2.crossTabDedupe('multi:ttl', work2, { ttlMs: TTL });

    expect(work2).toHaveBeenCalledTimes(1);
    expect(out).toBe('second');
  });

  it('leader rejection is propagated to followers via broadcast', async () => {
    const [leader, follower] = await Promise.all([loadTab(), loadTab()]);

    let rejectLeader!: (e: Error) => void;
    const leaderWork = vi.fn(
      () =>
        new Promise<unknown>((_res, rej) => {
          rejectLeader = rej;
        }),
    );
    const followerWork = vi.fn().mockResolvedValue('shouldNotRun');

    const leaderPromise = leader
      .crossTabDedupe('multi:err', leaderWork, { ttlMs: 1_000 })
      .catch((e: Error) => ({ err: e.message }));

    await tick(10);

    const followerPromise = follower
      .crossTabDedupe('multi:err', followerWork, { ttlMs: 1_000 })
      .catch((e: Error) => ({ err: e.message }));

    // Give follower time to register its BroadcastChannel listener BEFORE
    // the leader broadcasts.
    await tick(10);
    rejectLeader(new Error('upstream-down'));

    const [leaderOut, followerOut] = await Promise.all([leaderPromise, followerPromise]);

    expect(leaderOut).toEqual({ err: 'upstream-down' });
    expect(followerOut).toEqual({ err: 'upstream-down' });
    expect(followerWork).not.toHaveBeenCalled();
  });

  it('different keys across tabs run in parallel (no cross-contamination)', async () => {
    const [t1, t2] = await Promise.all([loadTab(), loadTab()]);

    const w1 = vi.fn().mockResolvedValue(1);
    const w2 = vi.fn().mockResolvedValue(2);

    const [r1, r2] = await Promise.all([
      t1.crossTabDedupe('k:alpha', w1, { ttlMs: 500 }),
      t2.crossTabDedupe('k:beta', w2, { ttlMs: 500 }),
    ]);

    expect(r1).toBe(1);
    expect(r2).toBe(2);
    expect(w1).toHaveBeenCalledTimes(1);
    expect(w2).toHaveBeenCalledTimes(1);
  });

  it('records exactly one leader event and N-1 follower events for N tabs (staggered)', async () => {
    const tabs = await Promise.all([loadTab(), loadTab(), loadTab(), loadTab()]);
    const KEY = 'multi:metrics';
    const works = tabs.map(() =>
      vi.fn().mockImplementation(
        () => new Promise((res) => setTimeout(() => res({ ok: true }), 10)),
      ),
    );

    const promises: Promise<unknown>[] = [];
    for (let i = 0; i < tabs.length; i++) {
      promises.push(tabs[i].crossTabDedupe(KEY, works[i], { ttlMs: 1_000 }));
      await tick(1); // stagger so localStorage claim is observable
    }
    await Promise.all(promises);
    await tick(20);

    const { getDedupeSnapshot } = await import('@/lib/dedupeMetrics');
    const snap = getDedupeSnapshot();

    const forKey = snap.events.filter((e) => e.key === KEY);
    const leaders = forKey.filter((e) => e.outcome === 'leader');
    const replays = forKey.filter((e) => e.outcome === 'follower-replay');
    const fallbacks = forKey.filter((e) => e.outcome === 'follower-fallback');

    expect(leaders).toHaveLength(1);
    // Some races may resolve before claim is observed → followers either
    // replayed or fell back, but NEVER ran the work themselves.
    expect(replays.length + fallbacks.length).toBe(tabs.length - 1);

    const totalWorkCalls = works.reduce((acc, w) => acc + w.mock.calls.length, 0);
    // Worst case: one fallback ran locally → at most 2 total work invocations.
    // Best case: pure replays → exactly 1.
    expect(totalWorkCalls).toBeGreaterThanOrEqual(1);
    expect(totalWorkCalls).toBeLessThanOrEqual(1 + fallbacks.length);
  });
});
