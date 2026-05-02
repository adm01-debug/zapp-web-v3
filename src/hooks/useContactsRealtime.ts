/**
 * useContactsRealtime.ts
 * Supabase Realtime subscription for live contact updates.
 * Notifies when contacts are created/updated/deleted in real-time.
 *
 * Usage:
 *   useContactsRealtime({
 *     instanceName: 'wpp2',
 *     onInsert: (contact) => setContacts(prev => [contact, ...prev]),
 *     onUpdate: (contact) => setContacts(prev => prev.map(c => c.id === contact.id ? contact : c)),
 *     onDelete: (id) => setContacts(prev => prev.filter(c => c.id !== id)),
 *   });
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeText } from '@/lib/sanitize';
import { type Contact } from '@/hooks/useContacts';
import { type RealtimeChannel } from '@supabase/supabase-js';

interface RealtimeOptions {
  instanceName?: string;
  onInsert?:     (contact: Contact) => void;
  onUpdate?:     (contact: Contact) => void;
  onDelete?:     (id: string) => void;
  enabled?:      boolean;
}

// Map raw Supabase record to Contact type
function mapToContact(row: Record<string, unknown>): Contact {
  return {
    id:              String(row.id ?? ''),
    remote_jid:      String(row.remote_jid ?? ''),
    phone_number:    row.phone_number as string | null,
    full_name:       row.full_name ? sanitizeText(row.full_name as string) : null,
    push_name:       row.push_name ? sanitizeText(row.push_name as string) : null,
    email:           row.email as string | null,
    company:         row.company ? sanitizeText(row.company as string) : null,
    lead_status:     String(row.lead_status ?? 'novo'),
    lead_score:      Number(row.lead_score ?? 0),
    tags:            Array.isArray(row.tags) ? row.tags as string[] : [],
    notes:           row.notes as string | null,
    instance_name:   String(row.instance_name ?? 'wpp2'),
    assigned_to:     row.assigned_to as string | null,
    first_contact_at:row.first_contact_at as string | null,
    last_message_at: row.last_message_at as string | null,
    total_messages:  Number(row.total_messages ?? 0),
    created_at:      String(row.created_at ?? ''),
    updated_at:      String(row.updated_at ?? ''),
    deleted_at:      row.deleted_at as string | null,
    version:         Number(row.version ?? 1),
    profile_picture_url: row.profile_picture_url as string | null,
    lgpd_consent_at:     row.lgpd_consent_at as string | null,
    lgpd_opt_out_at:     row.lgpd_opt_out_at as string | null,
    lgpd_marketing_consent: Boolean(row.lgpd_marketing_consent ?? false),
    merge_source_id:     row.merge_source_id as string | null,
  };
}

export function useContactsRealtime({
  instanceName = 'wpp2',
  onInsert,
  onUpdate,
  onDelete,
  enabled = true,
}: RealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Create Realtime channel
    const channel = supabase
      .channel(`contacts:${instanceName}:${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'evolution_contacts',
          filter: `instance_name=eq.${instanceName}`,
        },
        (payload) => {
          const contact = mapToContact(payload.new as Record<string, unknown>);
          // Only notify for non-deleted contacts
          if (!contact.deleted_at) {
            onInsert?.(contact);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'evolution_contacts',
          filter: `instance_name=eq.${instanceName}`,
        },
        (payload) => {
          const contact = mapToContact(payload.new as Record<string, unknown>);
          const old = payload.old as Record<string, unknown>;

          // Was just soft-deleted
          if (contact.deleted_at && !old.deleted_at) {
            onDelete?.(contact.id);
            return;
          }

          // Was just restored
          if (!contact.deleted_at && old.deleted_at) {
            onInsert?.(contact);
            return;
          }

          // Normal update (only if not deleted)
          if (!contact.deleted_at) {
            onUpdate?.(contact);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event:  'DELETE',
          schema: 'public',
          table:  'evolution_contacts',
          filter: `instance_name=eq.${instanceName}`,
        },
        (payload) => {
          const id = String((payload.old as Record<string, unknown>).id ?? '');
          if (id) onDelete?.(id);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.debug(`[useContactsRealtime] Subscribed to contacts:${instanceName}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.warn(`[useContactsRealtime] Channel error for contacts:${instanceName}`);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [instanceName, enabled, onInsert, onUpdate, onDelete]);
}

export default useContactsRealtime;
