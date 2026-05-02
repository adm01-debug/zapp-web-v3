import { dbFrom, dbChannel, dbClient, dbTable } from '@/integrations/datasource/db';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface Message {
  id: string;
  contact_id: string | null;
  agent_id: string | null;
  content: string;
  sender: string;
  message_type: string;
  media_url: string | null;
  is_read: boolean | null;
  status: 'sent' | 'delivered' | 'read' | 'failed' | null;
  status_updated_at: string | null;
  created_at: string;
  updated_at: string;
  external_id: string | null;
  whatsapp_connection_id: string | null;
  transcription: string | null;
  transcription_status: string | null;
  is_deleted: boolean | null;
}

export const messageRepository = {
  async fetchMessagesByContact(contactId: string, from = 0, limit = 1000) {
    return supabase
      .from('messages')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: true })
      .range(from, from + limit - 1);
  },

  subscribeToMessages(contactId: string, callbacks: {
    onInsert: (payload: RealtimePostgresChangesPayload<Message>) => void;
    onUpdate: (payload: RealtimePostgresChangesPayload<Message>) => void;
    onDelete: (payload: RealtimePostgresChangesPayload<Message>) => void;
  }) {
    const channel = supabase
      .channel(`messages:${contactId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `contact_id=eq.${contactId}`,
        },
        callbacks.onInsert
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `contact_id=eq.${contactId}`,
        },
        callbacks.onUpdate
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `contact_id=eq.${contactId}`,
        },
        callbacks.onDelete
      )
      .subscribe();

    return channel;
  },

  unsubscribe(channel: any) {
    supabase.removeChannel(channel);
  }
};
