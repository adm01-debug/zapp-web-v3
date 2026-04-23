/**
 * Shared shape for an incoming WhatsApp call alert.
 * Used by both `useIncomingCallListener` (postgres_changes legacy)
 * and `useIncomingCallBroadcast` (realtime broadcast from webhook).
 */
export interface IncomingCall {
  id: string;
  contact_id: string | null;
  contact_name: string;
  contact_phone: string;
  contact_avatar_url?: string | null;
  is_video: boolean;
  whatsapp_connection_id: string | null;
  started_at: string;
}
