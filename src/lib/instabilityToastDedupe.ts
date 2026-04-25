/**
 * Dedupe do toast "Conexão instável" emitido durante o ciclo de retries.
 *
 * Estratégia (cross-tab):
 *   - Chave = `${contactId}|${normalizeErrorCode(err)}` para agrupar por
 *     contato + tipo de erro (não por mensagem variável da exceção).
 *   - Cooldown configurável (default 60s) entre toasts da mesma chave.
 *   - Estado em memória (Map) **espelhado em `localStorage`** para que abas
 *     novas/concorrentes herdem o cooldown imediatamente após reload ou
 *     ao detectar um disparo recente em outra aba.
 *   - `BroadcastChannel('instability-toast-dedupe')` propaga em tempo real:
 *     quando uma aba dispara, as demais marcam o cooldown sem precisar
 *     reler o `localStorage`.
 *   - Helpers de teste para reset/inspeção continuam disponíveis.
 *
 * Uso típico em `messageSender.ts`:
 *   if (shouldShowInstabilityToast(contactId, err)) toast({ ... });
 */

export const INSTABILITY_TOAST_COOLDOWN_MS = 60_000;

/**
 * Limite máximo de chaves no Map de cooldown. Acima disso, fazemos uma
 * limpeza LRU-like (remove as chaves mais antigas) para evitar crescimento
 * descontrolado em sessões longas com muitos contatos/tipos de erro.
 */
export const INSTABILITY_TOAST_MAX_KEYS = 200;

const LS_PREFIX = 'itd:fired:';
const BC_NAME = 'instability-toast-dedupe';
/** Identifica esta aba para ignorar o eco do próprio broadcast. */
const TAB_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const lastFiredByKey = new Map<string, number>();
const suppressedCountByKey = new Map<string, number>();
const firedCountByKey = new Map<string, number>();

/**
 * Quando `lastFiredByKey` excede `INSTABILITY_TOAST_MAX_KEYS`, remove as
 * entradas mais antigas (menor `lastFired`) até voltar ao limite. Mantém
 * a telemetria intacta — só o cooldown é afetado.
 */
function evictOldestIfNeeded(maxKeys: number = INSTABILITY_TOAST_MAX_KEYS): number {
  if (lastFiredByKey.size <= maxKeys) return 0;
  const entries = Array.from(lastFiredByKey.entries()).sort((a, b) => a[1] - b[1]);
  const toRemove = lastFiredByKey.size - maxKeys;
  for (let i = 0; i < toRemove; i++) {
    const [k] = entries[i];
    lastFiredByKey.delete(k);
    removePersistedFire(k);
  }
  return toRemove;
}

// ─── Persistência em localStorage ─────────────────────────────────────────────
interface PersistedFire {
  /** Timestamp do último disparo. */
  firedAt: number;
  /** Timestamp em que o cooldown expira (`firedAt + cooldownMs`). */
  expiresAt: number;
  /** Aba que originou o disparo (debug). */
  tabId: string;
}

function readPersistedFire(key: string, nowMs: number = Date.now()): PersistedFire | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedFire;
    if (typeof parsed?.expiresAt !== 'number' || parsed.expiresAt < nowMs) {
      try { localStorage.removeItem(LS_PREFIX + key); } catch { /* noop */ }
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writePersistedFire(key: string, firedAt: number, cooldownMs: number): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const payload: PersistedFire = {
      firedAt,
      expiresAt: firedAt + cooldownMs,
      tabId: TAB_ID,
    };
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(payload));
  } catch {
    /* quota cheia ou serialização falhou — degrada silenciosamente */
  }
}

function removePersistedFire(key: string): void {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.removeItem(LS_PREFIX + key); } catch { /* noop */ }
}

function clearAllPersistedFires(prefixContact?: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(LS_PREFIX)) continue;
      if (prefixContact) {
        const sub = k.slice(LS_PREFIX.length);
        if (!sub.startsWith(`${prefixContact}|`)) continue;
      }
      toRemove.push(k);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* noop */
  }
}

// ─── BroadcastChannel ─────────────────────────────────────────────────────────
type BroadcastPayload =
  | { type: 'fired'; key: string; firedAt: number; cooldownMs: number; ownerId: string }
  | { type: 'release'; contactId?: string; ownerId: string };

let bc: BroadcastChannel | null = null;
function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (bc) return bc;
  try {
    bc = new BroadcastChannel(BC_NAME);
    bc.addEventListener('message', (e) => onBroadcast(e.data as BroadcastPayload));
    return bc;
  } catch {
    return null;
  }
}

function onBroadcast(msg: BroadcastPayload | undefined): void {
  if (!msg || msg.ownerId === TAB_ID) return; // ignora eco da própria aba
  if (msg.type === 'fired') {
    // Outra aba acabou de disparar — herdar o cooldown sem disparar nada local.
    const existing = lastFiredByKey.get(msg.key) ?? 0;
    if (msg.firedAt > existing) {
      lastFiredByKey.set(msg.key, msg.firedAt);
      evictOldestIfNeeded();
    }
  } else if (msg.type === 'release') {
    if (msg.contactId) {
      for (const key of Array.from(lastFiredByKey.keys())) {
        if (key.startsWith(`${msg.contactId}|`)) lastFiredByKey.delete(key);
      }
    } else {
      lastFiredByKey.clear();
    }
  }
}

function broadcast(payload: BroadcastPayload): void {
  const ch = getBroadcastChannel();
  if (!ch) return;
  try { ch.postMessage(payload); } catch { /* noop */ }
}

// Inicialização: garante que o canal está ativo desde o primeiro check, para
// que a aba receba `fired` de outras abas mesmo antes de tentar disparar algo.
getBroadcastChannel();

// ─── Normalização de erro ─────────────────────────────────────────────────────
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
 * Considera cooldowns disparados nesta aba E em outras abas (via
 * `localStorage` + `BroadcastChannel`). Atualiza o último-disparo da chave
 * quando retorna `true`. Incrementa contadores de telemetria local.
 */
export function shouldShowInstabilityToast(
  contactId: string,
  err: unknown,
  options: { cooldownMs?: number; nowMs?: number } = {},
): boolean {
  const cooldownMs = options.cooldownMs ?? INSTABILITY_TOAST_COOLDOWN_MS;
  const now = options.nowMs ?? Date.now();
  const key = buildInstabilityToastKey(contactId, err);

  // Garante que o broadcast channel está ativo (idempotente).
  getBroadcastChannel();

  // 1. Checa memória local.
  let last = lastFiredByKey.get(key) ?? 0;

  // 2. Checa persistência cross-tab — pode ter sido disparado em outra aba
  //    enquanto esta estava em background ou antes de carregar.
  const persisted = readPersistedFire(key, now);
  if (persisted && persisted.firedAt > last) {
    last = persisted.firedAt;
    lastFiredByKey.set(key, persisted.firedAt);
  }

  if (last > 0 && now - last < cooldownMs) {
    suppressedCountByKey.set(key, (suppressedCountByKey.get(key) ?? 0) + 1);
    return false;
  }

  // 3. Dispara: registra local, persiste, broadcasta.
  lastFiredByKey.set(key, now);
  firedCountByKey.set(key, (firedCountByKey.get(key) ?? 0) + 1);
  writePersistedFire(key, now, cooldownMs);
  broadcast({ type: 'fired', key, firedAt: now, cooldownMs, ownerId: TAB_ID });
  evictOldestIfNeeded();
  return true;
}

/** Tamanho atual do Map de cooldown — exposto para inspeção/telemetria. */
export function getInstabilityToastCooldownSize(): number {
  return lastFiredByKey.size;
}

/**
 * Limpa o cooldown de um contato específico (ex.: após conexão bem-sucedida)
 * para liberar novos toasts imediatamente. Se `contactId` for omitido,
 * limpa tudo. Os contadores de telemetria são preservados. Propaga para
 * outras abas via `BroadcastChannel` e remove do `localStorage`.
 */
export function releaseInstabilityToastDedupe(contactId?: string): void {
  if (!contactId) {
    lastFiredByKey.clear();
    clearAllPersistedFires();
    broadcast({ type: 'release', ownerId: TAB_ID });
    return;
  }
  for (const key of Array.from(lastFiredByKey.keys())) {
    if (key.startsWith(`${contactId}|`)) lastFiredByKey.delete(key);
  }
  clearAllPersistedFires(contactId);
  broadcast({ type: 'release', contactId, ownerId: TAB_ID });
}

/** Telemetria: quantos toasts foram exibidos por chave. */
export function getInstabilityToastFiredCount(key: string): number {
  return firedCountByKey.get(key) ?? 0;
}

/** Telemetria: quantos toasts foram suprimidos por dedupe por chave. */
export function getInstabilityToastSuppressedCount(key: string): number {
  return suppressedCountByKey.get(key) ?? 0;
}

/** Test helper — reseta TODO o estado (cooldown + telemetria + storage). */
export function __resetInstabilityToastDedupeForTest(): void {
  lastFiredByKey.clear();
  suppressedCountByKey.clear();
  firedCountByKey.clear();
  clearAllPersistedFires();
}

/** @internal — para testes que precisam simular outra aba. */
export const __TAB_ID = TAB_ID;
