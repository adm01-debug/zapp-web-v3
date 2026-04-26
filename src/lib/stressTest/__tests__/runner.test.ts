import { describe, it, expect, vi } from 'vitest';
import { runStressTest } from '../runner';
import { buildBalancedPlan } from '../mediaSamplers';
import type { StressTaskType } from '../types';

const TYPES: StressTaskType[] = ['text', 'image', 'sticker', 'audio_meme'];

function okDispatch(idx: number) {
  return Promise.resolve({ messageId: `m-${idx}`, detail: `d-${idx}` });
}

describe('runStressTest', () => {
  it('completa quando tudo dá certo', async () => {
    const plan = buildBalancedPlan(8, TYPES);
    const results: number[] = [];
    const ctrl = new AbortController();
    const summary = await runStressTest({
      plan, phone: '64984450900', instance: 'wpp2',
      intervalMs: 0, failurePolicy: 'stop_first', signal: ctrl.signal,
      dispatch: ({ idx }) => okDispatch(idx),
      onResult: (r) => results.push(r.idx),
      onProgress: () => undefined,
    });
    expect(summary.status).toBe('completed');
    expect(summary.totalSent).toBe(8);
    expect(summary.totalFailed).toBe(0);
    expect(results.length).toBe(8);
  });

  it('para na 1ª falha quando policy = stop_first', async () => {
    const plan = buildBalancedPlan(8, TYPES);
    const ctrl = new AbortController();
    const dispatch = vi.fn(({ idx }) => {
      if (idx === 2) return Promise.reject(new Error('boom'));
      return okDispatch(idx);
    });
    const summary = await runStressTest({
      plan, phone: '64984450900', instance: 'wpp2',
      intervalMs: 0, failurePolicy: 'stop_first', signal: ctrl.signal,
      dispatch,
      onResult: () => undefined,
      onProgress: () => undefined,
    });
    expect(summary.status).toBe('failed');
    expect(summary.totalSent).toBe(2);
    expect(summary.totalFailed).toBe(1);
    expect(dispatch).toHaveBeenCalledTimes(3);
    expect(summary.abortReason).toContain('boom');
  });

  it('continua quando policy = continue', async () => {
    const plan = buildBalancedPlan(4, TYPES);
    const ctrl = new AbortController();
    const dispatch = vi.fn(({ idx }) => {
      if (idx === 1) return Promise.reject(new Error('x'));
      return okDispatch(idx);
    });
    const summary = await runStressTest({
      plan, phone: 'p', instance: 'i',
      intervalMs: 0, failurePolicy: 'continue', signal: ctrl.signal,
      dispatch,
      onResult: () => undefined,
      onProgress: () => undefined,
    });
    expect(summary.status).toBe('completed');
    expect(summary.totalSent).toBe(3);
    expect(summary.totalFailed).toBe(1);
  });

  it('aborta quando AbortSignal dispara entre envios', async () => {
    const plan = buildBalancedPlan(10, TYPES);
    const ctrl = new AbortController();
    let count = 0;
    const summary = await runStressTest({
      plan, phone: 'p', instance: 'i',
      intervalMs: 50, failurePolicy: 'continue', signal: ctrl.signal,
      dispatch: ({ idx }) => {
        count++;
        if (count === 2) setTimeout(() => ctrl.abort(), 0);
        return okDispatch(idx);
      },
      onResult: () => undefined,
      onProgress: () => undefined,
    });
    expect(summary.status).toBe('aborted');
    expect(summary.totalSent).toBeLessThan(10);
  });

  it('para após N falhas seguidas com stop_after_n', async () => {
    const plan = buildBalancedPlan(10, TYPES);
    const ctrl = new AbortController();
    const dispatch = vi.fn(() => Promise.reject(new Error('always')));
    const summary = await runStressTest({
      plan, phone: 'p', instance: 'i',
      intervalMs: 0, failurePolicy: 'stop_after_n', failureThreshold: 3,
      signal: ctrl.signal,
      dispatch,
      onResult: () => undefined,
      onProgress: () => undefined,
    });
    expect(summary.status).toBe('failed');
    expect(summary.totalFailed).toBe(3);
    expect(summary.abortReason).toContain('3 falhas seguidas');
  });
});

describe('buildBalancedPlan', () => {
  it('distribui igualmente quando total é múltiplo', () => {
    const plan = buildBalancedPlan(8, ['text', 'image', 'sticker', 'audio_meme']);
    expect(plan.length).toBe(8);
    const counts = plan.reduce((m, t) => ({ ...m, [t]: (m[t] ?? 0) + 1 }), {} as Record<string, number>);
    expect(counts.text).toBe(2);
    expect(counts.image).toBe(2);
    expect(counts.sticker).toBe(2);
    expect(counts.audio_meme).toBe(2);
  });

  it('distribui resto entre os primeiros tipos', () => {
    const plan = buildBalancedPlan(10, ['text', 'image', 'sticker']);
    expect(plan.length).toBe(10);
    const counts = plan.reduce((m, t) => ({ ...m, [t]: (m[t] ?? 0) + 1 }), {} as Record<string, number>);
    // 10/3 = 3 base + remainder 1 → primeiro tipo recebe 4
    expect(counts.text).toBe(4);
    expect(counts.image).toBe(3);
    expect(counts.sticker).toBe(3);
  });
});
