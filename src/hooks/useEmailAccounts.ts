
import { useCallback, useEffect, useState } from 'react';
import { supabase as _supabase } from '@/integrations/supabase/client';
import { safeClient } from '@/integrations/supabase/safeClient';
import { UnifiedEmailAccount } from '@/types/gmail';

const supabase = _supabase as any;

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

    const { data, error: dbErr } = await safeClient.from<UnifiedEmailAccount>('v_email_accounts_unified', (q) =>
      q.select('*').order('created_at', { ascending: true })
    );

    if (dbErr) {
      setError(dbErr.message);
    } else {
      setAccounts(data ?? []);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetch();

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
