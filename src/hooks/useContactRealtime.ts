/**
 * useContactRealtime.ts
 * Supabase Realtime subscription for contact data in the chat sidebar.
 * 
 * Solves:
 * - Gap #1: No real-time sync when another agent edits a contact
 * - Gap #12: Race conditions on rapid conversation switching
 * - Gap #18: No webhook/realtime updates from external sources
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface RealtimeContactData {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  tags: string[];
  channel: string | null;
  avatar_url: string | null;
  notes: string | null;
  created_at: string;
  last_seen_at: string | null;
  workspace_id: string;
  custom_fields?: Record<string, unknown>;
  lgpd_consent_at?: string | null;
  lgpd_consent_channel?: string | null;
  lgpd_opt_out_at?: string | null;
  lgpd_marketing_consent?: boolean;
  lgpd_data_sharing?: boolean;
  lgpd_profiling?: boolean;
  deleted_at?: string | null;
  [key: string]: unknown;
}

interface UseContactRealtimeOptions {
  contactId: string | null;
  workspaceId: string;
  enabled?: boolean;
  staleTimeMs?: number;
  onContactUpdated?: (contact: RealtimeContactData) => void;
  onContactDeleted?: (contactId: string) => void;
}

interface UseContactRealtimeReturn {
  contact: RealtimeContactData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  lastUpdatedAt: number | null;
}

// ── In-memory cache ─────────────────────────────────────────────────────
const contactCache = new Map<string, { data: RealtimeContactData; fetchedAt: number }>();
const DEFAULT_STALE_TIME = 10_000; // 10 seconds

export function useContactRealtime({
  contactId,
  workspaceId,
  enabled = true,
  staleTimeMs = DEFAULT_STALE_TIME,
  onContactUpdated,
  onContactDeleted,
}: UseContactRealtimeOptions): UseContactRealtimeReturn {
  const [contact, setContact] = useState<RealtimeContactData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const contactIdRef = useRef(contactId);
  contactIdRef.current = contactId;

  // ── Fetch contact data with AbortController ───────────────────────
  const fetchContact = useCallback(async (id: string, force = false) => {
    // Check cache first
    if (!force) {
      const cached = contactCache.get(id);
      if (cached && Date.now() - cached.fetchedAt < staleTimeMs) {
        setContact(cached.data);
        setLastUpdatedAt(cached.fetchedAt);
        setIsLoading(false);
        return;
      }
    }

    // Cancel previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', id)
        .eq('workspace_id', workspaceId)
        .maybeSingle()
        .abortSignal(controller.signal);

      // If this request was for a different contact (user switched), ignore
      if (contactIdRef.current !== id) return;

      if (fetchError) {
        if (fetchError.message?.includes('aborted')) return;
        setError(fetchError.message);
        setIsLoading(false);
        return;
      }

      if (data) {
        const contactData = data as RealtimeContactData;
        const now = Date.now();
        contactCache.set(id, { data: contactData, fetchedAt: now });
        setContact(contactData);
        setLastUpdatedAt(now);
      } else {
        setContact(null);
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Erro ao carregar contato');
    } finally {
      if (contactIdRef.current === id) {
        setIsLoading(false);
      }
    }
  }, [workspaceId, staleTimeMs]);

  // ── Manual refetch ────────────────────────────────────────────────
  const refetch = useCallback(() => {
    if (contactId) {
      fetchContact(contactId, true);
    }
  }, [contactId, fetchContact]);

  // ── Subscribe to Supabase Realtime ────────────────────────────────
  useEffect(() => {
    if (!contactId || !enabled) {
      setContact(null);
      setIsLoading(false);
      return;
    }

    // Initial fetch
    fetchContact(contactId);

    // Setup Realtime subscription
    const channel = supabase
      .channel(`contact-realtime-${contactId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contacts',
          filter: `id=eq.${contactId}`,
        },
        (payload) => {
          if (contactIdRef.current !== contactId) return;

          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as RealtimeContactData;
            const now = Date.now();
            contactCache.set(contactId, { data: updated, fetchedAt: now });
            setContact(updated);
            setLastUpdatedAt(now);
            onContactUpdated?.(updated);
          }

          if (payload.eventType === 'DELETE') {
            contactCache.delete(contactId);
            setContact(null);
            onContactDeleted?.(contactId);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      abortRef.current?.abort();
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [contactId, enabled, fetchContact, onContactUpdated, onContactDeleted]);

  return { contact, isLoading, error, refetch, lastUpdatedAt };
}

// ── Cache utilities ─────────────────────────────────────────────────────
export function invalidateContactCache(contactId: string): void {
  contactCache.delete(contactId);
}

export function clearContactCache(): void {
  contactCache.clear();
}

export function getContactFromCache(contactId: string): RealtimeContactData | null {
  return contactCache.get(contactId)?.data ?? null;
}
