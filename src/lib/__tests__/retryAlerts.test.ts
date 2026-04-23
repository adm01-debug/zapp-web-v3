import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_THRESHOLDS,
  evaluateInstance,
  evaluateAllInstances,
  loadThresholds,
  saveThresholds,
  loadPerInstanceThresholds,
  savePerInstanceThresholds,
  resolveThresholds,
  type InstanceMetrics,
  type PerInstanceThresholds,
} from '../retryAlerts';

const makeMetrics = (overrides: Partial<InstanceMetrics> = {}): InstanceMetrics => ({
  instance: 'wpp2',
  total: 10,
  successAfterRetry: 8,
  failed: 1,
  exhausted: 1,
  p95Attempts: 2,
  failureRatePct: 20,
  ...overrides,
});

describe('retryAlerts', () => {
  beforeEach(() => {
    try { localStorage.clear(); } catch { /* ignore */ }
  });

  describe('evaluateInstance', () => {
    it('does not breach when sample is below minSampleSize', () => {
      const m = makeMetrics({ total: 3, p95Attempts: 99, failureRatePct: 99 });
      expect(evaluateInstance(m, DEFAULT_THRESHOLDS).breached).toBe(false);
    });

    it('breaches on high p95 only', () => {
      const m = makeMetrics({ p95Attempts: 4, failureRatePct: 5 });
      const r = evaluateInstance(m, DEFAULT_THRESHOLDS);
      expect(r.breached).toBe(true);
      expect(r.reasons).toHaveLength(1);
      expect(r.reasons[0]).toContain('p95=4');
    });

    it('breaches on high failure only', () => {
      const m = makeMetrics({ p95Attempts: 1, failureRatePct: 50 });
      const r = evaluateInstance(m, DEFAULT_THRESHOLDS);
      expect(r.breached).toBe(true);
      expect(r.reasons[0]).toContain('falha=50%');
    });

    it('breaches on both', () => {
      const m = makeMetrics({ p95Attempts: 5, failureRatePct: 40 });
      const r = evaluateInstance(m, DEFAULT_THRESHOLDS);
      expect(r.reasons).toHaveLength(2);
    });

    it('does not breach when both under threshold', () => {
      const m = makeMetrics({ p95Attempts: 1, failureRatePct: 5 });
      expect(evaluateInstance(m, DEFAULT_THRESHOLDS).breached).toBe(false);
    });

    it('respects custom thresholds', () => {
      const m = makeMetrics({ p95Attempts: 4, failureRatePct: 25 });
      const r = evaluateInstance(m, { p95Attempts: 5, failureRatePct: 50, minSampleSize: 5 });
      expect(r.breached).toBe(false);
    });
  });

  describe('evaluateAllInstances', () => {
    it('returns only breaching instances', () => {
      const list = [
        makeMetrics({ instance: 'wpp2', p95Attempts: 5 }),
        makeMetrics({ instance: 'wpp3', p95Attempts: 1, failureRatePct: 5 }),
        makeMetrics({ instance: 'wpp4', total: 2, p95Attempts: 99 }),
      ];
      const r = evaluateAllInstances(list, DEFAULT_THRESHOLDS);
      expect(r).toHaveLength(1);
      expect(r[0].instance).toBe('wpp2');
    });
  });

  describe('persistence', () => {
    it('returns defaults when nothing stored', () => {
      expect(loadThresholds()).toEqual(DEFAULT_THRESHOLDS);
    });

    it('roundtrips saved thresholds', () => {
      const custom = { p95Attempts: 7, failureRatePct: 33, minSampleSize: 10 };
      expect(saveThresholds(custom)).toBe(true);
      expect(loadThresholds()).toEqual(custom);
    });

    it('falls back to defaults on partial/invalid stored data', () => {
      try {
        localStorage.setItem('zappweb:retry-alert-thresholds', JSON.stringify({ p95Attempts: 'abc', failureRatePct: -1 }));
      } catch { /* ignore */ }
      const t = loadThresholds();
      expect(t.p95Attempts).toBe(DEFAULT_THRESHOLDS.p95Attempts);
      expect(t.failureRatePct).toBe(DEFAULT_THRESHOLDS.failureRatePct);
      expect(t.minSampleSize).toBe(DEFAULT_THRESHOLDS.minSampleSize);
    });
  });
});
