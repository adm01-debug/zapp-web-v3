import type { TicketStatus } from './ticketStore';

/**
 * Mapa de transições permitidas entre estados de ticket.
 *
 * Regras de negócio:
 *  open        → in_progress  (agente assume)
 *  open        → resolved     (fechamento direto sem atribuição)
 *  in_progress → resolved     (resolução normal)
 *  in_progress → open         (devolução à fila / desatribuição)
 *  resolved    → open         (reabertura explícita)
 *  resolved    → in_progress  (reatribuição direta pós-fechamento — via assign())
 *
 * Toda transição not listed aqui é inválida e deve ser rejeitada por
 * `canTransition()` / `assertTransition()`.
 */
export const TICKET_STATUS_TRANSITIONS: Readonly<Record<TicketStatus, readonly TicketStatus[]>> = {
  open:        ['in_progress', 'resolved'],
  in_progress: ['resolved', 'open'],
  resolved:    ['open', 'in_progress'],
} as const;

/** Retorna true se a transição from → to é permitida. */
export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  if (from === to) return false;
  return (TICKET_STATUS_TRANSITIONS[from] as readonly string[]).includes(to);
}

/**
 * Lança um `Error` descritivo se a transição for inválida.
 * Use em contextos onde a transição NUNCA deveria ser inválida e um
 * erro é preferível a silêncio (p.ex. testes unitários).
 */
export function assertTransition(from: TicketStatus, to: TicketStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Transição de ticket inválida: "${from}" → "${to}"`);
  }
}
