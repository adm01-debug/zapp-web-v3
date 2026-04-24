import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { externalSupabase, isExternalConfigured } from '@/integrations/supabase/externalClient';
import type { EvolutionContact } from '@/types/evolutionExternal';
import { getLogger } from '@/lib/logger';
import { setRealtimeContactsStatus } from './realtimeContactsStatusStore';

const log = getLogger('RealtimeContacts');
const FLUSH_DELAY_MS = 100;
const BROADCAST_RE = /(^status@broadcast$|@broadcast$)/i;

interface UseRealtimeContactsOptions {
  instance?: string;
  enabled?: boolean;
}

type ContactChange = {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  contact: EvolutionContact;
};

/**
 * Subscribes to evolution_contacts changes on FATOR X and updates
 * React Query caches in real time. Batched to 100ms to coalesce bursts.
 *
 * - Only listens (never SELECTs evolution_contacts directly).
 * - Filters by instance on the server.
 * - Patches caches optimistically; falls back to invalidate when no entry exists.
 * - Soft delete (deleted_at != null) treated as DELETE on the list.
 */
export function useRealtimeContacts(options: UseRealtimeContactsOptions = {}) {
  const { instance = 'wpp2', enabled = true } = options;
  const queryClient = useQueryClient();
  const pendingRef = useRef<Map<string, ContactChange>>(new Map());
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || !isExternalConfigured || !externalSupabase) {
      setRealtimeContactsStatus('disconnected');
      return;
    }
    setRealtimeContactsStatus('connecting');

    const flush = () => {
      flushTimerRef.current = null;
      const pending = pendingRef.current;
      if (pending.size === 0) return;
      const changes = Array.from(pending.values());
      pendingRef.current = new Map();

      // Cache key used by useExternalConversations
      const conversationsKey = ['external-evolution', 'conversations'];
      let invalidateConversations = false;

      for (const change of changes) {
        const { contact } = change;
        const remoteJid = contact.remote_jid;

        // Patch individual contact cache if present
        queryClient.setQueriesData<EvolutionContact | undefined>(
          { queryKey: ['contact', remoteJid] },
          (prev) => (prev ? { ...prev, ...contact } : prev),
        );
        queryClient.setQueriesData<EvolutionContact | undefined>(
          { queryKey: ['external-evolution', 'contact', remoteJid] },
          (prev) => (prev ? { ...prev, ...contact } : prev),
        );

        // INSERT/DELETE always invalidate the list (ordering changes)
        if (change.type === 'INSERT' || change.type === 'DELETE' || contact.deleted_at) {
          invalidateConversations = true;
        } else {
          // UPDATE: try to patch list entries in place, fallback to invalidate
          let patched = false;
          queryClient.setQueriesData<unknown>(
            { queryKey: ['contacts-list'] },
            (prev) => {
              if (!Array.isArray(prev)) return prev;
              const idx = prev.findIndex(
                (c) => c && typeof c === 'object' && (c as EvolutionContact).remote_jid === remoteJid,
              );
              if (idx < 0) return prev;
              patched = true;
              const next = prev.slice();
              next[idx] = { ...(next[idx] as object), ...contact };
              return next;
            },
          );
          if (!patched) invalidateConversations = true;
        }

        // Notify non-React-Query consumers
        try {
          window.dispatchEvent(
            new CustomEvent('contact-updated', {
              detail: { type: change.type, contact },
            }),
          );
        } catch {
          /* noop in non-DOM env */
        }
      }

      if (invalidateConversations) {
        void queryClient.invalidateQueries({ queryKey: conversationsKey });
        void queryClient.invalidateQueries({ queryKey: ['contacts-list'] });
      }
    };

    const scheduleFlush = () => {
      if (flushTimerRef.current) return;
      flushTimerRef.current = setTimeout(flush, FLUSH_DELAY_MS);
    };

    const handlePayload = (
      payload: RealtimePostgresChangesPayload<EvolutionContact>,
    ) => {
      const row = (payload.new ?? payload.old) as EvolutionContact | undefined;
      if (!row || !row.remote_jid) {
        log.warn('Payload sem remote_jid — descartando', { eventType: payload.eventType });
        return;
      }
      if (BROADCAST_RE.test(row.remote_jid)) return;
      if (row.instance_name && row.instance_name !== instance) return;

      const type =
        payload.eventType === 'DELETE'
          ? 'DELETE'
          : payload.eventType === 'INSERT'
            ? 'INSERT'
            : 'UPDATE';

      pendingRef.current.set(row.remote_jid, { type, contact: row });
      scheduleFlush();
    };

    const channelName = `realtime:evolution_contacts:${instance}`;
    const channel = externalSupabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'evolution_contacts',
          filter: `instance_name=eq.${instance}`,
        },
        handlePayload,
      )
      .subscribe((status) => {
        // Map Supabase realtime states → app-facing 3-state model
        if (status === 'SUBSCRIBED') setRealtimeContactsStatus('connected');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setRealtimeContactsStatus('error');
        else if (status === 'CLOSED') setRealtimeContactsStatus('disconnected');
        else setRealtimeContactsStatus('connecting');
      });

    return () => {
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      pendingRef.current = new Map();
      setRealtimeContactsStatus('disconnected');
      void externalSupabase.removeChannel(channel);
    };
  }, [enabled, instance, queryClient]);
}
