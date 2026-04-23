/**
 * useExternalEvolution — Hooks for reading evolution_messages from external FATOR X DB
 * Replaces the local DB reads for the Inbox when external DB is the source of truth.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryExternalProxy } from '@/lib/externalProxy';
import {
  buildExternalConversations,
  evolutionToRealtimeMessage,
} from '@/adapters/evolutionAdapter';
import type { EvolutionMessage } from '@/types/evolutionExternal';
import type { ConversationWithMessages } from '@/hooks/useRealtimeMessages';
import type { RealtimeMessage } from '@/hooks/useRealtimeMessages';
import { getLogger } from '@/lib/logger';

const log = getLogger('useExternalEvolution');

const POLL_INTERVAL = 5000; // 5s polling

// ─── Fetch all recent messages from external DB ───────────────
async function fetchExternalMessages(limit = 500): Promise<EvolutionMessage[]> {
  const result = await queryExternalProxy<EvolutionMessage>({
    table: 'evolution_messages',
    select: '*',
    order: { column: 'created_at', ascending: false },
    limit,
  });
  return result.data;
}

// ─── Fetch messages for a specific remote_jid ─────────────────
async function fetchMessagesByJid(remoteJid: string, limit = 1000): Promise<EvolutionMessage[]> {
  const result = await queryExternalProxy<EvolutionMessage>({
    table: 'evolution_messages',
    select: '*',
    filters: [{ column: 'remote_jid', operator: 'eq', value: remoteJid }],
    order: { column: 'created_at', ascending: true },
    limit,
  });
  return result.data;
}

// ─── Hook: External Conversations (list for sidebar) ──────────
export function useExternalConversations(enabled = true) {
  const query = useQuery<ConversationWithMessages[]>({
    queryKey: ['external-evolution', 'conversations', enabled],
    queryFn: async () => {
      const messages = await fetchExternalMessages(500);
      return buildExternalConversations(messages);
    },
    enabled,
    refetchInterval: enabled ? POLL_INTERVAL : false,
    staleTime: POLL_INTERVAL - 1000,
  });

  return {
    conversations: query.data || [],
    loading: enabled ? query.isLoading : false,
    error: enabled ? query.error?.message || null : null,
    refetch: query.refetch,
  };
}

// ─── Hook: External Messages for a specific contact/jid ───────
export function useExternalMessages(remoteJid: string | null) {
  const [messages, setMessages] = useState<RealtimeMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const previousJidRef = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!remoteJid || !mountedRef.current) {
      if (mountedRef.current) { setMessages([]); setLoading(false); }
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const evoMessages = await fetchMessagesByJid(remoteJid);
      if (mountedRef.current) {
        setMessages(evoMessages.map(evolutionToRealtimeMessage));
      }
    } catch (err) {
      log.error('Error fetching external messages:', err);
      if (mountedRef.current) setError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [remoteJid]);

  // Fetch on jid change
  useEffect(() => {
    if (remoteJid !== previousJidRef.current) {
      previousJidRef.current = remoteJid;
      fetchMessages();
    }
  }, [remoteJid, fetchMessages]);

  // Polling for new messages
  useEffect(() => {
    if (!remoteJid) return;
    const interval = setInterval(fetchMessages, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [remoteJid, fetchMessages]);

  const addMessage = useCallback((message: RealtimeMessage) => {
    setMessages(prev => {
      if (prev.some(m => m.id === message.id)) return prev;
      return [...prev, message];
    });
  }, []);

  const updateMessage = useCallback((messageId: string, updates: Partial<RealtimeMessage>) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, ...updates } : m));
  }, []);

  const removeMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
  }, []);

  return { messages, loading, error, refetch: fetchMessages, addMessage, updateMessage, removeMessage };
}
