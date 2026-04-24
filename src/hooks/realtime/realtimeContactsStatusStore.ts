/**
 * Lightweight store to expose the live status of the evolution_contacts
 * realtime subscription. Read by UI indicators (e.g. inbox header dot)
 * without prop-drilling from useRealtimeContacts.
 */
import { useSyncExternalStore } from 'react';

export type RealtimeContactsStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

let current: RealtimeContactsStatus = 'idle';
const listeners = new Set<() => void>();

export function setRealtimeContactsStatus(next: RealtimeContactsStatus) {
  if (next === current) return;
  current = next;
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): RealtimeContactsStatus {
  return current;
}

export function useRealtimeContactsStatus(): RealtimeContactsStatus {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
