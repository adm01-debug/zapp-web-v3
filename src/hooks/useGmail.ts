import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGmailOAuthFlow } from './useGmailOAuthFlow';
import { gmailSyncAccount } from './gmail/gmailApi';
import { type GmailThread, type GmailMessage } from './gmail/gmailTypes';
import { toast } from 'sonner';
import { getLogger } from '@/lib/logger';

const log = getLogger('useGmail');
const PAGE_SIZE = 20;

interface UseGmailReturn {
  threads: GmailThread[];
  selectedThread: GmailThread | null;
  messages: GmailMessage[];
  isLoadingThreads: boolean;
  isLoadingMessages: boolean;
  isSyncing: boolean;
  hasMore: boolean;
  error: string | null;
  activeAccountId: string | null;
  accounts: ReturnType<typeof useGmailOAuthFlow>['accounts'];
  tokenStatus: ReturnType<typeof useGmailOAuthFlow>['tokenStatus'];
  selectThread: (thread: GmailThread | null) => void;
  setActiveAccountId: (id: string | null) => void;
  syncNow: () => Promise<void>;
  loadMore: () => void;
  startOAuth: () => void;
  disconnect: (accountId: string) => Promise<void>;
}

export function useGmail(): UseGmailReturn {
  const {
    accounts,
    tokenStatus,
    startOAuth,
    disconnect,
  } = useGmailOAuthFlow();

  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [threads, setThreads] = useState<GmailThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<GmailThread | null>(null);
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Define conta ativa ao carregar
  useEffect(() => {
    if (!activeAccountId && accounts.length > 0) {
      setActiveAccountId(accounts[0].id);
    }
  }, [accounts, activeAccountId]);

  // Carrega threads do Supabase
  const loadThreads = useCallback(async (accountId: string, pageNum = 0, replace = true) => {
    setIsLoadingThreads(true);
    setError(null);

    const { data, error: dbErr, count } = await supabase
      .from('gmail_threads')
      .select('*, gmail_messages(id, from_email, from_name, is_read, is_sent, internal_date, snippet)', { count: 'exact' })
      .eq('account_id', accountId)
      .order('last_message_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    setIsLoadingThreads(false);

    if (dbErr) { setError(dbErr.message); return; }

    const rows = (data ?? []) as GmailThread[];
    setThreads(prev => replace ? rows : [...prev, ...rows]);
    setHasMore((count ?? 0) > (pageNum + 1) * PAGE_SIZE);
  }, []);

  // Carrega mensagens de uma thread
  const loadMessages = useCallback(async (thread: GmailThread) => {
    setIsLoadingMessages(true);
    const { data, error: dbErr } = await supabase
      .from('gmail_messages')
      .select('*, gmail_attachments(*)')
      .eq('thread_id_ref', thread.id)
      .order('internal_date', { ascending: true });

    setIsLoadingMessages(false);
    if (dbErr) return;
    setMessages((data ?? []) as GmailMessage[]);

    // Marcar todas as mensagens como lidas
    const unread = (data ?? []).filter((m: GmailMessage) => !m.is_read);
    if (unread.length > 0 && thread.account_id) {
      await supabase
        .from('gmail_messages')
        .update({ is_read: true })
        .in('id', unread.map((m: GmailMessage) => m.id));

      // Atualiza unread_count da thread
      await supabase
        .from('gmail_threads')
        .update({ unread_count: 0 })
        .eq('id', thread.id);

      // Atualiza localmente
      setThreads(prev => prev.map(t => t.id === thread.id ? { ...t, unread_count: 0 } : t));
    }
  }, []);

  // Sincroniza com Gmail API
  const syncNow = useCallback(async () => {
    if (!activeAccountId || isSyncing) return;
    setIsSyncing(true);
    try {
      await gmailSyncAccount({ accountId: activeAccountId });
      await loadThreads(activeAccountId, 0, true);
      setPage(0);
      toast.success('Inbox sincronizado');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao sincronizar';
      toast.error(msg);
      log.error('Sync failed', err);
    } finally {
      setIsSyncing(false);
    }
  }, [activeAccountId, isSyncing, loadThreads]);

  // Seleciona thread e carrega mensagens
  const selectThread = useCallback((thread: GmailThread | null) => {
    setSelectedThread(thread);
    if (thread) loadMessages(thread);
    else setMessages([]);
  }, [loadMessages]);

  // Load more (infinite scroll)
  const loadMore = useCallback(() => {
    if (!activeAccountId || isLoadingThreads || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadThreads(activeAccountId, nextPage, false);
  }, [activeAccountId, isLoadingThreads, hasMore, page, loadThreads]);

  // Carrega quando muda a conta
  useEffect(() => {
    if (!activeAccountId) return;
    setPage(0);
    setSelectedThread(null);
    setMessages([]);
    loadThreads(activeAccountId, 0, true);
  }, [activeAccountId, loadThreads]);

  // Realtime: novos emails e updates de threads
  useEffect(() => {
    if (!activeAccountId) return;

    const channel = supabase
      .channel(`gmail_realtime_${activeAccountId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gmail_threads',
          filter: `account_id=eq.${activeAccountId}`,
        },
        payload => {
          const newThread = payload.new as GmailThread;
          setThreads(prev => {
            const exists = prev.some(t => t.id === newThread.id);
            if (exists) return prev;
            toast.info(`Novo email: ${newThread.subject ?? '(sem assunto)'}`, { duration: 4000 });
            return [newThread, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'gmail_threads',
          filter: `account_id=eq.${activeAccountId}`,
        },
        payload => {
          const updated = payload.new as GmailThread;
          setThreads(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gmail_messages',
          filter: `account_id=eq.${activeAccountId}`,
        },
        payload => {
          const newMsg = payload.new as GmailMessage;
          // Se thread selecionada, adiciona a mensagem
          setMessages(prev => {
            if (!selectedThread) return prev;
            const exists = prev.some(m => m.id === newMsg.id);
            if (exists || newMsg.thread_id_ref !== selectedThread.id) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeAccountId, selectedThread]);

  return {
    threads,
    selectedThread,
    messages,
    isLoadingThreads,
    isLoadingMessages,
    isSyncing,
    hasMore,
    error,
    activeAccountId,
    accounts,
    tokenStatus,
    selectThread,
    setActiveAccountId,
    syncNow,
    loadMore,
    startOAuth,
    disconnect,
  };
}
