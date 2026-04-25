/**
 * Dedupe do toast "Conexão instável" emitido durante o ciclo de retries.
 *
 * Estratégia:
 *   - Chave = `${contactId}|${normalizeErrorCode(err)}` para agrupar por
 *     contato + tipo de erro (não por mensagem variável da exceção).
 *   - Cooldown configurável (default 60s) entre toasts da mesma chave.
 *   - Estado em memória (Map) + helpers de teste para reset/inspeção.
 *
 * Uso típico em `messageSender.ts`:
 *   if (shouldShowInstabilityToast(contactId, err)) toast({ ... });
 */

export const INSTABILITY_TOAST_COOLDOWN_MS = 60_000;

const lastFiredByKey = new Map<string, number>();
const suppressedCountByKey = new Map<string, number>();
const firedCountByKey = new Map<string, number>();

/**
 * Normaliza um erro arbitrário em um `error_code` estável usado no dedupe.
 * Mensagens variáveis da exceção (ex.: "fetch failed at 12:03:45") nunca
 * entram na chave — só a categoria.
 */
export function normalizeErrorCode(err: unknown): string {
  if (err == null) return 'UNKNOWN';
  if (typeof err === 'object') {
    const e = err as { status?: number; code?: string | number; message?: string; name?: string };
    if (typeof e.status === 'number') {
      if (e.status === 401 || e.status === 403) return 'AUTH';
      if (e.status === 408 || e.status === 504) return 'TIMEOUT';
      if (e.status === 429) return 'RATE_LIMIT';
      if (e.status >= 500) return 'SERVER';
      if (e.status >= 400) return 'CLIENT';
    }
    if (typeof e.code === 'string') return e.code.toUpperCase();
    if (typeof e.code === 'number') return `CODE_${e.code}`;
    const msg = (e.message || '').toLowerCase();
    if (msg) {
      if (msg.includes('timeout') || msg.includes('timed out')) return 'TIMEOUT';
      if (msg.includes('network') || msg.includes('fetch failed') || msg.includes('econnreset')) return 'NETWORK';
      if (msg.includes('unauthorized') || msg.includes('forbidden') || msg.includes('invalid token') || msg.includes('invalid api key')) return 'AUTH';
      if (msg.includes('rate limit') || msg.includes('too many requests')) return 'RATE_LIMIT';
    }
    if (e.name === 'AbortError') return 'ABORT';
  }
  if (typeof err === 'string') {
    const m = err.toLowerCase();
    if (m.includes('timeout')) return 'TIMEOUT';
    if (m.includes('network')) return 'NETWORK';
  }
  return 'UNKNOWN';
}

/** Constrói a chave estável `contato|tipoErro` usada pelo cooldown. */
export function buildInstabilityToastKey(contactId: string, err: unknown): string {
  return `${contactId}|${normalizeErrorCode(err)}`;
}

/**
 * Decide se o toast de "Conexão instável" deve ser exibido agora.
 * Atualiza o último-disparo da chave quando retorna `true`. Incrementa
 * contadores de telemetria para inspeção/testes.
 */
export function shouldShowInstabilityToast(
  contactId: string,
  err: unknown,
  options: { cooldownMs?: number; nowMs?: number } = {},
): boolean {
  const cooldownMs = options.cooldownMs ?? INSTABILITY_TOAST_COOLDOWN_MS;
  const now = options.nowMs ?? Date.now();
  const key = buildInstabilityToastKey(contactId, err);
  const last = lastFiredByKey.get(key) ?? 0;
  if (now - last < cooldownMs) {
    suppressedCountByKey.set(key, (suppressedCountByKey.get(key) ?? 0) + 1);
    return false;
  }
  lastFiredByKey.set(key, now);
  firedCountByKey.set(key, (firedCountByKey.get(key) ?? 0) + 1);
  return true;
}

/**
 * Limpa o cooldown de um contato específico (ex.: após conexão bem-sucedida)
 * para liberar novos toasts imediatamente. Se `contactId` for omitido,
 * limpa tudo. Os contadores de telemetria são preservados.
 */
export function releaseInstabilityToastDedupe(contactId?: string): void {
  if (!contactId) {
    lastFiredByKey.clear();
    return;
  }
  for (const key of Array.from(lastFiredByKey.keys())) {
    if (key.startsWith(`${contactId}|`)) lastFiredByKey.delete(key);
  }
}

/** Telemetria: quantos toasts foram exibidos por chave. */
export function getInstabilityToastFiredCount(key: string): number {
  return firedCountByKey.get(key) ?? 0;
}

/** Telemetria: quantos toasts foram suprimidos por dedupe por chave. */
export function getInstabilityToastSuppressedCount(key: string): number {
  return suppressedCountByKey.get(key) ?? 0;
}

/** Test helper — reseta TODO o estado (cooldown + telemetria). */
export function __resetInstabilityToastDedupeForTest(): void {
  lastFiredByKey.clear();
  suppressedCountByKey.clear();
  firedCountByKey.clear();
}
