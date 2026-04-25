/**
 * Testes de isolamento de breaches por instância.
 *
 * O painel `RetryMetricsPanel` consome `evaluateAllInstances` e itera os
 * breaches para emitir toasts. O invariante crítico é:
 *   "cada InstanceBreach carrega apenas detalhes da SUA instância" — sem
 *   vazar `details`, `reasons` ou `metrics` entre vizinhas, mesmo quando
 *   há overrides distintos, mesma `kind`, ou mesma magnitude observada.
 */
import { describe, it, expect } from 'vitest';
import {
  evaluateAllInstances,
  DEFAULT_THRESHOLDS,
  type InstanceMetrics,
  type PerInstanceThresholds,
  type RetryThresholds,
} from '../retryAlerts';

function metric(partial: Partial<InstanceMetrics> & { instance: string }): InstanceMetrics {
  return {
    instance: partial.instance,
    total: partial.total ?? 100,
    successAfterRetry: partial.successAfterRetry ?? 0,
    failed: partial.failed ?? 0,
    exhausted: partial.exhausted ?? 0,
    p95Attempts: partial.p95Attempts ?? 1,
    failureRatePct: partial.failureRatePct ?? 0,
  };
}

const baseThresholds: RetryThresholds = {
  p95Attempts: 3,
  failureRatePct: 20,
  minSampleSize: 5,
};

describe('evaluateAllInstances — isolamento por instância', () => {
  it('cada breach reporta apenas a sua própria instância no campo `instance`', () => {
    const breaches = evaluateAllInstances(
      [
        metric({ instance: 'wpp2', p95Attempts: 5, failureRatePct: 30 }),
        metric({ instance: 'wpp3', p95Attempts: 4, failureRatePct: 25 }),
        metric({ instance: 'wpp4', p95Attempts: 1, failureRatePct: 5 }), // OK
      ],
      baseThresholds,
    );

    expect(breaches).toHaveLength(2);
    const names = breaches.map((b) => b.instance).sort();
    expect(names).toEqual(['wpp2', 'wpp3']);
    // O `metrics` agregado de cada breach deve apontar para a instância correta.
    for (const b of breaches) {
      expect(b.metrics.instance).toBe(b.instance);
    }
  });

  it('details/reasons de uma instância não vazam para outra (referências distintas)', () => {
    const breaches = evaluateAllInstances(
      [
        metric({ instance: 'wpp2', p95Attempts: 5, failureRatePct: 10 }), // só p95
        metric({ instance: 'wpp3', p95Attempts: 1, failureRatePct: 50 }), // só failure_rate
      ],
      baseThresholds,
    );

    const byInst = Object.fromEntries(breaches.map((b) => [b.instance, b]));

    // wpp2 viola APENAS p95.
    expect(byInst.wpp2.details.map((d) => d.kind)).toEqual(['p95']);
    expect(byInst.wpp2.reasons.every((r) => r.startsWith('p95='))).toBe(true);

    // wpp3 viola APENAS failure_rate.
    expect(byInst.wpp3.details.map((d) => d.kind)).toEqual(['failure_rate']);
    expect(byInst.wpp3.reasons.every((r) => r.startsWith('falha='))).toBe(true);

    // Garante que os arrays não compartilham referência (mutar um nunca afeta o outro).
    expect(byInst.wpp2.details).not.toBe(byInst.wpp3.details);
    expect(byInst.wpp2.reasons).not.toBe(byInst.wpp3.reasons);
    byInst.wpp2.details.push({ kind: 'failure_rate', label: 'fake', observed: 99, threshold: 1 });
    expect(byInst.wpp3.details.map((d) => d.kind)).toEqual(['failure_rate']);
  });

  it('mesmo p95 numérico em duas instâncias gera details independentes mas equivalentes', () => {
    const breaches = evaluateAllInstances(
      [
        metric({ instance: 'wpp2', p95Attempts: 5 }),
        metric({ instance: 'wpp3', p95Attempts: 5 }),
      ],
      baseThresholds,
    );
    expect(breaches).toHaveLength(2);
    expect(breaches[0].details).not.toBe(breaches[1].details);
    expect(breaches[0].details[0].observed).toBe(5);
    expect(breaches[1].details[0].observed).toBe(5);
  });

  it('overrides por instância NÃO afetam a avaliação de outra instância', () => {
    // wpp2 tem threshold relaxado (p95Attempts=10) — não deve vazar para wpp3.
    const overrides: PerInstanceThresholds = {
      wpp2: { p95Attempts: 10 },
    };
    const breaches = evaluateAllInstances(
      [
        metric({ instance: 'wpp2', p95Attempts: 6 }), // 6 < 10 (override próprio) → OK
        metric({ instance: 'wpp3', p95Attempts: 6 }), // 6 ≥ 3 (global) → BREACH
      ],
      baseThresholds,
      overrides,
    );

    expect(breaches.map((b) => b.instance)).toEqual(['wpp3']);
    expect(breaches[0].hasOverride).toBe(false);
    expect(breaches[0].effectiveThresholds.p95Attempts).toBe(3);
  });

  it('hasOverride/effectiveThresholds refletem APENAS o override da própria instância', () => {
    const overrides: PerInstanceThresholds = {
      wpp2: { p95Attempts: 2, failureRatePct: 10 },
      wpp3: { failureRatePct: 50 },
    };
    const breaches = evaluateAllInstances(
      [
        metric({ instance: 'wpp2', p95Attempts: 3, failureRatePct: 15 }),
        metric({ instance: 'wpp3', p95Attempts: 1, failureRatePct: 60 }),
      ],
      baseThresholds,
      overrides,
    );
    const byInst = Object.fromEntries(breaches.map((b) => [b.instance, b]));

    expect(byInst.wpp2.hasOverride).toBe(true);
    expect(byInst.wpp2.effectiveThresholds.p95Attempts).toBe(2); // do override
    expect(byInst.wpp2.effectiveThresholds.failureRatePct).toBe(10);

    expect(byInst.wpp3.hasOverride).toBe(true);
    expect(byInst.wpp3.effectiveThresholds.p95Attempts).toBe(DEFAULT_THRESHOLDS.p95Attempts === 3 ? 3 : 3); // herda global
    expect(byInst.wpp3.effectiveThresholds.failureRatePct).toBe(50);
  });

  it('instância abaixo do minSampleSize não vira breach e não polui as outras', () => {
    const breaches = evaluateAllInstances(
      [
        metric({ instance: 'wpp2', total: 2, p95Attempts: 99, failureRatePct: 99 }), // amostra pequena
        metric({ instance: 'wpp3', total: 100, p95Attempts: 5, failureRatePct: 30 }),
      ],
      baseThresholds,
    );
    expect(breaches.map((b) => b.instance)).toEqual(['wpp3']);
    expect(breaches[0].metrics.total).toBe(100);
  });

  it('preserva a ordem das instâncias da entrada', () => {
    const inputOrder = ['wpp4', 'wpp2', 'wpp9', 'wpp1'];
    const breaches = evaluateAllInstances(
      inputOrder.map((inst) => metric({ instance: inst, p95Attempts: 5 })),
      baseThresholds,
    );
    expect(breaches.map((b) => b.instance)).toEqual(inputOrder);
  });

  it('lista vazia retorna lista vazia (sem efeitos colaterais)', () => {
    expect(evaluateAllInstances([], baseThresholds)).toEqual([]);
  });
});
