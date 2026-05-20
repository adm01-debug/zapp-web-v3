export type HubTab = 'connections' | 'integrations' | 'bridge';

export type BridgeStatus = 'idle' | 'checking' | 'online' | 'offline';

export type HealthRow = {
  window_label?: string | null;
  events_total?: number | null;
  events_ok?: number | null;
  events_failed?: number | null;
  avg_latency_ms?: number | null;
  last_event_at?: string | null;
};
