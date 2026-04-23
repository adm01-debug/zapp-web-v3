/**
 * Retry alerts — thresholds + evaluator + persistência (localStorage).
 * Pure utility (no React).
 */
import { safeGetJSON, safeSetJSON } from '@/lib/safeStorage';

export interface RetryThresholds {
  /** p95 de tentativas máximo tolerado antes de alertar. */
  p95Attempts: number;
  /** % de falha (failed + exhausted) máxima tolerada. */
  failureRatePct: number;
  /** Amostra mínima de runs para uma instância ser avaliada (anti-ruído). */
  minSampleSize: number;
}

export interface InstanceMetrics {
  instance: string;
  total: number;
  successAfterRetry: number;
  failed: number;
  exhausted: number;
  p95Attempts: number;
  failureRatePct: number;
}

export interface InstanceBreach {
  instance: string;
  reasons: string[];
  metrics: InstanceMetrics;
}

export const DEFAULT_THRESHOLDS: RetryThresholds = {
  p95Attempts: 3,
  failureRatePct: 20,
  minSampleSize: 5,
};

const STORAGE_KEY = 'zappweb:retry-alert-thresholds';

export function loadThresholds(): RetryThresholds {
  const raw = safeGetJSON<Partial<RetryThresholds> | null>(STORAGE_KEY, null);
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_THRESHOLDS };
  return {
    p95Attempts: numOr(raw.p95Attempts, DEFAULT_THRESHOLDS.p95Attempts),
    failureRatePct: numOr(raw.failureRatePct, DEFAULT_THRESHOLDS.failureRatePct),
    minSampleSize: numOr(raw.minSampleSize, DEFAULT_THRESHOLDS.minSampleSize),
  };
}

export function saveThresholds(t: RetryThresholds): boolean {
  return safeSetJSON(STORAGE_KEY, t);
}

function numOr(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback;
}

/** Avalia uma instância. Retorna lista de motivos de violação (vazia = ok). */
export function evaluateInstance(
  metrics: InstanceMetrics,
  thresholds: RetryThresholds,
): { breached: boolean; reasons: string[] } {
  if (metrics.total < thresholds.minSampleSize) {
    return { breached: false, reasons: [] };
  }
  const reasons: string[] = [];
  if (metrics.p95Attempts >= thresholds.p95Attempts) {
    reasons.push(`p95=${metrics.p95Attempts} ≥ ${thresholds.p95Attempts}`);
  }
  if (metrics.failureRatePct >= thresholds.failureRatePct) {
    reasons.push(`falha=${metrics.failureRatePct}% ≥ ${thresholds.failureRatePct}%`);
  }
  return { breached: reasons.length > 0, reasons };
}

/** Avalia todas as instâncias e devolve apenas as que violam. */
export function evaluateAllInstances(
  metrics: InstanceMetrics[],
  thresholds: RetryThresholds,
): InstanceBreach[] {
  const breaches: InstanceBreach[] = [];
  for (const m of metrics) {
    const { breached, reasons } = evaluateInstance(m, thresholds);
    if (breached) breaches.push({ instance: m.instance, reasons, metrics: m });
  }
  return breaches;
}
