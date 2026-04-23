// Shared helpers para a DLQ `failed_messages`:
//  - Backoff exponencial determinístico (com jitter opcional).
//  - Idempotency key estável derivada de (instance, path, payload).
//
// Usado por:
//  - _shared/enqueue-failed-message.ts (primeira inserção, attempt=1)
//  - reprocess-failed-messages/index.ts (próxima tentativa após falha)

const BASE_DELAY_MS = 60_000;        // 1min
const MAX_DELAY_MS = 3_600_000;      // 60min
const JITTER_RATIO = 0.15;           // ±15%

/**
 * Backoff exponencial com teto e jitter:
 *   attempt=1 → 60s    attempt=2 → 120s   attempt=3 → 240s
 *   attempt=4 → 480s   attempt=5 → 960s   attempt≥6 → 3600s (cap)
 * Jitter ±15% para evitar thundering herd.
 */
export function computeBackoffMs(attempt: number, withJitter = true): number {
  const safeAttempt = Math.max(1, Math.floor(attempt));
  const raw = BASE_DELAY_MS * Math.pow(2, safeAttempt - 1);
  const capped = Math.min(raw, MAX_DELAY_MS);
  if (!withJitter) return capped;
  const jitter = capped * JITTER_RATIO * (Math.random() * 2 - 1);
  return Math.max(1_000, Math.round(capped + jitter));
}

/** Stable JSON: ordena chaves recursivamente para hashing determinístico. */
export function stableStringify(value: unknown): string {
  const walk = (v: unknown): unknown => {
    if (v === null || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map(walk);
    const obj = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(obj).sort()) {
      const w = walk(obj[k]);
      if (w !== undefined) out[k] = w;
    }
    return out;
  };
  return JSON.stringify(walk(value));
}

/** SHA-256 hex via SubtleCrypto (disponível no Deno runtime). */
export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Chave idempotente: hash determinístico de (instance | path | payload-sem-__path).
 * Dois enqueues do mesmo envio (mesma instância, mesma rota, mesmo body) produzem
 * a MESMA chave → bloqueados pelo índice único parcial enquanto status ∈ pending/retrying.
 */
export async function buildIdempotencyKey(
  instance: string,
  path: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const cleaned = { ...payload };
  delete (cleaned as Record<string, unknown>).__path;
  const canonical = `${instance}|${path}|${stableStringify(cleaned)}`;
  return await sha256Hex(canonical);
}
