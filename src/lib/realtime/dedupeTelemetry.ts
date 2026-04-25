/**
 * dedupeTelemetry — Contadores de acertos e misses do crossTabDedupe.
 *
 * Para cada chamada ao `dedupedFetch`, o módulo `crossTabDedupe` emite um
 * evento descrevendo se a requisição foi servida do cache (HIT) ou
 * efetivamente executou o fetcher (MISS), classificado pelo motivo:
 *
 *   HIT:
 *     - memory_cache       — resultado em memória ainda dentro do TTL
 *     - persisted_cache    — resultado em localStorage (outra aba já fez)
 *     - inflight_local     — Promise em andamento na mesma aba
 *     - broadcast_wait     — recebeu via BroadcastChannel enquanto esperava
 *     - late_cache         — cache persistido apareceu após waitTimeout
 *
 *   MISS:
 *     - lock_acquired_lead — esta aba pegou o lock e rodou o fetcher
 *     - fallback_after_wait — líder falhou/expirou; rodou o fetcher local
 *
 * `keyKind` distingue:
 *     - idempotency — chaves determinísticas (ex.: `inbox:initial:<jid>:100`)
 *     - hash        — chaves baseadas em hash do payload
 *     - unknown     — não foi possível classificar
 *
 * O snapshot é exposto em `window.__dedupeTelemetry` para DevTools.
 */
import { getLogger } from '@/lib/logger';

const log = getLogger('dedupeTelemetry');

export type DedupeOutcome = 'hit' | 'miss';

export type DedupeHitReason =
  | 'memory_cache'
  | 'persisted_cache'
  | 'inflight_local'
  | 'broadcast_wait'
  | 'late_cache';

export type DedupeMissReason =
  | 'lock_acquired_lead'
  | 'fallback_after_wait';

export type DedupeReason = DedupeHitReason | DedupeMissReason;

export type DedupeKeyKind = 'idempotency' | 'hash' | 'unknown';

export interface DedupeEvent {
  key: string;
  outcome: DedupeOutcome;
  reason: DedupeReason;
  keyKind: DedupeKeyKind;
  /** Namespace lógico (prefixo antes do primeiro `:`). Ex.: `inbox`, `older`. */
  namespace: string;
  /** Tempo de espera/execução em ms (apenas para misses e broadcast_wait). */
  durationMs?: number;
  /** Erro propagado (apenas para misses que falharam). */
  errorMessage?: string;
  ts: number;
}

/** Estatísticas agregadas de latência (ms) — usadas para leader vs follower. */
export interface LatencyStats {
  count: number;
  sumMs: number;
  maxMs: number;
  /** Média em ms (0 se count=0). */
  avgMs: number;
  /** Aproximação de p50/p95 sobre as últimas amostras (RECENT_LATENCY_LIMIT). */
  p50Ms: number;
  p95Ms: number;
}

export interface DedupeTelemetrySnapshot {
  total: number;
  hits: number;
  misses: number;
  hitRate: number;
  byReason: Record<DedupeReason, number>;
  byKeyKind: Record<DedupeKeyKind, number>;
  byNamespace: Record<string, { hits: number; misses: number }>;
  recentEvents: DedupeEvent[];
  // ── Métricas derivadas para visibilidade cross-tab ──────────────────
  /** Vezes em que ESTA aba executou o fetcher (lock_acquired_lead + fallback_after_wait). */
  leaderCount: number;
  /** Vezes em que outra aba executou e nós só consumimos o resultado (broadcast_wait + persisted_cache + late_cache). */
  followerCount: number;
  /** Hits servidos sem nem ir para outra aba (memory_cache + inflight_local). */
  localCacheCount: number;
  /**
   * Estimativa de chamadas economizadas: cada hit é uma execução de fetcher
   * que NÃO aconteceu graças ao dedupe.
   */
  callsSaved: number;
  /** Latência das execuções em que esta aba foi líder (incluindo retries). */
  leaderLatency: LatencyStats;
  /** Latência da espera por broadcast quando outra aba era líder. */
  followerLatency: LatencyStats;
}

const RECENT_LIMIT = 100;

const initialByReason = (): Record<DedupeReason, number> => ({
  memory_cache: 0,
  persisted_cache: 0,
  inflight_local: 0,
  broadcast_wait: 0,
  late_cache: 0,
  lock_acquired_lead: 0,
  fallback_after_wait: 0,
});

const initialByKeyKind = (): Record<DedupeKeyKind, number> => ({
  idempotency: 0,
  hash: 0,
  unknown: 0,
});

/** Quantas amostras de latência manter por bucket (leader/follower) para p50/p95. */
const RECENT_LATENCY_LIMIT = 200;

interface LatencyBucket {
  count: number;
  sumMs: number;
  maxMs: number;
  /** Janela deslizante de amostras para percentis aproximados. */
  samples: number[];
}

interface State {
  total: number;
  hits: number;
  misses: number;
  byReason: Record<DedupeReason, number>;
  byKeyKind: Record<DedupeKeyKind, number>;
  byNamespace: Record<string, { hits: number; misses: number }>;
  recentEvents: DedupeEvent[];
  leader: LatencyBucket;
  follower: LatencyBucket;
}

const newBucket = (): LatencyBucket => ({ count: 0, sumMs: 0, maxMs: 0, samples: [] });

const state: State = {
  total: 0,
  hits: 0,
  misses: 0,
  byReason: initialByReason(),
  byKeyKind: initialByKeyKind(),
  byNamespace: {},
  recentEvents: [],
  leader: newBucket(),
  follower: newBucket(),
};

const HIT_REASONS = new Set<DedupeReason>([
  'memory_cache',
  'persisted_cache',
  'inflight_local',
  'broadcast_wait',
  'late_cache',
]);

/** Hits que vieram de outras abas (cross-tab follower). */
const FOLLOWER_REASONS = new Set<DedupeReason>([
  'broadcast_wait',
  'persisted_cache',
  'late_cache',
]);

/** Hits servidos sem sair desta aba. */
const LOCAL_CACHE_REASONS = new Set<DedupeReason>([
  'memory_cache',
  'inflight_local',
]);

/** Misses que executaram o fetcher (esta aba foi líder). */
const LEADER_REASONS = new Set<DedupeReason>([
  'lock_acquired_lead',
  'fallback_after_wait',
]);

function recordLatency(bucket: LatencyBucket, durationMs: number) {
  bucket.count += 1;
  bucket.sumMs += durationMs;
  if (durationMs > bucket.maxMs) bucket.maxMs = durationMs;
  bucket.samples.push(durationMs);
  if (bucket.samples.length > RECENT_LATENCY_LIMIT) {
    bucket.samples.splice(0, bucket.samples.length - RECENT_LATENCY_LIMIT);
  }
}

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(sortedAsc.length - 1, Math.floor((p / 100) * sortedAsc.length));
  return sortedAsc[idx];
}

function bucketStats(b: LatencyBucket): LatencyStats {
  const sorted = b.samples.length ? b.samples.slice().sort((a, c) => a - c) : [];
  return {
    count: b.count,
    sumMs: b.sumMs,
    maxMs: b.maxMs,
    avgMs: b.count === 0 ? 0 : b.sumMs / b.count,
    p50Ms: percentile(sorted, 50),
    p95Ms: percentile(sorted, 95),
  };
}

/** Namespaces conhecidos do projeto que usam chaves determinísticas. */
const KNOWN_IDEMPOTENCY_NAMESPACES = new Set([
  'inbox',
  'older',
  'sub',     // dedupe por subscriber (testes)
  'multi',   // testes multi-aba
  'persist', // testes de cache persistente
  'remote',
]);

/** Heurística simples: chaves do projeto seguem o padrão `<ns>:<segmentos>`. */
export function inferKeyKind(key: string): DedupeKeyKind {
  if (!key || typeof key !== 'string') return 'unknown';
  const ns = extractNamespace(key);
  if (KNOWN_IDEMPOTENCY_NAMESPACES.has(ns)) return 'idempotency';
  // Heurística para hashes: 32+ hex chars contínuos no início.
  if (/^[a-f0-9]{32,}/i.test(key)) return 'hash';
  // Tem `:` separando segmentos legíveis → trata como idempotency key
  // genérica (composta determinisicamente pelo chamador).
  if (key.includes(':')) return 'idempotency';
  return 'unknown';
}

export function extractNamespace(key: string): string {
  const idx = key.indexOf(':');
  return idx === -1 ? key : key.slice(0, idx);
}

export function recordDedupeEvent(
  partial: Omit<DedupeEvent, 'outcome' | 'keyKind' | 'namespace' | 'ts'> & {
    keyKind?: DedupeKeyKind;
    namespace?: string;
  },
): void {
  const namespace = partial.namespace ?? extractNamespace(partial.key);
  const keyKind = partial.keyKind ?? inferKeyKind(partial.key);
  const outcome: DedupeOutcome = HIT_REASONS.has(partial.reason) ? 'hit' : 'miss';

  const evt: DedupeEvent = {
    key: partial.key,
    outcome,
    reason: partial.reason,
    keyKind,
    namespace,
    durationMs: partial.durationMs,
    errorMessage: partial.errorMessage,
    ts: Date.now(),
  };

  state.total += 1;
  if (outcome === 'hit') state.hits += 1;
  else state.misses += 1;
  state.byReason[evt.reason] += 1;
  state.byKeyKind[evt.keyKind] += 1;
  const ns = (state.byNamespace[namespace] ??= { hits: 0, misses: 0 });
  if (outcome === 'hit') ns.hits += 1;
  else ns.misses += 1;

  // Latência: leader = miss que rodou o fetcher; follower = hit cross-tab que esperou.
  if (typeof partial.durationMs === 'number' && partial.durationMs >= 0) {
    if (LEADER_REASONS.has(evt.reason)) recordLatency(state.leader, partial.durationMs);
    else if (FOLLOWER_REASONS.has(evt.reason)) recordLatency(state.follower, partial.durationMs);
  }

  state.recentEvents.push(evt);
  if (state.recentEvents.length > RECENT_LIMIT) {
    state.recentEvents.splice(0, state.recentEvents.length - RECENT_LIMIT);
  }

  if (typeof window !== 'undefined') {
    try {
      (window as unknown as { __dedupeTelemetry?: DedupeTelemetrySnapshot }).__dedupeTelemetry =
        getDedupeTelemetrySnapshot();
    } catch {
      /* noop */
    }
  }

  // Notifica subscribers reativos (sem polling).
  notifyTelemetrySubscribers();

  log.debug('dedupe event', { key: evt.key, outcome, reason: evt.reason, keyKind: evt.keyKind });
}

// ─── Subscribers reativos ────────────────────────────────────────────────────
type TelemetryListener = (snap: DedupeTelemetrySnapshot) => void;
const telemetryListeners = new Set<TelemetryListener>();

function notifyTelemetrySubscribers() {
  if (telemetryListeners.size === 0) return;
  const snap = getDedupeTelemetrySnapshot();
  telemetryListeners.forEach((fn) => {
    try { fn(snap); } catch { /* ignore listener errors */ }
  });
}

/**
 * Subscreve atualizações da telemetria. Útil para hooks React que querem
 * reagir sem polling. Retorna função de unsubscribe.
 */
export function subscribeDedupeTelemetry(listener: TelemetryListener): () => void {
  telemetryListeners.add(listener);
  return () => { telemetryListeners.delete(listener); };
}

export function getDedupeTelemetrySnapshot(): DedupeTelemetrySnapshot {
  let leaderCount = 0;
  let followerCount = 0;
  let localCacheCount = 0;
  for (const r of Object.keys(state.byReason) as DedupeReason[]) {
    const count = state.byReason[r];
    if (LEADER_REASONS.has(r)) leaderCount += count;
    else if (FOLLOWER_REASONS.has(r)) followerCount += count;
    else if (LOCAL_CACHE_REASONS.has(r)) localCacheCount += count;
  }
  return {
    total: state.total,
    hits: state.hits,
    misses: state.misses,
    hitRate: state.total === 0 ? 0 : state.hits / state.total,
    byReason: { ...state.byReason },
    byKeyKind: { ...state.byKeyKind },
    byNamespace: Object.fromEntries(
      Object.entries(state.byNamespace).map(([k, v]) => [k, { ...v }]),
    ),
    recentEvents: state.recentEvents.slice(-RECENT_LIMIT),
    leaderCount,
    followerCount,
    localCacheCount,
    callsSaved: state.hits, // cada hit é uma chamada que NÃO aconteceu
    leaderLatency: bucketStats(state.leader),
    followerLatency: bucketStats(state.follower),
  };
}

/** Reseta o singleton (uso em testes). */
export function resetDedupeTelemetry(): void {
  state.total = 0;
  state.hits = 0;
  state.misses = 0;
  state.byReason = initialByReason();
  state.byKeyKind = initialByKeyKind();
  state.byNamespace = {};
  state.recentEvents = [];
  state.leader = newBucket();
  state.follower = newBucket();
  if (typeof window !== 'undefined') {
    try {
      (window as unknown as { __dedupeTelemetry?: DedupeTelemetrySnapshot }).__dedupeTelemetry =
        getDedupeTelemetrySnapshot();
    } catch {
      /* noop */
    }
  }
  notifyTelemetrySubscribers();
}
