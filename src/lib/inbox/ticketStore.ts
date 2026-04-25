/**
 * Ticket overlay store
 * ====================
 *
 * Camada local que mantém status (`open` | `in_progress` | `resolved`) e
 * histórico de eventos do atendimento, por `contact_id`. É um *stub*
 * persistido em `localStorage` enquanto o operador FATOR X não publica as
 * RPCs equivalentes (`rpc_update_conversation_status`,
 * `rpc_assign_conversation`).
 *
 * Toda mutação dispara um evento custom (`ticket-overlay-changed`) para
 * que abas/usuários da mesma sessão vejam o estado atualizado em tempo
 * real (cross-tab via `storage` event nativo + intra-tab via custom).
 *
 * Quando a RPC ficar disponível basta trocar `persistRemote` por uma
 * chamada `externalClient.rpc(...)` — a API pública do hook não muda.
 */

const STORAGE_KEY = 'inbox.tickets.overlay.v1';
const EVENT_NAME = 'ticket-overlay-changed';

export type TicketStatus = 'open' | 'in_progress' | 'resolved';

export interface TicketEvent {
  id: string;
  /** Tipo do evento — alinhado com `conversation_events.event_type`. */
  type: 'status_change' | 'assign' | 'unassign' | 'transfer' | 'auto_routed';
  at: string; // ISO
  performedBy?: string | null;
  fromAgentId?: string | null;
  toAgentId?: string | null;
  fromStatus?: TicketStatus | null;
  toStatus?: TicketStatus | null;
  note?: string | null;
}

export interface TicketState {
  status: TicketStatus;
  assignedTo: string | null; // profile_id
  queueId: string | null;
  /** Quando entrou em `open` pela primeira vez (para tempo médio). */
  openedAt: string;
  /** Última transição. */
  updatedAt: string;
  resolvedAt?: string | null;
  events: TicketEvent[];
}

type Overlay = Record<string, TicketState>;

function readAll(): Overlay {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Overlay;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(overlay: Overlay) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overlay));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    // localStorage cheio/desabilitado — silencioso, é overlay.
  }
}

function cryptoId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function ensure(state: Overlay, contactId: string): TicketState {
  if (!state[contactId]) {
    const now = new Date().toISOString();
    state[contactId] = {
      status: 'open',
      assignedTo: null,
      queueId: null,
      openedAt: now,
      updatedAt: now,
      events: [],
    };
  }
  return state[contactId];
}

export const ticketStore = {
  /** Snapshot completo (somente leitura). */
  snapshot(): Overlay {
    return readAll();
  },

  get(contactId: string): TicketState | null {
    const state = readAll();
    return state[contactId] ?? null;
  },

  /** Garante o registro inicial (idempotente, não dispara evento). */
  bootstrap(contactId: string, seed?: Partial<Pick<TicketState, 'assignedTo' | 'queueId' | 'openedAt'>>) {
    const state = readAll();
    if (state[contactId]) return;
    const now = new Date().toISOString();
    state[contactId] = {
      status: 'open',
      assignedTo: seed?.assignedTo ?? null,
      queueId: seed?.queueId ?? null,
      openedAt: seed?.openedAt ?? now,
      updatedAt: now,
      events: [],
    };
    writeAll(state);
  },

  setStatus(contactId: string, next: TicketStatus, performedBy: string | null) {
    const state = readAll();
    const t = ensure(state, contactId);
    if (t.status === next) return;
    const ev: TicketEvent = {
      id: cryptoId(),
      type: 'status_change',
      at: new Date().toISOString(),
      performedBy,
      fromStatus: t.status,
      toStatus: next,
    };
    t.status = next;
    t.updatedAt = ev.at;
    t.resolvedAt = next === 'resolved' ? ev.at : null;
    t.events = [ev, ...t.events].slice(0, 50);
    writeAll(state);
  },

  assign(contactId: string, agentId: string | null, performedBy: string | null, opts?: { queueId?: string | null; auto?: boolean }) {
    const state = readAll();
    const t = ensure(state, contactId);
    const prev = t.assignedTo;
    if (prev === agentId && (opts?.queueId === undefined || opts.queueId === t.queueId)) return;
    const now = new Date().toISOString();
    const evType: TicketEvent['type'] = opts?.auto
      ? 'auto_routed'
      : agentId == null
        ? 'unassign'
        : prev == null
          ? 'assign'
          : 'transfer';
    const ev: TicketEvent = {
      id: cryptoId(),
      type: evType,
      at: now,
      performedBy,
      fromAgentId: prev,
      toAgentId: agentId,
    };
    t.assignedTo = agentId;
    if (opts?.queueId !== undefined) t.queueId = opts.queueId;
    // Atribuir reabre se estava resolvido
    if (agentId && t.status === 'resolved') {
      t.events = [
        { id: cryptoId(), type: 'status_change', at: now, performedBy, fromStatus: 'resolved', toStatus: 'in_progress' },
        ev,
        ...t.events,
      ].slice(0, 50);
      t.status = 'in_progress';
    } else if (agentId && t.status === 'open') {
      // Quem assume entra em "em andamento" automaticamente
      t.events = [
        { id: cryptoId(), type: 'status_change', at: now, performedBy, fromStatus: 'open', toStatus: 'in_progress' },
        ev,
        ...t.events,
      ].slice(0, 50);
      t.status = 'in_progress';
    } else {
      t.events = [ev, ...t.events].slice(0, 50);
    }
    t.updatedAt = now;
    writeAll(state);
  },

  /** Subscreve mudanças (cross-tab via storage + intra-tab via custom). */
  subscribe(listener: () => void): () => void {
    if (typeof window === 'undefined') return () => undefined;
    const handler = () => listener();
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) listener();
    };
    window.addEventListener(EVENT_NAME, handler);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(EVENT_NAME, handler);
      window.removeEventListener('storage', onStorage);
    };
  },
};
