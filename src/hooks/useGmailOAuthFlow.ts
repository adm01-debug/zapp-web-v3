/**
 * useGmailOAuthFlow.ts — OAuth2 Gmail com refresh automático de token
 *
 * Responsabilidades:
 * 1. Iniciar fluxo OAuth (redirect para Google)
 * 2. Trocar code por tokens (Edge Function gmail-oauth)
 * 3. Refresh automático do access_token 5 min antes de expirar
 * 4. Revogar acesso (disconnect)
 * 5. Retornar estado do token (valid | expiring | expired | loading)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase as _supabase } from '@/integrations/supabase/client';
import { gmailMappers } from '@/utils/gmailMappers';
import { GmailAccount } from '@/types/gmail';
const supabase = _supabase as any;
import { gmailRefreshToken, gmailRevokeAccount, gmailRegisterWatch } from './gmail/gmailApi';
import { toast } from 'sonner';
import { getLogger } from '@/lib/logger';

const log = getLogger('useGmailOAuthFlow');

// 5 minutos antes da expiração → refresh proativo
const REFRESH_AHEAD_MS = 5 * 60 * 1000;
// Intervalo de verificação do token
const CHECK_INTERVAL_MS = 60 * 1000;

export type TokenStatus = 'loading' | 'valid' | 'expiring' | 'expired' | 'disconnected';


interface UseGmailOAuthFlowReturn {
  accounts: GmailAccount[];
  tokenStatus: Record<string, TokenStatus>;
  isLoading: boolean;
  startOAuth: () => void;
  disconnect: (accountId: string) => Promise<void>;
  refreshNow: (accountId: string) => Promise<void>;
  ensureWatch: (accountId: string) => Promise<void>;
}

export function useGmailOAuthFlow(): UseGmailOAuthFlowReturn {
  const [accounts, setAccounts] = useState<GmailAccount[]>([]);
  const [tokenStatus, setTokenStatus] = useState<Record<string, TokenStatus>>({});
  const [isLoading, setIsLoading] = useState(true);
  const refreshingRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Carrega contas ──────────────────────────────────────────────────

  const loadAccounts = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from('gmail_accounts')
      .select('id, user_id, email:email_address, display_name, picture_url, token_expiry:token_expires_at, is_active, created_at')
      .eq('is_active', true)
      .order('created_at');

    if (error) {
      log.error('Erro ao carregar contas Gmail', error);
      return;
    }

    setAccounts(gmailMappers.accounts(data ?? []));
    setIsLoading(false);
  }, []);

  // ── Calcula status do token ─────────────────────────────────────────

  const computeStatuses = useCallback((accs: GmailAccount[]) => {
    const now = Date.now();
    const statuses: Record<string, TokenStatus> = {};

    for (const acc of accs) {
      const expiry = new Date(acc.token_expiry).getTime();
      if (expiry < now) {
        statuses[acc.id] = 'expired';
      } else if (expiry - now < REFRESH_AHEAD_MS) {
        statuses[acc.id] = 'expiring';
      } else {
        statuses[acc.id] = 'valid';
      }
    }

    setTokenStatus(statuses);
    return statuses;
  }, []);

  // ── Refresh de token ────────────────────────────────────────────────

  const refreshNow = useCallback(async (accountId: string) => {
    if (refreshingRef.current.has(accountId)) return;
    refreshingRef.current.add(accountId);

    setTokenStatus(prev => ({ ...prev, [accountId]: 'loading' }));

    try {
      const result = await gmailRefreshToken(accountId);

      // Atualiza token_expiry local
      setAccounts(prev =>
        prev.map(a =>
          a.id === accountId
            ? { ...a, token_expiry: (result as any).token_expiry }
            : a
        )
      );
      setTokenStatus(prev => ({ ...prev, [accountId]: 'valid' }));

      log.info(`Token refreshed for account ${accountId}, expires at ${(result as any).token_expiry}`);
    } catch (err) {
      log.error(`Falha ao refreshar token para conta ${accountId}`, err);
      setTokenStatus(prev => ({ ...prev, [accountId]: 'expired' }));
      toast.error('Sessão Gmail expirada', {
        description: 'Reconecte sua conta Gmail nas configurações.',
        duration: 8000,
      });
    } finally {
      refreshingRef.current.delete(accountId);
    }
  }, []);

  // ── Auto-refresh loop ───────────────────────────────────────────────

  const checkAndRefresh = useCallback(async (accs: GmailAccount[]) => {
    const statuses = computeStatuses(accs);

    for (const acc of accs) {
      const status = statuses[acc.id];
      if (status === 'expiring' || status === 'expired') {
        await refreshNow(acc.id);
      }
    }
  }, [computeStatuses, refreshNow]);

  // ── Ensure Pub/Sub watch ────────────────────────────────────────────

  const ensureWatch = useCallback(async (accountId: string) => {
    const acc = accounts.find(a => a.id === accountId);
    if (!acc) return;

    // Renova watch se faltam menos de 24h para expirar
    const watchExpiry = acc.watch_expiry ? new Date(acc.watch_expiry).getTime() : 0;
    const renewThreshold = 24 * 60 * 60 * 1000;

    if (!acc.watch_expiry || watchExpiry - Date.now() < renewThreshold) {
      try {
        const result = await gmailRegisterWatch(accountId);
        setAccounts(prev =>
          prev.map(a =>
            a.id === accountId
              ? { ...a, watch_expiry: (result as any).expiration }
              : a
          )
        );
        log.info(`Pub/Sub watch renovado para ${accountId}, expira em ${(result as any).expiration}`);
      } catch (err) {
        log.warn(`Não foi possível renovar watch para ${accountId}`, err);
      }
    }
  }, [accounts]);

  // ── OAuth initiate ──────────────────────────────────────────────────

  const startOAuth = useCallback(() => {
    // Monta URL de autorização (Edge Function gmail-oauth retorna a URL)
    supabase.functions
      .invoke('gmail-oauth', { body: { action: 'getAuthUrl' } })
      .then(({ data, error }) => {
        if (error || !data?.url) {
          toast.error('Não foi possível iniciar a autenticação Gmail');
          return;
        }
        // Abre popup OAuth
        const popup = window.open(
          data.url,
          'gmail-oauth',
          'width=500,height=600,scrollbars=yes'
        );

        // Listener para message do popup (após callback bem-sucedido)
        const onMessage = (event: MessageEvent) => {
          if (event.data?.type === 'gmail-oauth-success') {
            window.removeEventListener('message', onMessage);
            popup?.close();
            loadAccounts().then(() => {
              toast.success(`Conta Gmail conectada: ${event.data.email}`);
            });
          }
        };
        window.addEventListener('message', onMessage);
      });
  }, [loadAccounts]);

  // ── Disconnect ──────────────────────────────────────────────────────

  const disconnect = useCallback(async (accountId: string) => {
    try {
      await gmailRevokeAccount(accountId);
      setAccounts(prev => prev.filter(a => a.id !== accountId));
      setTokenStatus(prev => {
        const next = { ...prev };
        delete next[accountId];
        return next;
      });
      toast.success('Conta Gmail desconectada');
    } catch (err) {
      log.error('Erro ao desconectar conta Gmail', err);
      toast.error('Não foi possível desconectar a conta Gmail');
    }
  }, []);

  // ── Effects ─────────────────────────────────────────────────────────

  // Carga inicial
  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Realtime: recarregar quando conta muda
  useEffect(() => {
    const channel = supabase
      .channel('gmail_accounts_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gmail_accounts' },
        () => loadAccounts()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadAccounts]);

  // Auto-refresh timer
  useEffect(() => {
    if (accounts.length === 0) return;

    checkAndRefresh(accounts);

    timerRef.current = setInterval(() => {
      checkAndRefresh(accounts);
    }, CHECK_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [accounts, checkAndRefresh]);

  // Ensure Pub/Sub watch para todas as contas ativas
  useEffect(() => {
    for (const acc of accounts) {
      ensureWatch(acc.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts.map(a => a.id).join(',')]);

  return {
    accounts,
    tokenStatus,
    isLoading,
    startOAuth,
    disconnect,
    refreshNow,
    ensureWatch,
  };
}
