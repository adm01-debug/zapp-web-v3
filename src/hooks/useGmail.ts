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
import { supabase } from '@/integrations/supabase/client';

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface GmailAccount {
  id:            string;
  user_id:       string;
  email:         string;
  display_name:  string | null;
  is_active:     boolean;
  token_expiry:  string | null;
  watch_expiry:  string | null;
}

export type GmailTokenStatus = 'valid' | 'expiring_soon' | 'expired' | 'no_token';
export type GmailWatchStatus = 'active' | 'expiring_soon' | 'expired' | 'no_watch';

export interface GmailTokenInfo {
  account_id:            string;
  email:                 string;
  is_active:             boolean;
  token_status:          GmailTokenStatus;
  token_expiry:          string | null;
  watch_status:          GmailWatchStatus;
  watch_expiry:          string | null;
  minutes_until_expiry:  number | null;
}

export interface GmailThread {
  id:              string;
  account_id:      string;
  gmail_thread_id: string;
  subject:         string | null;
  snippet:         string | null;
  from_email:      string | null;
  from_name:       string | null;
  label_ids:       string[];
  unread_count:    number;
  message_count:   number;
  is_starred:      boolean;
  is_important:    boolean;
  sla_status:      'ok' | 'warning' | 'breached' | null;
  assigned_to:     string | null;
  last_message_at: string | null;
  first_reply_at:  string | null;
  created_at:      string;
}

export interface GmailSendParams {
  to:          string | string[];
  cc?:         string | string[];
  bcc?:        string | string[];
  subject:     string;
  bodyHtml:    string;
  threadId?:   string;   // Para reply na mesma thread
  inReplyTo?:  string;   // Message-ID para threading
  signature?:  boolean;  // Auto-incluir assinatura
}

type GmailLabel = 'INBOX' | 'SENT' | 'DRAFT' | 'STARRED' | 'IMPORTANT' | 'TRASH' | 'SPAM' | string;

// ── Hook Principal ─────────────────────────────────────────────────────────

export function useGmail() {
  const [accounts, setAccounts]               = useState<GmailAccount[]>([]);
  const [tokenStatus, setTokenStatus]         = useState<GmailTokenInfo[]>([]);
  const [threads, setThreads]                 = useState<GmailThread[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [activeLabel, setActiveLabel]         = useState<GmailLabel>('INBOX');
  const [isLoading, setIsLoading]             = useState(true);
  const [isSyncing, setIsSyncing]             = useState(false);
  const [isSending, setIsSending]             = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [nextPageToken, setNextPageToken]     = useState<string | null>(null);

  const tokenCheckInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Carregar contas Gmail ───────────────────────────────────────────────
  const loadAccounts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: dbErr } = await supabase
        .from('gmail_accounts')
        .select('id, user_id, email, display_name, is_active, token_expiry, watch_expiry')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (dbErr) throw new Error(dbErr.message);

      const accs = data ?? [];
      setAccounts(accs);

      if (accs.length > 0 && !activeAccountId) {
        setActiveAccountId(accs[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [activeAccountId]);

  // ── Verificar status dos tokens ─────────────────────────────────────────
  const checkTokenStatus = useCallback(async () => {
    try {
      const { data, error: rpcErr } = await supabase.rpc('rpc_gmail_token_status');
      if (!rpcErr && data) {
        setTokenStatus(data as GmailTokenInfo[]);
      }
    } catch {
      // Silencia erro de token check — não é crítico
    }
  }, []);

  // ── Carregar threads ────────────────────────────────────────────────────
  const loadThreads = useCallback(async (accountId?: string, label: GmailLabel = 'INBOX', append = false) => {
    const id = accountId ?? activeAccountId;
    if (!id) return;

    try {
      const { data, error: rpcErr } = await supabase.rpc('rpc_gmail_search_threads', {
        p_account_id: id,
        p_query:      null,
        p_label_id:   label,
        p_limit:      50,
        p_offset:     append ? threads.length : 0,
      });

      if (rpcErr) throw new Error(rpcErr.message);
      const newThreads = (data ?? []) as GmailThread[];
      setThreads(prev => append ? [...prev, ...newThreads] : newThreads);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [activeAccountId, threads.length]);

  // ── Sincronizar inbox via gmail-sync ────────────────────────────────────
  const syncNow = useCallback(async (accountId?: string) => {
    const id = accountId ?? activeAccountId;
    if (!id || isSyncing) return;

    setIsSyncing(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('gmail-sync', {
        body: { action: 'syncInbox', accountId: id, maxResults: 100 },
      });

      if (fnErr) throw new Error('Falha ao sincronizar Gmail');

      // Após sincronização, recarregar threads e status de token
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
      const { data, error: fnErr } = await supabase.functions.invoke('gmail-oauth', {
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
      const { data, error: fnErr } = await supabase.functions.invoke('gmail-webhook', {
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
      const { data, error: fnErr } = await supabase.functions.invoke('gmail-send', {
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
          addSignature: params.signature !== false, // Default: incluir assinatura
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
    const { error: rpcErr } = await supabase.rpc('rpc_gmail_mark_thread_read', {
      p_thread_id: threadId,
      p_read:      read,
    });

    if (!rpcErr) {
      setThreads(prev => prev.map(t =>
        t.id === threadId ? { ...t, unread_count: read ? 0 : (t.unread_count || 1) } : t
      ));
    }
  }, []);

  // ── Star/Unstar thread ──────────────────────────────────────────────────
  const starThread = useCallback(async (threadId: string, starred = true) => {
    const { error: rpcErr } = await supabase.rpc('rpc_gmail_star_thread', {
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
    const { error: rpcErr } = await supabase.rpc('rpc_gmail_archive_thread', {
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
    const { error: rpcErr } = await supabase.rpc('rpc_gmail_assign_thread', {
      p_thread_id: threadId,
      p_agent_id:  agentId,
    });

    if (!rpcErr) {
      setThreads(prev => prev.map(t =>
        t.id === threadId ? { ...t, assigned_to: agentId } : t
      ));
    }
  }, []);

  // ── Desconectar conta ───────────────────────────────────────────────────
  const disconnect = useCallback(async (accountId: string) => {
    await supabase
      .from('gmail_accounts')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', accountId);

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
      const { data, error: fnErr } = await supabase.functions.invoke('gmail-oauth', {
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

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: exchangeData, error: exchangeErr } = await supabase.functions.invoke('gmail-oauth', {
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

    const channel = supabase
      .channel(`gmail-threads-${activeAccountId}`)
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table:  'gmail_threads',
        filter: `account_id=eq.${activeAccountId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setThreads(prev => [payload.new as GmailThread, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setThreads(prev => prev.map(t => t.id === (payload.new as GmailThread).id
            ? { ...t, ...(payload.new as GmailThread) }
            : t
          ));
        } else if (payload.eventType === 'DELETE') {
          setThreads(prev => prev.filter(t => t.id !== (payload.old as GmailThread).id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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
    activeAccountId,
    activeAccount,
    activeLabel,
    activeTokenInfo,
    isLoading,
    isSyncing,
    isSending,
    error,
    nextPageToken,
    // Contadores
    unreadCount,
    slaBreachedCount,
    hasTokenWarning,
    hasWatchWarning,
    // Ações de configuração
    setActiveAccountId,
    setActiveLabel,
    // Ações de conta
    startOAuth,
    disconnect,
    refreshToken,
    renewWatch,
    // Ações de sincronização
    syncNow,
    loadAccounts,
    loadMore: () => loadThreads(undefined, activeLabel, true),
    // Ações de thread
    markAsRead,
    starThread,
    archiveThread,
    assignThread,
    // Envio
    sendEmail,
  };
}
