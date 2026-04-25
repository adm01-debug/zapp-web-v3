/**
 * useExternalEvolution — Hooks for reading evolution_messages from external FATOR X DB
 * Replaces the local DB reads for the Inbox when external DB is the source of truth.
 *
 * Pagination strategy (post-incremental refactor):
 * - Sidebar list: only last N days, capped at 200, with instance_name filter.
 * - Per-conversation: 100 messages by jid, with cursor-based loadOlder().
 * - Polling: cursor-forward (created_at > lastSeen) instead of full re-fetch.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryExternalProxy } from '@/lib/externalProxy';
import {
  buildExternalConversations,
  evolutionToRealtimeMessage,
} from '@/adapters/evolutionAdapter';
import type { EvolutionMessage } from '@/types/evolutionExternal';
import type { RealtimeMessage } from '@/hooks/useRealtimeMessages';
import { getLogger } from '@/lib/logger';
import { dedupedFetch } from '@/lib/realtime/crossTabDedupe';

const log = getLogger('useExternalEvolution');

const POLL_INTERVAL = 5000; // 5s polling
const DEFAULT_INSTANCE = 'wpp2';
const SIDEBAR_DAYS_BACK = 7;
const SIDEBAR_LIMIT = 200;
const CONVERSATION_PAGE_SIZE = 100;

// Slim select — drops `payload` and `raw_data` (each can be 10KB+).
const SLIM_MESSAGE_COLUMNS = [
  'id', 'message_id', 'remote_jid', 'from_me', 'message_type', 'content',
  'media_url', 'media_mimetype', 'media_type', 'media_filename', 'media_size',
  'caption', 'quoted_message_id', 'is_starred', 'is_important', 'category',
  'sentiment', 'tags', 'notes', 'follow_up_at', 'follow_up_done',
  'created_at', 'contact_id', 'conversation_id', 'direction', 'status',
  'status_at', 'sent_by_bot', 'template_name', 'instance_name', 'push_name',
  'deleted_at',
].join(',');

// ─── Sidebar: recent window across all conversations ──────────
async function fetchRecentMessagesWindow(
  daysBack = SIDEBAR_DAYS_BACK,
  limit = SIDEBAR_LIMIT,
): Promise<EvolutionMessage[]> {
  const since = new Date(Date.now() - daysBack * 86_400_000).toISOString();
  const result = await queryExternalProxy<EvolutionMessage>({
    table: 'evolution_messages',
    select: SLIM_MESSAGE_COLUMNS,
    filters: [
      { column: 'instance_name', operator: 'eq', value: DEFAULT_INSTANCE },
      { column: 'created_at', operator: 'gte', value: since },
    ],
    order: { column: 'created_at', ascending: false },
    limit,
  });
  return result.data;
}

// ─── Per-conversation: paginated by jid (with optional cursor) ──
async function fetchMessagesByJid(
  remoteJid: string,
  limit = CONVERSATION_PAGE_SIZE,
  beforeDate?: string,
  signal?: AbortSignal,
): Promise<EvolutionMessage[]> {
  const filters: { column: string; operator: string; value: unknown }[] = [
    { column: 'remote_jid', operator: 'eq', value: remoteJid },
    { column: 'instance_name', operator: 'eq', value: DEFAULT_INSTANCE },
  ];
  if (beforeDate) {
    filters.push({ column: 'created_at', operator: 'lt', value: beforeDate });
  }

  const result = await queryExternalProxy<EvolutionMessage>({
    table: 'evolution_messages',
    select: SLIM_MESSAGE_COLUMNS,
    filters,
    // descending so the cursor (oldest in current view) works as upper bound;
    // we reverse on the client for chronological display.
    order: { column: 'created_at', ascending: false },
    limit,
    signal,
  });
  return result.data.slice().reverse();
}

// ─── Cursor-forward poll: only messages newer than lastSeen ────
async function fetchMessagesAfter(
  remoteJid: string,
  afterDate: string,
  limit = CONVERSATION_PAGE_SIZE,
): Promise<EvolutionMessage[]> {
  const result = await queryExternalProxy<EvolutionMessage>({
    table: 'evolution_messages',
    select: SLIM_MESSAGE_COLUMNS,
    filters: [
      { column: 'remote_jid', operator: 'eq', value: remoteJid },
      { column: 'instance_name', operator: 'eq', value: DEFAULT_INSTANCE },
      { column: 'created_at', operator: 'gt', value: afterDate },
    ],
    order: { column: 'created_at', ascending: true },
    limit,
  });
  return result.data;
}

// ─── Hook: External Conversations (list for sidebar) ──────────
export function useExternalConversations(enabled = true) {
  const query = useQuery({
    queryKey: ['external-evolution', 'conversations', SIDEBAR_DAYS_BACK, SIDEBAR_LIMIT],
    queryFn: async () => {
      // Dedupe cross-aba: a sidebar é igual em todas as abas, então uma única
      // chamada por janela é suficiente — abas adicionais reaproveitam.
      const messages = await dedupedFetch(
        `inbox:sidebar:${SIDEBAR_DAYS_BACK}:${SIDEBAR_LIMIT}`,
        () => fetchRecentMessagesWindow(),
        { lockTtl: 8_000, resultTtl: POLL_INTERVAL - 500, waitTimeout: 6_000 },
      );
      return buildExternalConversations(messages);
    },
    enabled,
    refetchInterval: POLL_INTERVAL,
    staleTime: POLL_INTERVAL - 1000,
  });

  return {
    conversations: query.data || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
  };
}

// ─── Hook: External Messages for a specific contact/jid ───────
export function useExternalMessages(remoteJid: string | null) {
  const [messages, setMessages] = useState<RealtimeMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const previousJidRef = useRef<string | null>(null);
  const lastSeenRef = useRef<string | null>(null);
  const loadOlderAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Abort any in-flight loadOlder on unmount
      if (loadOlderAbortRef.current) {
        loadOlderAbortRef.current.abort();
        loadOlderAbortRef.current = null;
      }
    };
  }, []);

  const cancelLoadOlder = useCallback(() => {
    if (loadOlderAbortRef.current) {
      loadOlderAbortRef.current.abort();
      loadOlderAbortRef.current = null;
      if (mountedRef.current) setLoadingOlder(false);
    }
  }, []);

  const initialFetch = useCallback(async () => {
    if (!remoteJid || !mountedRef.current) {
      if (mountedRef.current) { setMessages([]); setLoading(false); }
      return;
    }

    try {
      setLoading(true);
      setError(null);
      // Dedupe cross-aba: trocar para o mesmo contato em N abas só dispara
      // 1 fetch — as demais reaproveitam via BroadcastChannel/cache.
      const evoMessages = await dedupedFetch(
        `inbox:initial:${remoteJid}:${CONVERSATION_PAGE_SIZE}`,
        () => fetchMessagesByJid(remoteJid, CONVERSATION_PAGE_SIZE),
        { lockTtl: 10_000, resultTtl: 15_000, waitTimeout: 8_000 },
      );
      if (!mountedRef.current) return;

      const mapped = evoMessages.map(evolutionToRealtimeMessage);
      setMessages(mapped);
      setHasMore(evoMessages.length === CONVERSATION_PAGE_SIZE);
      lastSeenRef.current = evoMessages.length
        ? evoMessages[evoMessages.length - 1].created_at
        : null;
    } catch (err) {
      log.error('Error fetching external messages:', err);
      if (mountedRef.current) setError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [remoteJid]);

  // Cursor-forward poll (only new messages since lastSeen)
  const pollNewMessages = useCallback(async () => {
    if (!remoteJid || !mountedRef.current) return;
    const afterDate = lastSeenRef.current;
    if (!afterDate) return;

    try {
      const newOnes = await fetchMessagesAfter(remoteJid, afterDate);
      if (!mountedRef.current || newOnes.length === 0) return;

      const mapped = newOnes.map(evolutionToRealtimeMessage);
      setMessages(prev => {
        const seen = new Set(prev.map(m => m.id));
        const additions = mapped.filter(m => !seen.has(m.id));
        if (additions.length === 0) return prev;
        return [...prev, ...additions];
      });
      lastSeenRef.current = newOnes[newOnes.length - 1].created_at;
    } catch (err) {
      log.error('Error polling external messages:', err);
    }
  }, [remoteJid]);

  // Load older page (scroll up) — cancellable
  const loadOlder = useCallback(async () => {
    if (!remoteJid || !mountedRef.current || loadingOlder || !hasMore) return;
    if (messages.length === 0) return;

    const oldest = messages[0]?.created_at;
    if (!oldest) return;

    // Abort any previous in-flight loadOlder before starting a new one.
    if (loadOlderAbortRef.current) {
      loadOlderAbortRef.current.abort();
    }
    const controller = new AbortController();
    loadOlderAbortRef.current = controller;

    try {
      setLoadingOlder(true);
      // Dedupe cross-aba: mesma janela (jid + cursor) compartilhada via
      // localStorage lock + BroadcastChannel. Evita N abas chamando o mesmo
      // page de mensagens antigas em paralelo.
      const dedupeKey = `older:${remoteJid}:${oldest}:${CONVERSATION_PAGE_SIZE}`;
      const older = await dedupedFetch(
        dedupeKey,
        () => fetchMessagesByJid(remoteJid, CONVERSATION_PAGE_SIZE, oldest, controller.signal),
        { lockTtl: 10_000, resultTtl: 30_000, waitTimeout: 8_000 },
      );
      if (!mountedRef.current || controller.signal.aborted) return;

      const mapped = older.map(evolutionToRealtimeMessage);
      if (mapped.length === 0) {
        setHasMore(false);
        return;
      }

      setMessages(prev => {
        if (controller.signal.aborted) return prev;
        const seen = new Set(prev.map(m => m.id));
        const additions = mapped.filter(m => !seen.has(m.id));
        return [...additions, ...prev];
      });
      setHasMore(older.length === CONVERSATION_PAGE_SIZE);
    } catch (err) {
      // Silence aborts (user navigated away or scrolled back down)
      const name = (err as { name?: string } | null)?.name;
      if (name === 'AbortError') return;
      log.error('Error loading older messages:', err);
    } finally {
      if (loadOlderAbortRef.current === controller) {
        loadOlderAbortRef.current = null;
      }
      if (mountedRef.current) setLoadingOlder(false);
    }
  }, [remoteJid, messages, loadingOlder, hasMore]);

  // Initial fetch on jid change
  useEffect(() => {
    if (remoteJid !== previousJidRef.current) {
      previousJidRef.current = remoteJid;
      lastSeenRef.current = null;
      setHasMore(true);
      initialFetch();
    }
  }, [remoteJid, initialFetch]);

  // Polling for new messages (cursor-forward)
  useEffect(() => {
    if (!remoteJid) return;
    const interval = setInterval(pollNewMessages, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [remoteJid, pollNewMessages]);

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

  return {
    messages,
    loading,
    loadingOlder,
    hasMore,
    error,
    refetch: initialFetch,
    loadOlder,
    cancelLoadOlder,
    addMessage,
    updateMessage,
    removeMessage,
  };
}
