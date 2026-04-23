/**
 * In-memory pub/sub for transient send statuses (sending/retrying).
 * Terminal statuses (sent/failed/failed_auth/failed_retries) persist in DB.
 */
export type SendUIStatus =
  | 'sending'
  | 'retrying'
  | 'sent'
  | 'failed'
  | 'failed_auth'
  | 'failed_retries';

export interface SendStatusDetail {
  status: SendUIStatus;
  attempt?: number;
  totalRetries?: number;
  errorCode?: string | number;
  errorReason?: string;
  updatedAt: number;
}

type Listener = (detail: SendStatusDetail) => void;

const store = new Map<string, SendStatusDetail>();
const listeners = new Map<string, Set<Listener>>();
const globalListeners = new Set<(messageId: string, detail: SendStatusDetail) => void>();

export function emitSendStatus(messageId: string, detail: Omit<SendStatusDetail, 'updatedAt'>) {
  const full: SendStatusDetail = { ...detail, updatedAt: Date.now() };
  store.set(messageId, full);
  listeners.get(messageId)?.forEach((cb) => {
    try { cb(full); } catch { /* noop */ }
  });
  globalListeners.forEach((cb) => {
    try { cb(messageId, full); } catch { /* noop */ }
  });
}

export function getSendStatus(messageId: string): SendStatusDetail | undefined {
  return store.get(messageId);
}

export function subscribeSendStatus(messageId: string, cb: Listener): () => void {
  let set = listeners.get(messageId);
  if (!set) {
    set = new Set();
    listeners.set(messageId, set);
  }
  set.add(cb);
  return () => {
    set!.delete(cb);
    if (set!.size === 0) listeners.delete(messageId);
  };
}

export function subscribeAllSendStatus(
  cb: (messageId: string, detail: SendStatusDetail) => void
): () => void {
  globalListeners.add(cb);
  return () => { globalListeners.delete(cb); };
}

export function clearSendStatus(messageId: string) {
  store.delete(messageId);
  listeners.delete(messageId);
}
