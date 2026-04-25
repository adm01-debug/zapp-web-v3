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
  /** Tempo de antecedência (ms) com que queremos disparar antes da expiração. */
  leadTimeMs?: number;
  /** Relógio injetado para testes determinísticos. Default: Date.now(). */
  now?: number;
}

export type AutoRefreshDecision =
  | { schedule: true; delayMs: number }
  | {
      schedule: false;
      reason:
        | 'dialog_closed'
        | 'status_not_pending'
        | 'no_expires_at'
        | 'already_past_window';
    };

const DEFAULT_LEAD_MS = 5_000;

export function evaluateAutoRefresh(input: AutoRefreshInput): AutoRefreshDecision {
  const { open, status, expiresAt } = input;
  const leadTimeMs = input.leadTimeMs ?? DEFAULT_LEAD_MS;
  const now = input.now ?? Date.now();

  if (!open) return { schedule: false, reason: 'dialog_closed' };
  if (status !== 'pending') return { schedule: false, reason: 'status_not_pending' };
  if (!expiresAt) return { schedule: false, reason: 'no_expires_at' };

  const delayMs = expiresAt - leadTimeMs - now;
  if (delayMs <= 0) return { schedule: false, reason: 'already_past_window' };

  return { schedule: true, delayMs };
}
