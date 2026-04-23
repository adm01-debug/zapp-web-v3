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
const PER_INSTANCE_STORAGE_KEY = 'zappweb:retry-alert-thresholds:per-instance';

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

/** Map of instance name → custom thresholds (partial override of globals). */
export type PerInstanceThresholds = Record<string, Partial<RetryThresholds>>;

export function loadPerInstanceThresholds(): PerInstanceThresholds {
  const raw = safeGetJSON<unknown>(PER_INSTANCE_STORAGE_KEY, null);
  if (!raw || typeof raw !== 'object') return {};
  const out: PerInstanceThresholds = {};
  for (const [name, partial] of Object.entries(raw as Record<string, unknown>)) {
    if (!partial || typeof partial !== 'object') continue;
    const p = partial as Partial<RetryThresholds>;
    const cleaned: Partial<RetryThresholds> = {};
    if (typeof p.p95Attempts === 'number' && Number.isFinite(p.p95Attempts) && p.p95Attempts >= 0) {
      cleaned.p95Attempts = p.p95Attempts;
    }
    if (typeof p.failureRatePct === 'number' && Number.isFinite(p.failureRatePct) && p.failureRatePct >= 0) {
      cleaned.failureRatePct = p.failureRatePct;
    }
    if (typeof p.minSampleSize === 'number' && Number.isFinite(p.minSampleSize) && p.minSampleSize >= 0) {
      cleaned.minSampleSize = p.minSampleSize;
    }
    if (Object.keys(cleaned).length > 0) out[name] = cleaned;
  }
  return out;
}

export function savePerInstanceThresholds(map: PerInstanceThresholds): boolean {
  return safeSetJSON(PER_INSTANCE_STORAGE_KEY, map);
}

/** Resolve thresholds for a given instance: per-instance override merged on top of globals. */
export function resolveThresholds(
  instance: string,
  globals: RetryThresholds,
  overrides: PerInstanceThresholds,
): RetryThresholds {
  const o = overrides[instance];
  if (!o) return globals;
  return {
    p95Attempts: numOr(o.p95Attempts, globals.p95Attempts),
    failureRatePct: numOr(o.failureRatePct, globals.failureRatePct),
    minSampleSize: numOr(o.minSampleSize, globals.minSampleSize),
  };
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

/**
 * Avalia todas as instâncias e devolve apenas as que violam.
 * Aceita um terceiro argumento opcional com overrides por instância.
 */
export function evaluateAllInstances(
  metrics: InstanceMetrics[],
  thresholds: RetryThresholds,
  overrides?: PerInstanceThresholds,
): InstanceBreach[] {
  const breaches: InstanceBreach[] = [];
  for (const m of metrics) {
    const effective = overrides ? resolveThresholds(m.instance, thresholds, overrides) : thresholds;
    const { breached, reasons } = evaluateInstance(m, effective);
    if (breached) breaches.push({ instance: m.instance, reasons, metrics: m });
  }
  return breaches;
}
