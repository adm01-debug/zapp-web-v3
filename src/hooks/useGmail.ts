/**
 * useGmail.ts — Hook principal de gerenciamento Gmail
 *
 * Funcionalidades completas:
 * - Carrega contas Gmail ativas
 * - Monitora status de tokens via rpc_gmail_token_status
 * - Sincronização via gmail-sync Edge Function
 * - Carrega threads com filtro de label
 * - Star/unstar, archive, assign a agente
 * - Marcar como lida/não lida
 * - Envio de emails via gmail-send
 * - Realtime subscription nas threads
 * - Refresh automático de tokens expirados
 * - Watch renewal check
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase as _supabase } from '@/integrations/supabase/client';
import { safeClient } from '@/integrations/supabase/safeClient';
import { gmailMappers } from '@/utils/gmailMappers';
import { type GmailMessage } from './gmail/gmailTypes';
import { 
  GmailAccount, 
  GmailTokenInfo, 
  GmailThread, 
  GmailSendParams,
  GmailLabel,
  EmailThread,
  SLAStatus
} from '@/types/gmail';

export type { 
  GmailAccount, 
  GmailTokenInfo, 
  GmailThread, 
  GmailSendParams,
  GmailLabel,
  EmailThread,
  SLAStatus
};

export type GmailTokenStatus = 'valid' | 'expiring_soon' | 'expired' | 'no_token';
export type GmailWatchStatus = 'active' | 'expiring_soon' | 'expired' | 'no_watch';
export type TokenStatus = GmailTokenStatus;

const supabase = _supabase as any;

// ── Hook Principal ─────────────────────────────────────────────────────────

export function useGmail() {
  const [accounts, setAccounts]               = useState<GmailAccount[]>([]);
  const [tokenStatus, setTokenStatus]         = useState<GmailTokenInfo[]>([]);
  const [threads, setThreads]                 = useState<GmailThread[]>([]);
  const [selectedThread, setSelectedThread]   = useState<GmailThread | null>(null);
  const [messages, setMessages]               = useState<GmailMessage[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [activeLabel, setActiveLabel]         = useState<GmailLabel>('INBOX');
  const [isLoading, setIsLoading]             = useState(true);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSyncing, setIsSyncing]             = useState(false);
  const [isSending, setIsSending]             = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [lastRequestId, setLastRequestId]     = useState<string | null>(null);
  const [schemaStatus, setSchemaStatus]       = useState<{ ok: boolean; lastChecked: Date | null }>({ ok: true, lastChecked: null });
  const [nextPageToken, setNextPageToken]     = useState<string | null>(null);
  const [hasMore, setHasMore]                 = useState(false);

  const tokenCheckInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Carregar contas Gmail ───────────────────────────────────────────────
  const loadAccounts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    const { data, error: dbErr, requestId } = await safeClient.from('gmail_accounts', (q) => 
      q.select('id, user_id, email, display_name, is_active, token_expiry, watch_expiry')
       .eq('is_active', true)
       .order('created_at', { ascending: true })
    );

    if (dbErr) {
      setLastRequestId(requestId || null);
      setSchemaStatus({ ok: !dbErr.message.includes('disponível'), lastChecked: new Date() });
      console.warn(`[useGmail][${requestId}] Falha ao carregar contas:`, dbErr.message);
      setError(`Não foi possível carregar as contas Gmail. ${dbErr.message || ''} ${dbErr.message.includes('disponível') ? 'O recurso ainda está sendo configurado.' : ''}`);
    } else {
      setSchemaStatus({ ok: true, lastChecked: new Date() });
      const accs = gmailMappers.accounts(Array.isArray(data) ? data : []);
      setAccounts(accs);
      if (accs.length > 0 && !activeAccountId) {
        setActiveAccountId(accs[0].id);
      }
    }
    setIsLoading(false);
  }, [activeAccountId]);

  // ── Verificar status dos tokens ─────────────────────────────────────────
  const checkTokenStatus = useCallback(async () => {
    const { data, error: rpcErr, requestId } = await safeClient.rpc('rpc_gmail_token_status');
    if (!rpcErr && data) {
      const tokenInfos = gmailMappers.tokenInfos(Array.isArray(data) ? data : []);
      setTokenStatus(tokenInfos);
      
      const statusMap: Record<string, string> = {};
      tokenInfos.forEach(s => {
        statusMap[s.account_id] = s.token_status;
      });
      (setTokenStatus as any).asMap = statusMap;
    }
  }, []);

  // ── Carregar threads ────────────────────────────────────────────────────
  const loadThreads = useCallback(async (accountId?: string, label: GmailLabel = 'INBOX', append = false) => {
    const id = accountId ?? activeAccountId;
    if (!id) return;

    setIsLoadingThreads(true);
    const { data, error: rpcErr, requestId } = await safeClient.rpc('rpc_gmail_search_threads', {
      p_account_id: id,
      p_query:      null,
      p_label_id:   label,
      p_limit:      50,
      p_offset:     append ? threads.length : 0,
    });

    if (rpcErr) {
      setLastRequestId(requestId || null);
      setSchemaStatus({ ok: !rpcErr.message.includes('disponível'), lastChecked: new Date() });
      console.warn(`[useGmail][${requestId}] Falha ao buscar threads:`, rpcErr.message);
      setError(`Erro ao carregar mensagens do Gmail. ${rpcErr.message.includes('disponível') ? 'A funcionalidade está sendo ativada.' : ''}`);
    } else {
      setSchemaStatus({ ok: true, lastChecked: new Date() });
      const mappedThreads = gmailMappers.threads(Array.isArray(data) ? data : []);
      setThreads(prev => append ? [...prev, ...mappedThreads] : mappedThreads);
      setHasMore(mappedThreads.length === 50);
    }
    setIsLoadingThreads(false);
  }, [activeAccountId, threads.length]);

  // ── Carregar mensagens de uma thread ────────────────────────────────────
  const loadMessages = useCallback(async (threadId: string) => {
    setIsLoadingMessages(true);
    const { data, error: dbErr } = await safeClient.from('gmail_messages', (q) =>
      q.select('*')
       .eq('thread_id', threadId)
       .order('date', { ascending: true })
    );

    if (dbErr) {
      const rid = (dbErr as any).requestId || 'N/A';
      console.error(`[useGmail][${rid}] Erro ao carregar mensagens:`, dbErr);
    } else {
      setMessages(Array.isArray(data) ? data : []);
    }
    setIsLoadingMessages(false);
  }, []);

  // ── Selecionar thread ────────────────────────────────────────────────────
  const selectThread = useCallback(async (thread: GmailThread | null) => {
    setSelectedThread(thread);
    if (thread) {
      await loadMessages(thread.id);
    } else {
      setMessages([]);
    }
  }, [loadMessages]);

  // ── Carregar mais threads (Paginação) ───────────────────────────────────
  const loadMore = useCallback(async () => {
    if (hasMore && !isLoadingThreads) {
      await loadThreads(activeAccountId || undefined, activeLabel, true);
    }
  }, [hasMore, isLoadingThreads, activeAccountId, activeLabel, loadThreads]);

  // ── Sincronizar inbox via gmail-sync ────────────────────────────────────
  const syncNow = useCallback(async (accountId?: string) => {
    const id = accountId ?? activeAccountId;
    if (!id || isSyncing) return;

    setIsSyncing(true);
    setError(null);
    try {
      const { data, error: fnErr } = await (supabase as any).functions.invoke('gmail-sync', {
        body: { action: 'syncInbox', accountId: id, maxResults: 100 },
      });

      if (fnErr) throw new Error('Falha ao sincronizar Gmail');

      await Promise.all([
        loadThreads(id, activeLabel),
        checkTokenStatus(),
      ]);

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSyncing(false);
    }
  }, [activeAccountId, isSyncing, activeLabel, loadThreads, checkTokenStatus]);

  // ── Renovar token manualmente ───────────────────────────────────────────
  const refreshToken = useCallback(async (accountId?: string) => {
    const id = accountId ?? activeAccountId;
    if (!id) return;

    try {
      const { data, error: fnErr } = await (supabase as any).functions.invoke('gmail-oauth', {
        body: { action: 'refreshToken', accountId: id },
      });

      if (fnErr || !data?.success) {
        setError('Token expirado — reconecte sua conta Gmail nas configurações.');
        return false;
      }

      await checkTokenStatus();
      return true;
    } catch {
      return false;
    }
  }, [activeAccountId, checkTokenStatus]);

  // ── Renovar Pub/Sub watch ───────────────────────────────────────────────
  const renewWatch = useCallback(async (accountId?: string) => {
    const id = accountId ?? activeAccountId;
    if (!id) return;

    try {
      const { data, error: fnErr } = await (supabase as any).functions.invoke('gmail-webhook', {
        body: { action: 'renewWatch', accountId: id },
      });

      if (!fnErr && data?.success) {
        await checkTokenStatus();
      }
    } catch {
      // Watch renewal é best-effort
    }
  }, [activeAccountId, checkTokenStatus]);

  // ── Enviar email ────────────────────────────────────────────────────────
  const sendEmail = useCallback(async (params: GmailSendParams): Promise<{ success: boolean; error?: string }> => {
    if (!activeAccountId) return { success: false, error: 'Nenhuma conta Gmail ativa' };

    setIsSending(true);
    try {
      const { data, error: fnErr } = await (supabase as any).functions.invoke('gmail-send', {
        body: {
          action: 'send',
          accountId: activeAccountId,
          to:       Array.isArray(params.to) ? params.to : [params.to],
          cc:       params.cc ? (Array.isArray(params.cc) ? params.cc : [params.cc]) : undefined,
          bcc:      params.bcc ? (Array.isArray(params.bcc) ? params.bcc : [params.bcc]) : undefined,
          subject:  params.subject,
          body:     params.bodyHtml,
          threadId: params.threadId,
          inReplyTo: params.inReplyTo,
          addSignature: params.signature !== false,
        },
      });

      if (fnErr || !data?.success) return { success: false, error: 'Falha ao enviar email' };
      return { success: true };
    } finally {
      setIsSending(false);
    }
  }, [activeAccountId]);

  // ── Marcar thread como lida/não lida ───────────────────────────────────
  const markAsRead = useCallback(async (threadId: string, read = true) => {
    const { error: rpcErr, requestId } = await safeClient.rpc('rpc_gmail_mark_thread_read', {
      p_thread_id: threadId,
      p_read:      read,
      p_message_ids: null
    } as any);

    if (!rpcErr) {
      setThreads(prev => prev.map(t =>
        t.id === threadId ? { ...t, unread_count: read ? 0 : (t.unread_count || 1) } : t
      ));
    }
  }, []);

  // ── Star/Unstar thread ──────────────────────────────────────────────────
  const starThread = useCallback(async (threadId: string, starred = true) => {
    const { error: rpcErr, requestId } = await safeClient.rpc('rpc_gmail_star_thread', {
      p_thread_id: threadId,
      p_starred:   starred,
    });

    if (!rpcErr) {
      setThreads(prev => prev.map(t =>
        t.id === threadId ? { ...t, is_starred: starred } : t
      ));
    }
  }, []);

  // ── Archive thread ──────────────────────────────────────────────────────
  const archiveThread = useCallback(async (threadId: string) => {
    const { error: rpcErr, requestId } = await safeClient.rpc('rpc_gmail_archive_thread', {
      p_thread_id: threadId,
      p_archived:  true,
    });

    if (!rpcErr) {
      // Remover da inbox atual
      setThreads(prev => prev.filter(t => t.id !== threadId));
    }
  }, []);

  // ── Assign thread a agente ──────────────────────────────────────────────
  const assignThread = useCallback(async (threadId: string, agentId: string | null) => {
    const { error: rpcErr, requestId } = await safeClient.rpc('rpc_gmail_assign_thread', {
      p_thread_id: threadId,
      p_agent_id:  agentId,
    });

    if (!rpcErr) {
      setThreads(prev => prev.map(t =>
        t.id === threadId ? { ...t, assigned_to: agentId } : t
      ));
    } else {
      console.warn(`[useGmail][${requestId}] Falha ao atribuir thread:`, rpcErr.message);
    }
  }, []);

  // ── Desconectar conta ───────────────────────────────────────────────────
  const disconnect = useCallback(async (accountId: string) => {
    const { requestId, error: dbErr } = await safeClient.from('gmail_accounts', (q) =>
      q.update({ is_active: false, updated_at: new Date().toISOString() })
       .eq('id', accountId)
    );

    setAccounts(prev => prev.filter(a => a.id !== accountId));
    if (activeAccountId === accountId) {
      setActiveAccountId(null);
      setThreads([]);
    }
  }, [activeAccountId]);

  // ── OAuth: iniciar fluxo de conexão ────────────────────────────────────
  const startOAuth = useCallback(async () => {
    setError(null);
    try {
      const { data, error: fnErr } = await (supabase as any).functions.invoke('gmail-oauth', {
        body: { action: 'getAuthUrl' },
      });

      if (fnErr || !data?.authUrl) {
        setError('Erro ao obter URL de autorização Google. Verifique GOOGLE_CLIENT_ID.');
        return;
      }

      const popup = window.open(data.authUrl, 'gmail_oauth', 'width=500,height=600,scrollbars=yes');
      if (!popup) {
        setError('Popup bloqueado. Permita popups para este site.');
        return;
      }

      // Escutar callback do popup
      const handler = async (event: MessageEvent) => {
        if (event.data?.type !== 'gmail_oauth_callback') return;
        window.removeEventListener('message', handler);

        const { code } = event.data;
        if (!code) return;

        const { data: { user } } = await (supabase as any).auth.getUser();
        if (!user) return;

        const { data: exchangeData, error: exchangeErr } = await (supabase as any).functions.invoke('gmail-oauth', {
          body: { action: 'exchangeCode', code, userId: user.id },
        });

        if (exchangeErr || !exchangeData?.success) {
          setError('Falha na autenticação Google. Tente novamente.');
          return;
        }

        await loadAccounts();
        await checkTokenStatus();
      };

      window.addEventListener('message', handler);

    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [loadAccounts, checkTokenStatus]);

  // ── Realtime subscription nas threads ──────────────────────────────────
  useEffect(() => {
    if (!activeAccountId) return;

    const channel = (supabase as any)
      .channel(`gmail-threads-${activeAccountId}`)
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table:  'gmail_threads',
        filter: `account_id=eq.${activeAccountId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const nt = { ...(payload.new as GmailThread), thread_id: (payload.new as any).gmail_thread_id, is_unread: (payload.new as any).unread_count > 0 };
          setThreads(prev => [nt, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setThreads(prev => prev.map(t => t.id === (payload.new as GmailThread).id
            ? { ...t, ...(payload.new as GmailThread), thread_id: (payload.new as any).gmail_thread_id, is_unread: (payload.new as any).unread_count > 0 }
            : t
          ));
        } else if (payload.eventType === 'DELETE') {
          setThreads(prev => prev.filter(t => t.id !== (payload.old as GmailThread).id));
        }
      })
      .subscribe();

    return () => { (supabase as any).removeChannel(channel); };
  }, [activeAccountId]);

  // ── Token check automático (a cada 5 minutos) ───────────────────────────
  useEffect(() => {
    checkTokenStatus();

    tokenCheckInterval.current = setInterval(() => {
      checkTokenStatus();
    }, 5 * 60 * 1000); // 5 minutos

    return () => {
      if (tokenCheckInterval.current) clearInterval(tokenCheckInterval.current);
    };
  }, [checkTokenStatus]);

  // ── Carregar ao montar ──────────────────────────────────────────────────
  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // ── Carregar threads quando muda conta ou label ─────────────────────────
  useEffect(() => {
    if (activeAccountId) {
      loadThreads(activeAccountId, activeLabel);
    }
  }, [activeAccountId, activeLabel]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Computed ────────────────────────────────────────────────────────────
  const unreadCount = threads.reduce((sum, t) => sum + (t.unread_count ?? 0), 0);
  const slaBreachedCount = threads.filter(t => t.sla_status === 'breached').length;
  const activeAccount = accounts.find(a => a.id === activeAccountId) ?? null;
  const activeTokenInfo = tokenStatus.find(t => t.account_id === activeAccountId) ?? null;
  const hasTokenWarning = activeTokenInfo?.token_status === 'expiring_soon' || activeTokenInfo?.token_status === 'expired';
  const hasWatchWarning = activeTokenInfo?.watch_status === 'expiring_soon' || activeTokenInfo?.watch_status === 'expired';

  return {
    // Estado
    accounts,
    tokenStatus,
    threads,
    selectedThread,
    messages,
    activeAccountId,
    activeAccount,
    activeLabel,
    activeTokenInfo,
    isLoading,
    isLoadingThreads,
    isLoadingMessages,
    isSyncing,
    isSending,
    hasMore,
    error,
    lastRequestId,
    schemaStatus,
    nextPageToken,
    // Contadores
    unreadCount,
    slaBreachedCount,
    hasTokenWarning,
    hasWatchWarning,
    // Ações de configuração
    setActiveAccountId,
    setActiveLabel,
    selectThread,
    loadMore,
    // Ações de conta
    startOAuth,
    disconnect,
    syncNow,
    refreshToken,
    renewWatch,
    // Ações de thread
    sendEmail,
    markAsRead,
    starThread,
    archiveThread,
    assignThread,
  };
}
