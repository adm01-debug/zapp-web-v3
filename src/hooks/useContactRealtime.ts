/**
 * useContactRealtime.ts — Realtime contact sync via EXTERNAL CRM database
 *
 * FIXED: Now uses getExternalSupabase() instead of Lovable Cloud DB.
 * Contacts live in the GESTÃO DE CLIENTES database (pgxfvjmuubtbowutlide).
 *
 * Features:
 * - Subscribes to postgres_changes on the external contacts table
 * - In-memory cache with configurable staleTime
 * - AbortController for race condition prevention when switching contacts
 * - Automatic reconnection on channel errors
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { getExternalSupabase, isExternalConfigured } from '@/integrations/supabase/externalClient';
import { contactsDB, type ExternalContact } from '@/lib/contactsDB';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface ContactRealtimeOptions {
  contactId: string | undefined;
  enabled?: boolean;
  staleTimeMs?: number;
}

interface ContactRealtimeState {
  contact: ExternalContact | null;
  isLoading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
}

export function useContactRealtime({
  contactId,
  enabled = true,
  staleTimeMs = 10_000,
}: ContactRealtimeOptions) {
  const [state, setState] = useState<ContactRealtimeState>({
    contact: null,
    isLoading: false,
    error: null,
    lastFetchedAt: null,
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, { data: ExternalContact; ts: number }>>(new Map());

  const fetchContact = useCallback(async (id: string, signal?: AbortSignal) => {
    // Check cache
    const cached = cacheRef.current.get(id);
    if (cached && Date.now() - cached.ts < staleTimeMs) {
      setState({ contact: cached.data, isLoading: false, error: null, lastFetchedAt: cached.ts });
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const data = await contactsDB.getById(id);
      if (signal?.aborted) return;

      if (data) {
        cacheRef.current.set(id, { data, ts: Date.now() });
      }
      setState({
        contact: data,
        isLoading: false,
        error: null,
        lastFetchedAt: Date.now(),
      });
    } catch (err) {
      if (signal?.aborted) return;
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Erro ao carregar contato',
      }));
    }
  }, [staleTimeMs]);

  const refetch = useCallback(() => {
    if (!contactId) return;
    cacheRef.current.delete(contactId);
    fetchContact(contactId);
  }, [contactId, fetchContact]);

  useEffect(() => {
    if (!contactId || !enabled || !isExternalConfigured) {
      setState({ contact: null, isLoading: false, error: null, lastFetchedAt: null });
      return;
    }

    // Abort previous fetch
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    fetchContact(contactId, controller.signal);

    // Subscribe to realtime changes on external DB
    const client = getExternalSupabase();
    if (client) {
      const channel = client
        .channel(`contact-rt-${contactId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'contacts',
            filter: `id=eq.${contactId}`,
          },
          (payload) => {
            if (payload.eventType === 'UPDATE' && payload.new) {
              const updated = payload.new as ExternalContact;
              cacheRef.current.set(contactId, { data: updated, ts: Date.now() });
              setState({
                contact: updated,
                isLoading: false,
                error: null,
                lastFetchedAt: Date.now(),
              });
            } else if (payload.eventType === 'DELETE') {
              cacheRef.current.delete(contactId);
              setState({ contact: null, isLoading: false, error: null, lastFetchedAt: Date.now() });
            }
          }
        )
        .subscribe();

      channelRef.current = channel;
    }

    return () => {
      controller.abort();
      channelRef.current?.unsubscribe();
      channelRef.current = null;
    };
  }, [contactId, enabled, fetchContact]);

  return {
    contact: state.contact,
    isLoading: state.isLoading,
    error: state.error,
    lastFetchedAt: state.lastFetchedAt,
    refetch,
    isConfigured: isExternalConfigured,
  };
}
