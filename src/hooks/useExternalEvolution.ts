/**
 * useExternalEvolution — Hooks for reading evolution_messages from external FATOR X DB
 * Replaces the local DB reads for the Inbox when external DB is the source of truth.
 *
 * Pagination strategy (post-incremental refactor):
 * - Sidebar list: only last N days, capped at 200, with instance_name filter.
 * - Per-conversation: 100 messages by jid, with cursor-based loadOlder().
 * - Polling: cursor-forward (created_at > lastSeen) instead of full re-fetch.
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDedupeLoadingByKey } from '@/hooks/useDedupeLoadingByKey';
import { queryExternalProxy } from '@/lib/externalProxy';
import {
  buildExternalConversations,
  evolutionToRealtimeMessage,
} from '@/adapters/evolutionAdapter';
import type { EvolutionMessage } from '@/types/evolutionExternal';
import type { RealtimeMessage } from '@/hooks/useRealtimeMessages';
import { getLogger } from '@/lib/logger';
import { dedupedFetch, subscribeDedupe } from '@/lib/realtime/crossTabDedupe';
import { mergeRealtimeMessages, maxCreatedAt } from '@/lib/inbox/mergeRealtimeMessages';
import {
  inboxInitialKey,
  inboxPollKey,
  inboxOlderKey,
  inboxSidebarKey,
  inboxJidKeyPrefixes,
} from '@/lib/inbox/inboxDedupeKeys';
import {
  POLL_INTERVAL_MS,
  SIDEBAR_DAYS_BACK,
  SIDEBAR_LIMIT,
  CONVERSATION_PAGE_SIZE,
  getSidebarDedupeOptions,
  getInitialDedupeOptions,
  getPollDedupeOptions,
  getOlderDedupeOptions,
} from '@/lib/inbox/inboxDedupeConfig';

const log = getLogger('useExternalEvolution');

const POLL_INTERVAL = POLL_INTERVAL_MS;
const DEFAULT_INSTANCE = 'wpp2';

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
        inboxSidebarKey(SIDEBAR_DAYS_BACK, SIDEBAR_LIMIT),
        () => fetchRecentMessagesWindow(),
        getSidebarDedupeOptions(),
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
  // Jid "ativo" — atualizado SÍNCRONAMENTE quando o prop muda (ver effect abaixo).
  // Usado por callbacks assíncronos (fetch + broadcast) para abortar writes
  // que pertencem a um jid que já não está mais selecionado.
  const activeJidRef = useRef<string | null>(remoteJid);
  // Sub atual do crossTabDedupe — guardamos para garantir desinscrição
  // imediata e idempotente caso algo dispare re-subscribe sem esperar o cleanup.
  const dedupeUnsubRef = useRef<(() => void) | null>(null);

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
    // Snapshot do jid no início do fetch — usado para descartar writes tardios
    // se o usuário trocar de conversa antes da resposta chegar.
    const ownerJid = remoteJid;

    try {
      setLoading(true);
      setError(null);
      // Dedupe cross-aba: trocar para o mesmo contato em N abas só dispara
      // 1 fetch — as demais reaproveitam via BroadcastChannel/cache.
      const evoMessages = await dedupedFetch(
        inboxInitialKey({ jid: ownerJid, pageSize: CONVERSATION_PAGE_SIZE }),
        () => fetchMessagesByJid(ownerJid, CONVERSATION_PAGE_SIZE),
        getInitialDedupeOptions(),
      );
      if (!mountedRef.current || activeJidRef.current !== ownerJid) return;

      const mapped = evoMessages.map(evolutionToRealtimeMessage);
      setMessages(mapped);
      setHasMore(evoMessages.length === CONVERSATION_PAGE_SIZE);
      lastSeenRef.current = evoMessages.length
        ? evoMessages[evoMessages.length - 1].created_at
        : null;
    } catch (err) {
      log.error('Error fetching external messages:', err);
      if (mountedRef.current && activeJidRef.current === ownerJid) {
        setError(err instanceof Error ? err.message : 'Failed to fetch');
      }
    } finally {
      if (mountedRef.current && activeJidRef.current === ownerJid) setLoading(false);
    }
  }, [remoteJid]);

  // Cursor-forward poll (only new messages since lastSeen)
  const pollNewMessages = useCallback(async () => {
    if (!remoteJid || !mountedRef.current) return;
    const afterDate = lastSeenRef.current;
    if (!afterDate) return;
    const ownerJid = remoteJid;

    try {
      // Dedupe: várias abas pollando o mesmo jid+cursor compartilham 1 fetch
      // (TTL curto = poll seguinte ainda dispara normalmente).
      const newOnes = await dedupedFetch(
        inboxPollKey({ jid: ownerJid, afterDate }),
        () => fetchMessagesAfter(ownerJid, afterDate),
        getPollDedupeOptions(),
      );
      if (!mountedRef.current || activeJidRef.current !== ownerJid || newOnes.length === 0) return;

      const mapped = newOnes.map(evolutionToRealtimeMessage);
      setMessages(prev => mergeRealtimeMessages(prev, mapped) as RealtimeMessage[]);
      // Cursor: usa o MAIOR created_at recebido (não o último do array, que pode
      // ter chegado fora de ordem se o backend devolveu por id em vez de tempo).
      const newest = maxCreatedAt(mapped);
      if (newest) {
        const newestStr = typeof newest === 'string' ? newest : new Date(newest).toISOString();
        if (!lastSeenRef.current || newestStr > lastSeenRef.current) {
          lastSeenRef.current = newestStr;
        }
      }
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
      // page de mensagens antigas em paralelo. Cursor normalizado para
      // epoch ms — evita colisão por variação no formato ISO.
      const dedupeKey = inboxOlderKey({
        jid: remoteJid,
        beforeDate: oldest,
        pageSize: CONVERSATION_PAGE_SIZE,
      });
      const older = await dedupedFetch(
        dedupeKey,
        () => fetchMessagesByJid(remoteJid, CONVERSATION_PAGE_SIZE, oldest, controller.signal),
        getOlderDedupeOptions({
          // Não retentar se o usuário cancelou (scrollou ou trocou de chat).
          shouldRetry: () => !controller.signal.aborted,
        }),
      );
      if (!mountedRef.current || controller.signal.aborted) return;
      if (activeJidRef.current !== remoteJid) return; // jid trocou durante o fetch

      const mapped = older.map(evolutionToRealtimeMessage);
      if (mapped.length === 0) {
        setHasMore(false);
        return;
      }

      setMessages(prev => {
        if (controller.signal.aborted) return prev;
        // Merge ordenado: a página `older` vem desc do servidor, mas o sort
        // por (created_at, id) reposiciona corretamente entre o histórico atual.
        return mergeRealtimeMessages(prev, mapped) as RealtimeMessage[];
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

  // Cross-tab sync: quando outra aba conclui um fetch (initial/poll/older)
  // para este mesmo jid, recebemos o resultado via BroadcastChannel e
  // atualizamos a UI sem refazer a requisição.
  useEffect(() => {
    if (!remoteJid) return;
    const [initialPrefix, pollPrefix, olderPrefix] = inboxJidKeyPrefixes(remoteJid);
    const jidPrefixes = [initialPrefix, pollPrefix, olderPrefix];
    const matcher = new RegExp(
      `^(${jidPrefixes.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    );

    const unsub = subscribeDedupe<EvolutionMessage[]>(matcher, (key, data, source) => {
      if (source === 'local') return; // já tratado pelo fluxo do próprio fetcher
      if (!mountedRef.current || !Array.isArray(data) || data.length === 0) return;

      // Independente do origem (initial/poll/older), o merge ordena por
      // (created_at, id) e dedupa por id — não há mais necessidade de
      // ramificações por tipo de chave nem de inverter páginas `older`.
      const mapped = data.map(evolutionToRealtimeMessage);

      setMessages((prev) => mergeRealtimeMessages(prev, mapped) as RealtimeMessage[]);

      // Cursor `lastSeen` avança somente para frente: usa o maior created_at
      // recebido neste lote (poll/initial podem trazer mensagens novas).
      const newest = maxCreatedAt(mapped);
      if (newest) {
        const newestStr = typeof newest === 'string' ? newest : new Date(newest).toISOString();
        if (!lastSeenRef.current || newestStr > lastSeenRef.current) {
          lastSeenRef.current = newestStr;
        }
      }

      if (key.startsWith(initialPrefix) && mountedRef.current) {
        setLoading(false);
      }
    });
    return unsub;
  }, [remoteJid]);

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

  // ─── Loading sync cross-tab por chave ──────────────────────────────────────
  // Constroi um matcher único cobrindo initial/poll/older deste jid.
  // A aba que está apenas observando recebe `phase: 'start/end'` da líder e
  // ajusta o spinner sem disparar fetch próprio.
  const jidPrefixMatcher = useMemo<RegExp | null>(() => {
    if (!remoteJid) return null;
    const [initialPrefix, pollPrefix, olderPrefix] = inboxJidKeyPrefixes(remoteJid);
    const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^(${[initialPrefix, pollPrefix, olderPrefix].map(escape).join('|')})`);
  }, [remoteJid]);

  const { isLoadingKey } = useDedupeLoadingByKey(
    jidPrefixMatcher ?? /(?!)/,
    Boolean(remoteJid),
  );

  const initialPrefix = remoteJid ? inboxJidKeyPrefixes(remoteJid)[0] : '';
  const olderPrefix = remoteJid ? inboxJidKeyPrefixes(remoteJid)[2] : '';

  // Spinner inicial: combina loading local com qualquer aba carregando o initial.
  const remoteInitialLoading = Boolean(remoteJid) && initialPrefix !== '' && isLoadingKey(initialPrefix);
  const remoteOlderLoading = Boolean(remoteJid) && olderPrefix !== '' && isLoadingKey(olderPrefix);

  return {
    messages,
    // Sincronizado: true se a aba local OU outra aba estiver buscando o initial.
    loading: loading || remoteInitialLoading,
    // Mesmo critério para "carregando mais antigas".
    loadingOlder: loadingOlder || remoteOlderLoading,
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
