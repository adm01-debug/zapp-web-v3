/**
 * useContactsRealtime.ts — v2.0
 * Supabase Realtime subscriptions for evolution_contacts.
 * Handles: INSERT, UPDATE (including soft-delete), DELETE events.
 * Automatically filters by instance_name.
 *
 * Key behaviors:
 * - UPDATE where new.deleted_at IS NOT NULL → triggers onDelete (soft-delete)
 * - UPDATE where old.deleted_at IS NOT NULL AND new.deleted_at IS NULL → triggers onInsert (restore)
 * - INSERT → triggers onInsert
 * - DELETE → triggers onDelete (hard delete, rare)
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Contact } from '@/hooks/useContacts';

type ContactPayload = Record<string, unknown>;

interface UseContactsRealtimeOptions {
  instanceName?: string;
  /** Called when a new contact is added or restored */
  onInsert?: (contact: ContactPayload) => void;
  /** Called when a contact is updated (not deleted) */
  onUpdate?: (contact: ContactPayload) => void;
  /** Called when a contact is soft-deleted or hard-deleted */
  onDelete?: (id: string) => void;
  /** Called for any change (catch-all) */
  onAny?: () => void;
  enabled?: boolean;
}

export function useContactsRealtime({
  instanceName = 'wpp2',
  onInsert,
  onUpdate,
  onDelete,
  onAny,
  enabled = true,
}: UseContactsRealtimeOptions = {}) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Unique channel name per instance
    const channelName = `contacts-realtime:${instanceName}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'evolution_contacts',
          filter: `instance_name=eq.${instanceName}`,
        },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;

          onAny?.();

          if (eventType === 'INSERT') {
            // New contact or restored contact
            onInsert?.(newRow as ContactPayload);

          } else if (eventType === 'UPDATE') {
            const newContact = newRow as ContactPayload;
            const oldContact = oldRow as ContactPayload;

            // Soft-delete: was active, now deleted
            if (newContact.deleted_at && !oldContact.deleted_at) {
              onDelete?.(String(newContact.id));
              return;
            }

            // Restore: was deleted, now active
            if (!newContact.deleted_at && oldContact.deleted_at) {
              onInsert?.(newContact);
              return;
            }

            // Normal update
            onUpdate?.(newContact);

          } else if (eventType === 'DELETE') {
            // Hard delete (rare with soft-delete enabled)
            const deletedId = (oldRow as ContactPayload).id;
            if (deletedId) onDelete?.(String(deletedId));
          }
        }
      )
      .subscribe((status) => {
        if (import.meta.env.DEV) {
          console.debug(`[useContactsRealtime] Channel "${channelName}" status: ${status}`);
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [instanceName, enabled, onInsert, onUpdate, onDelete, onAny]);

  return {
    /** Manually unsubscribe from realtime updates */
    unsubscribe: () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    },
  };
}

export default useContactsRealtime;
