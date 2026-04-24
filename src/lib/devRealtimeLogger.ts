/**
 * Dev-only logger for postgres_changes subscriptions on the `messages` table.
 *
 * Goal: make it trivial, in development, to see:
 *   - WHEN a hook registers a subscription (and with what event/filter)
 *   - WHEN that hook actually receives a payload from the realtime channel
 *
 * Both are tagged with the consumer hook name so the 7-way fan-out documented
 * in TRILHA_MENSAGENS_NAVEGAVEL.mmd is observable at a glance in the console.
 *
 * Production: completely no-op (zero overhead, no console noise).
 */

const isDev =
  typeof import.meta !== 'undefined' &&
  // Vite injects this; also true in `bun run dev`
  (import.meta as unknown as { env?: { DEV?: boolean; MODE?: string } }).env?.DEV === true;

type Bind = {
  event?: string;
  schema?: string;
  table?: string;
  filter?: string;
};

type AnyPayload = {
  eventType?: string;
  new?: { id?: string | number } | null;
  old?: { id?: string | number } | null;
  [k: string]: unknown;
};

const STYLE_REG = 'color:#888;font-weight:600';
const STYLE_HOOK = 'color:#3b82f6;font-weight:700';
const STYLE_EVENT_INSERT = 'color:#16a34a;font-weight:600';
const STYLE_EVENT_UPDATE = 'color:#d97706;font-weight:600';
const STYLE_EVENT_DELETE = 'color:#dc2626;font-weight:600';
const STYLE_DIM = 'color:#888';

function eventStyle(evt: string | undefined): string {
  switch ((evt ?? '').toUpperCase()) {
    case 'INSERT':
      return STYLE_EVENT_INSERT;
    case 'UPDATE':
      return STYLE_EVENT_UPDATE;
    case 'DELETE':
      return STYLE_EVENT_DELETE;
    default:
      return STYLE_DIM;
  }
}

/**
 * Log that a hook is registering a postgres_changes subscription on `messages`.
 * Call this once at subscription setup time (right before/after `.on(...)`).
 */
export function logMessagesSubscribe(hookName: string, bind: Bind): void {
  if (!isDev) return;
  const evt = bind.event ?? '*';
  // eslint-disable-next-line no-console
  console.debug(
    `%c[realtime:messages]%c subscribe %c${hookName}%c → %c${evt}%c ${bind.table ?? 'messages'}${
      bind.filter ? ` (${bind.filter})` : ''
    }`,
    STYLE_REG,
    STYLE_DIM,
    STYLE_HOOK,
    STYLE_DIM,
    eventStyle(evt),
    STYLE_DIM,
  );
}

/**
 * Wrap a postgres_changes handler so each received payload is logged with the
 * consumer hook name. Returns a new function with the same signature.
 *
 * Usage:
 *   .on('postgres_changes', binding,
 *     wrapMessagesHandler('useMessages', handlePayload))
 */
export function wrapMessagesHandler<T extends AnyPayload>(
  hookName: string,
  handler: (payload: T) => void,
): (payload: T) => void {
  if (!isDev) return handler;
  return (payload: T) => {
    try {
      const evt = payload?.eventType ?? '?';
      const id =
        (payload?.new && (payload.new as { id?: string | number }).id) ??
        (payload?.old && (payload.old as { id?: string | number }).id) ??
        '—';
      // eslint-disable-next-line no-console
      console.debug(
        `%c[realtime:messages]%c event %c${hookName}%c ← %c${evt}%c id=${String(id)}`,
        STYLE_REG,
        STYLE_DIM,
        STYLE_HOOK,
        STYLE_DIM,
        eventStyle(String(evt)),
        STYLE_DIM,
      );
    } catch {
      // never break realtime because of logging
    }
    handler(payload);
  };
}
