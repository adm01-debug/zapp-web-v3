/**
 * useEmailAccounts.ts — Gerencia todas as contas de email unificadas
 *
 * Agrega Gmail (Google OAuth2) + Outlook (Microsoft Graph API) + IMAP genérico
 * em uma única interface. Usa a view v_email_accounts_unified do Supabase.
 *
 * Usado pelo Email Chat para mostrar todas as contas disponíveis
 * independente do provedor.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type EmailProvider = 'gmail' | 'outlook' | 'yahoo' | 'custom';

export interface UnifiedEmailAccount {
  account_id:      string;
  user_id:         string;
  email:           string;
  display_name:    string;
  provider:        EmailProvider;
  auth_method:     string;
  is_active:       boolean;
  token_expired:   boolean;
  unread_threads:  number;
  sla_breached:    number;
  created_at:      string;
}

interface UseEmailAccountsReturn {
  accounts:         UnifiedEmailAccount[];
  isLoading:        boolean;
  error:            string | null;
  totalUnread:      number;
  totalSlaBreached: number;
  hasGmail:         boolean;
  hasOutlook:       boolean;
  refresh:          () => Promise<void>;
}

export function useEmailAccounts(): UseEmailAccountsReturn {
  const [accounts, setAccounts]   = useState<UnifiedEmailAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: dbErr } = await supabase
        .from('v_email_accounts_unified')
        .select('*')
        .order('created_at', { ascending: true });

      if (dbErr) throw new Error(dbErr.message);
      setAccounts((data ?? []) as UnifiedEmailAccount[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();

    // Realtime: recarrega quando contas mudam
    const channel = supabase
      .channel('email-accounts-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'gmail_accounts',
      }, fetch)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'imap_smtp_accounts',
      }, fetch)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetch]);

  const totalUnread      = accounts.reduce((s, a) => s + (a.unread_threads ?? 0), 0);
  const totalSlaBreached = accounts.reduce((s, a) => s + (a.sla_breached ?? 0), 0);
  const hasGmail         = accounts.some(a => a.provider === 'gmail');
  const hasOutlook       = accounts.some(a => a.provider === 'outlook');

  return {
    accounts,
    isLoading,
    error,
    totalUnread,
    totalSlaBreached,
    hasGmail,
    hasOutlook,
    refresh: fetch,
  };
}
