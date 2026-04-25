/**
 * Testes do fallback de thresholds quando não há override por instância,
 * incluindo overrides parciais (ex.: apenas `failureRatePct`).
 *
 * Cobertura:
 *   1. Sem overrides → globals aplicados (`hasOverride: false`).
 *   2. Override de outra instância não vaza para esta.
 *   3. Override vazio `{}` é tratado como ausência (fallback total).
 *   4. Override parcial só de `failureRatePct` mantém `p95Attempts` e
 *      `minSampleSize` herdados dos globals.
 *   5. Override parcial só de `p95Attempts`.
 *   6. Override parcial só de `minSampleSize` (afeta gating de avaliação).
 *   7. Override completo substitui todos os campos.
 *   8. Valores inválidos no override caem para o fallback global por campo.
 *   9. `evaluateAllInstances` reflete os thresholds efetivos por instância.
 */
import { describe, it, expect } from 'vitest';
import {
  resolveThresholds,
  evaluateAllInstances,
  evaluateInstance,
  DEFAULT_THRESHOLDS,
  type RetryThresholds,
  type PerInstanceThresholds,
  type InstanceMetrics,
} from '@/lib/retryAlerts';

const GLOBALS: RetryThresholds = {
  p95Attempts: 3,
  failureRatePct: 20,
  minSampleSize: 5,
};

const baseMetrics = (instance: string, over: Partial<InstanceMetrics> = {}): InstanceMetrics => ({
  instance,
  total: 100,
  successAfterRetry: 50,
  failed: 10,
  exhausted: 5,
  p95Attempts: 2,
  failureRatePct: 10,
  ...over,
});

describe('resolveThresholds — fallback sem override', () => {
  it('sem mapa de overrides para a instância → retorna globals exatos', () => {
    const overrides: PerInstanceThresholds = {};
    expect(resolveThresholds('wpp2', GLOBALS, overrides)).toEqual(GLOBALS);
  });

  it('override existe para outra instância → não vaza para esta', () => {
    const overrides: PerInstanceThresholds = {
      outra: { p95Attempts: 99, failureRatePct: 99, minSampleSize: 99 },
    };
    expect(resolveThresholds('wpp2', GLOBALS, overrides)).toEqual(GLOBALS);
  });

  it('override vazio {} → comporta-se como ausência (fallback total)', () => {
    const overrides: PerInstanceThresholds = { wpp2: {} };
    expect(resolveThresholds('wpp2', GLOBALS, overrides)).toEqual(GLOBALS);
  });

  it('usa DEFAULT_THRESHOLDS como base quando passado como globals', () => {
    expect(resolveThresholds('wpp2', DEFAULT_THRESHOLDS, {})).toEqual(DEFAULT_THRESHOLDS);
  });
});

describe('resolveThresholds — overrides parciais', () => {
  it('apenas failureRatePct sobrescrito; p95 e minSampleSize herdam globals', () => {
    const overrides: PerInstanceThresholds = { wpp2: { failureRatePct: 50 } };
    expect(resolveThresholds('wpp2', GLOBALS, overrides)).toEqual({
      p95Attempts: GLOBALS.p95Attempts,
      failureRatePct: 50,
      minSampleSize: GLOBALS.minSampleSize,
    });
  });

  it('apenas p95Attempts sobrescrito; demais herdam globals', () => {
    const overrides: PerInstanceThresholds = { wpp2: { p95Attempts: 7 } };
    expect(resolveThresholds('wpp2', GLOBALS, overrides)).toEqual({
      p95Attempts: 7,
      failureRatePct: GLOBALS.failureRatePct,
      minSampleSize: GLOBALS.minSampleSize,
    });
  });

  it('apenas minSampleSize sobrescrito; thresholds de violação herdam', () => {
    const overrides: PerInstanceThresholds = { wpp2: { minSampleSize: 25 } };
    expect(resolveThresholds('wpp2', GLOBALS, overrides)).toEqual({
      p95Attempts: GLOBALS.p95Attempts,
      failureRatePct: GLOBALS.failureRatePct,
      minSampleSize: 25,
    });
  });

  it('override completo substitui todos os campos', () => {
    const full: RetryThresholds = { p95Attempts: 10, failureRatePct: 80, minSampleSize: 1 };
    const overrides: PerInstanceThresholds = { wpp2: full };
    expect(resolveThresholds('wpp2', GLOBALS, overrides)).toEqual(full);
  });

  it('valores inválidos (NaN/negativo/string) no override caem por campo no global', () => {
    const overrides = {
      wpp2: {
        p95Attempts: Number.NaN as unknown as number,
        failureRatePct: -1,
        minSampleSize: 'x' as unknown as number,
      },
    } as PerInstanceThresholds;
    expect(resolveThresholds('wpp2', GLOBALS, overrides)).toEqual(GLOBALS);
  });

  it('override parcial com 0 (valor válido) é respeitado, não cai pro global', () => {
    // 0 é válido (>= 0 em numOr) — útil pra desligar gating de amostra mínima.
    const overrides: PerInstanceThresholds = { wpp2: { minSampleSize: 0 } };
    expect(resolveThresholds('wpp2', GLOBALS, overrides).minSampleSize).toBe(0);
  });
});

describe('evaluateAllInstances — thresholds efetivos por instância', () => {
  it('instância sem override usa globals; hasOverride=false', () => {
    const metrics = [baseMetrics('wpp2', { p95Attempts: 4, failureRatePct: 25 })];
    const breaches = evaluateAllInstances(metrics, GLOBALS, {});
    expect(breaches).toHaveLength(1);
    expect(breaches[0].hasOverride).toBe(false);
    expect(breaches[0].effectiveThresholds).toEqual(GLOBALS);
    // dois motivos: p95 e failure_rate
    expect(breaches[0].details.map((d) => d.kind).sort()).toEqual(['failure_rate', 'p95']);
  });

  it('override parcial só de failureRatePct relaxa apenas esse campo', () => {
    // failureRate=25 estouraria (global=20), mas override eleva pra 30 → não dispara.
    // p95=2 fica abaixo do global (3) → também não dispara. Sem violações.
    const overrides: PerInstanceThresholds = { wpp2: { failureRatePct: 30 } };
    const metrics = [baseMetrics('wpp2', { p95Attempts: 2, failureRatePct: 25 })];
    expect(evaluateAllInstances(metrics, GLOBALS, overrides)).toHaveLength(0);
  });

  it('override parcial só de failureRatePct (mais estrito) dispara só esse motivo', () => {
    // override baixa failureRatePct pra 5 → 10% estoura. p95 herdado (3), observado=2 → ok.
    const overrides: PerInstanceThresholds = { wpp2: { failureRatePct: 5 } };
    const metrics = [baseMetrics('wpp2', { p95Attempts: 2, failureRatePct: 10 })];
    const breaches = evaluateAllInstances(metrics, GLOBALS, overrides);
    expect(breaches).toHaveLength(1);
    expect(breaches[0].hasOverride).toBe(true);
    expect(breaches[0].effectiveThresholds).toEqual({
      p95Attempts: GLOBALS.p95Attempts,
      failureRatePct: 5,
      minSampleSize: GLOBALS.minSampleSize,
    });
    expect(breaches[0].details).toHaveLength(1);
    expect(breaches[0].details[0].kind).toBe('failure_rate');
    expect(breaches[0].details[0].threshold).toBe(5);
  });

  it('override parcial só de minSampleSize gateia avaliação (eleva amostra mínima)', () => {
    // metrics.total=10, mas override sobe minSampleSize pra 50 → instância nem é avaliada.
    const overrides: PerInstanceThresholds = { wpp2: { minSampleSize: 50 } };
    const metrics = [baseMetrics('wpp2', { total: 10, p95Attempts: 99, failureRatePct: 99 })];
    expect(evaluateAllInstances(metrics, GLOBALS, overrides)).toHaveLength(0);
  });

  it('override vazio {} → fallback total e hasOverride=false', () => {
    const overrides: PerInstanceThresholds = { wpp2: {} };
    const metrics = [baseMetrics('wpp2', { p95Attempts: 4 })];
    const breaches = evaluateAllInstances(metrics, GLOBALS, overrides);
    expect(breaches).toHaveLength(1);
    expect(breaches[0].hasOverride).toBe(false);
    expect(breaches[0].effectiveThresholds).toEqual(GLOBALS);
  });

  it('múltiplas instâncias: cada uma resolve seu próprio fallback/override', () => {
    const overrides: PerInstanceThresholds = {
      wpp2: { failureRatePct: 50 }, // parcial
      wpp3: { p95Attempts: 10, failureRatePct: 90, minSampleSize: 1 }, // completo
      // wpp4 sem override → globals
    };
    const metrics = [
      baseMetrics('wpp2', { p95Attempts: 4, failureRatePct: 60 }), // estoura p95 + failure
      baseMetrics('wpp3', { p95Attempts: 5, failureRatePct: 80 }), // ok no override permissivo
      baseMetrics('wpp4', { p95Attempts: 4, failureRatePct: 25 }), // estoura globals
    ];
    const breaches = evaluateAllInstances(metrics, GLOBALS, overrides);
    const byInstance = Object.fromEntries(breaches.map((b) => [b.instance, b]));

    expect(byInstance.wpp2?.hasOverride).toBe(true);
    expect(byInstance.wpp2?.effectiveThresholds.failureRatePct).toBe(50);
    expect(byInstance.wpp2?.effectiveThresholds.p95Attempts).toBe(GLOBALS.p95Attempts);

    expect(byInstance.wpp3).toBeUndefined(); // override permissivo absorveu

    expect(byInstance.wpp4?.hasOverride).toBe(false);
    expect(byInstance.wpp4?.effectiveThresholds).toEqual(GLOBALS);
  });

  it('sem terceiro argumento (overrides=undefined) → todas usam globals', () => {
    const metrics = [
      baseMetrics('wpp2', { p95Attempts: 4 }),
      baseMetrics('wpp3', { failureRatePct: 25 }),
    ];
    const breaches = evaluateAllInstances(metrics, GLOBALS);
    expect(breaches).toHaveLength(2);
    for (const b of breaches) {
      expect(b.hasOverride).toBe(false);
      expect(b.effectiveThresholds).toEqual(GLOBALS);
    }
  });
});

describe('evaluateInstance — sanity check com thresholds resolvidos', () => {
  it('resolveThresholds + evaluateInstance produz mesmo resultado de evaluateAllInstances', () => {
    const overrides: PerInstanceThresholds = { wpp2: { failureRatePct: 5 } };
    const m = baseMetrics('wpp2', { p95Attempts: 2, failureRatePct: 10 });
    const effective = resolveThresholds('wpp2', GLOBALS, overrides);
    const direct = evaluateInstance(m, effective);
    const all = evaluateAllInstances([m], GLOBALS, overrides);
    expect(direct.breached).toBe(true);
    expect(all[0].details).toEqual(direct.details);
    expect(all[0].effectiveThresholds).toEqual(effective);
  });
});
