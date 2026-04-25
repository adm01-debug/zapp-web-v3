/**
 * Pure decision logic for the QR auto-refresh scheduler.
 *
 * Extraído do `useConnectionsManager` para permitir testes unitários
 * determinísticos. A regra é simples: o auto-refresh só pode ser agendado
 * quando o diálogo está ABERTO, o status é `pending` e existe um
 * `expiresAt` futuro (com pelo menos `leadTimeMs` de antecedência).
 */

export type QrDialogStatus = 'loading' | 'pending' | 'connected' | 'error';

export interface AutoRefreshInput {
  open: boolean;
  status: QrDialogStatus;
  expiresAt: number | null;
  /**
   * Tempo de antecedência (ms) com que queremos disparar antes da expiração.
   * Quando omitido, é calculado automaticamente a partir do TTL restante via
   * {@link computeLeadTimeMs} — assim TTLs curtos (ex: 20s) ganham um lead
   * proporcionalmente menor e TTLs longos não desperdiçam tempo de scan.
   */
  leadTimeMs?: number;
  /** Relógio injetado para testes determinísticos. Default: Date.now(). */
  now?: number;
}

export type AutoRefreshDecision =
  | { schedule: true; delayMs: number; leadTimeMs: number }
  | {
      schedule: false;
      reason:
        | 'dialog_closed'
        | 'status_not_pending'
        | 'no_expires_at'
        | 'already_past_window';
    };

/** Lead time mínimo: abaixo disso o auto-refresh não dá tempo de receber o novo QR. */
export const LEAD_MIN_MS = 2_000;
/** Lead time máximo: acima disso desperdiçamos tempo útil de scan do usuário. */
export const LEAD_MAX_MS = 8_000;
/** Fração do TTL usada como lead alvo (10%). */
const LEAD_RATIO = 0.1;
/**
 * Teto de segurança: o lead nunca pode passar de 50% do TTL, senão o refresh
 * dispararia "cedo demais" (ex: TTL=10s, lead fixo=5s → refresh na metade).
 */
const LEAD_MAX_RATIO_OF_TTL = 0.5;

/**
 * Calcula o lead time ideal a partir do TTL real do QR.
 *
 * Regras (em ordem):
 *   1. Alvo = 10% do TTL.
 *   2. Clamp em [LEAD_MIN_MS, LEAD_MAX_MS].
 *   3. Garante que o lead nunca passe de 50% do TTL (proteção contra
 *      TTLs muito curtos disparando refresh cedo demais).
 *   4. Se o TTL for tão pequeno que não cabe nem o LEAD_MIN_MS dentro de
 *      50% dele, retorna `floor(ttl * 0.5)` para preservar a semântica
 *      "nunca antes da metade".
 */
export function computeLeadTimeMs(ttlMs: number): number {
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) return LEAD_MIN_MS;
  const safetyCap = Math.floor(ttlMs * LEAD_MAX_RATIO_OF_TTL);
  const target = Math.round(ttlMs * LEAD_RATIO);
  const clamped = Math.min(LEAD_MAX_MS, Math.max(LEAD_MIN_MS, target));
  return Math.min(clamped, safetyCap);
}

export function evaluateAutoRefresh(input: AutoRefreshInput): AutoRefreshDecision {
  const { open, status, expiresAt } = input;
  const now = input.now ?? Date.now();

  if (!open) return { schedule: false, reason: 'dialog_closed' };
  if (status !== 'pending') return { schedule: false, reason: 'status_not_pending' };
  if (!expiresAt) return { schedule: false, reason: 'no_expires_at' };

  const ttlRemaining = expiresAt - now;
  const leadTimeMs = input.leadTimeMs ?? computeLeadTimeMs(ttlRemaining);
  const delayMs = expiresAt - leadTimeMs - now;
  if (delayMs <= 0) return { schedule: false, reason: 'already_past_window' };

  return { schedule: true, delayMs, leadTimeMs };
}
