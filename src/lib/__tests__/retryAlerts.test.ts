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

  describe('per-instance overrides', () => {
    it('returns empty object when nothing stored', () => {
      expect(loadPerInstanceThresholds()).toEqual({});
    });

    it('roundtrips per-instance overrides', () => {
      const map: PerInstanceThresholds = {
        wpp2: { p95Attempts: 5 },
        wpp3: { failureRatePct: 50, minSampleSize: 20 },
      };
      expect(savePerInstanceThresholds(map)).toBe(true);
      expect(loadPerInstanceThresholds()).toEqual(map);
    });

    it('drops invalid fields when loading', () => {
      try {
        localStorage.setItem(
          'zappweb:retry-alert-thresholds:per-instance',
          JSON.stringify({
            wpp2: { p95Attempts: 'foo', failureRatePct: -5, minSampleSize: 10 },
            wpp3: 'not-an-object',
            wpp4: {},
          }),
        );
      } catch { /* ignore */ }
      const out = loadPerInstanceThresholds();
      expect(out.wpp2).toEqual({ minSampleSize: 10 });
      expect(out.wpp3).toBeUndefined();
      expect(out.wpp4).toBeUndefined();
    });

    it('resolveThresholds merges override on top of globals', () => {
      const overrides: PerInstanceThresholds = { wpp2: { p95Attempts: 10 } };
      const out = resolveThresholds('wpp2', DEFAULT_THRESHOLDS, overrides);
      expect(out.p95Attempts).toBe(10);
      expect(out.failureRatePct).toBe(DEFAULT_THRESHOLDS.failureRatePct);
      expect(out.minSampleSize).toBe(DEFAULT_THRESHOLDS.minSampleSize);
    });

    it('resolveThresholds returns globals when no override exists', () => {
      const out = resolveThresholds('unknown', DEFAULT_THRESHOLDS, {});
      expect(out).toBe(DEFAULT_THRESHOLDS);
    });

    it('evaluateAllInstances applies per-instance overrides', () => {
      const list: InstanceMetrics[] = [
        makeMetrics({ instance: 'wpp2', p95Attempts: 4, failureRatePct: 5 }),
        makeMetrics({ instance: 'wpp3', p95Attempts: 4, failureRatePct: 5 }),
      ];
      const overrides: PerInstanceThresholds = { wpp2: { p95Attempts: 10 } };
      const r = evaluateAllInstances(list, DEFAULT_THRESHOLDS, overrides);
      expect(r).toHaveLength(1);
      expect(r[0].instance).toBe('wpp3');
    });
  });

  // -----------------------------------------------------------------
  // Cobertura adicional do avaliador (amostra insuficiente, boundaries
  // de p95 / failureRate e cálculo correto da % de falha).
  // -----------------------------------------------------------------
  describe('evaluator — sample size guards', () => {
    it('does not breach when total === 0', () => {
      const m = makeMetrics({ total: 0, failed: 0, exhausted: 0, p95Attempts: 99, failureRatePct: 99 });
      const r = evaluateInstance(m, DEFAULT_THRESHOLDS);
      expect(r.breached).toBe(false);
      expect(r.details).toEqual([]);
    });

    it('does not breach when total === minSampleSize - 1', () => {
      const t = { ...DEFAULT_THRESHOLDS, minSampleSize: 5 };
      const m = makeMetrics({ total: 4, p95Attempts: 99, failureRatePct: 99 });
      expect(evaluateInstance(m, t).breached).toBe(false);
    });

    it('evaluates normally when total === minSampleSize', () => {
      const t = { p95Attempts: 3, failureRatePct: 20, minSampleSize: 5 };
      const m = makeMetrics({ total: 5, p95Attempts: 4, failureRatePct: 50 });
      const r = evaluateInstance(m, t);
      expect(r.breached).toBe(true);
      expect(r.details).toHaveLength(2);
    });

    it('respects custom minSampleSize=1 (no anti-noise)', () => {
      const t = { p95Attempts: 3, failureRatePct: 20, minSampleSize: 1 };
      const m = makeMetrics({ total: 1, p95Attempts: 5, failureRatePct: 100 });
      expect(evaluateInstance(m, t).breached).toBe(true);
    });
  });

  describe('evaluator — boundary semantics (>= triggers)', () => {
    it('p95 exactly at threshold → breaches', () => {
      const t = { p95Attempts: 3, failureRatePct: 100, minSampleSize: 5 };
      const r = evaluateInstance(makeMetrics({ p95Attempts: 3, failureRatePct: 0 }), t);
      expect(r.breached).toBe(true);
      expect(r.details[0]).toMatchObject({ kind: 'p95', observed: 3, threshold: 3 });
    });

    it('p95 just below threshold → does not breach', () => {
      const t = { p95Attempts: 3, failureRatePct: 100, minSampleSize: 5 };
      const r = evaluateInstance(makeMetrics({ p95Attempts: 2, failureRatePct: 0 }), t);
      expect(r.breached).toBe(false);
    });

    it('failureRate exactly at threshold → breaches with correct payload', () => {
      const t = { p95Attempts: 99, failureRatePct: 25, minSampleSize: 5 };
      const r = evaluateInstance(makeMetrics({ p95Attempts: 1, failureRatePct: 25 }), t);
      expect(r.breached).toBe(true);
      expect(r.details).toHaveLength(1);
      expect(r.details[0]).toMatchObject({ kind: 'failure_rate', observed: 25, threshold: 25 });
      expect(r.details[0].label).toContain('25%');
    });

    it('failureRate just below threshold → does not breach', () => {
      const t = { p95Attempts: 99, failureRatePct: 25, minSampleSize: 5 };
      const r = evaluateInstance(makeMetrics({ p95Attempts: 1, failureRatePct: 24 }), t);
      expect(r.breached).toBe(false);
    });
  });

  describe('evaluator — failureRate calculation correctness', () => {
    // O failureRatePct é fornecido pelo agregador; o avaliador apenas compara.
    // Estes cenários documentam a relação esperada (failed+exhausted)/total*100
    // que o produtor (useRetryMetrics) deve enviar.
    const cases: Array<{ total: number; failed: number; exhausted: number; expectedPct: number }> = [
      { total: 10, failed: 1, exhausted: 1, expectedPct: 20 }, // 2/10
      { total: 4, failed: 1, exhausted: 0, expectedPct: 25 }, // 1/4
      { total: 100, failed: 33, exhausted: 0, expectedPct: 33 }, // 33/100
      { total: 7, failed: 0, exhausted: 0, expectedPct: 0 }, // sem falhas
      { total: 3, failed: 1, exhausted: 2, expectedPct: 100 }, // tudo falha
    ];

    for (const c of cases) {
      it(`computes ${c.failed + c.exhausted}/${c.total} = ${c.expectedPct}% then evaluates against threshold`, () => {
        const computed = Math.round(((c.failed + c.exhausted) / c.total) * 100);
        expect(computed).toBe(c.expectedPct);

        // Garante que o avaliador respeita esse valor já calculado.
        const t = { p95Attempts: 99, failureRatePct: c.expectedPct, minSampleSize: 1 };
        const m = makeMetrics({
          total: c.total,
          failed: c.failed,
          exhausted: c.exhausted,
          p95Attempts: 1,
          failureRatePct: c.expectedPct,
        });
        // failureRatePct === threshold dispara (>=).
        const r = evaluateInstance(m, t);
        if (c.expectedPct === 0) {
          // 0% nunca dispara (threshold >= 1 sempre).
          const tStrict = { ...t, failureRatePct: 1 };
          expect(evaluateInstance(m, tStrict).breached).toBe(false);
        } else {
          expect(r.breached).toBe(true);
          expect(r.details.find(d => d.kind === 'failure_rate')?.observed).toBe(c.expectedPct);
        }
      });
    }

    it('details carry both observed and threshold for downstream UI', () => {
      const t = { p95Attempts: 3, failureRatePct: 20, minSampleSize: 5 };
      const r = evaluateInstance(makeMetrics({ p95Attempts: 6, failureRatePct: 75 }), t);
      const p95 = r.details.find(d => d.kind === 'p95');
      const fr = r.details.find(d => d.kind === 'failure_rate');
      expect(p95).toMatchObject({ observed: 6, threshold: 3 });
      expect(fr).toMatchObject({ observed: 75, threshold: 20 });
    });
  });

  describe('evaluateAllInstances — enriched breach payload', () => {
    it('flags hasOverride=false and reuses globals when no per-instance override exists', () => {
      const list = [makeMetrics({ instance: 'wpp2', p95Attempts: 5 })];
      const r = evaluateAllInstances(list, DEFAULT_THRESHOLDS, {});
      expect(r).toHaveLength(1);
      expect(r[0].hasOverride).toBe(false);
      expect(r[0].effectiveThresholds).toEqual(DEFAULT_THRESHOLDS);
    });

    it('flags hasOverride=true when an explicit override is configured', () => {
      const list = [makeMetrics({ instance: 'wpp2', p95Attempts: 5, failureRatePct: 60 })];
      const overrides: PerInstanceThresholds = { wpp2: { failureRatePct: 50 } };
      const r = evaluateAllInstances(list, DEFAULT_THRESHOLDS, overrides);
      expect(r[0].hasOverride).toBe(true);
      expect(r[0].effectiveThresholds.failureRatePct).toBe(50);
      expect(r[0].effectiveThresholds.p95Attempts).toBe(DEFAULT_THRESHOLDS.p95Attempts);
    });

    it('hasOverride=false when override entry exists but is empty', () => {
      const list = [makeMetrics({ instance: 'wpp2', p95Attempts: 5 })];
      const overrides: PerInstanceThresholds = { wpp2: {} };
      const r = evaluateAllInstances(list, DEFAULT_THRESHOLDS, overrides);
      expect(r[0].hasOverride).toBe(false);
    });
  });
});
