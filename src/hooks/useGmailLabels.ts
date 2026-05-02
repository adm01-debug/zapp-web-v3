
import { useCallback, useEffect, useState } from 'react';
import { supabase as _supabase } from '@/integrations/supabase/client';
import { safeClient } from '@/integrations/supabase/safeClient';
import { GmailLabelInfo as GmailLabel } from '@/types/gmail';

export type { GmailLabel };

const supabase = _supabase as any;

export const SYSTEM_LABELS: Array<{ id: string; name: string; icon: string; color: string }> = [
  { id: 'INBOX',     name: 'Inbox',     icon: 'inbox',     color: '#1a73e8' },
  { id: 'STARRED',   name: 'Favoritos', icon: 'star',      color: '#f29900' },
  { id: 'IMPORTANT', name: 'Importantes',icon: 'flag',     color: '#e37400' },
  { id: 'SENT',      name: 'Enviados',  icon: 'send',      color: '#34a853' },
  { id: 'DRAFTS',    name: 'Rascunhos', icon: 'draft',     color: '#9e9e9e' },
  { id: 'SPAM',      name: 'Spam',      icon: 'block',     color: '#d93025' },
  { id: 'TRASH',     name: 'Lixeira',   icon: 'delete',    color: '#777777' },
];

export function useGmailLabels(accountId: string | null) {
  const [labels, setLabels]         = useState<GmailLabel[]>([]);
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const loadLabels = useCallback(async () => {
    if (!accountId) return;

    setIsLoading(true);
    setError(null);
    const { data, error: dbErr } = await safeClient.from<GmailLabel>('gmail_labels', (q) =>
      q.select('*').eq('account_id', accountId).order('name', { ascending: true })
    );

    if (dbErr) {
      setError(dbErr.message);
    } else {
      setLabels(data ?? []);
    }
    setIsLoading(false);
  }, [accountId]);

  const syncLabels = useCallback(async () => {
    if (!accountId) return;
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('gmail-sync', {
        body: { action: 'syncLabels', accountId },
      });
      if (!fnErr && data?.success) {
        await loadLabels();
      }
    } catch {
      // ignore
    }
  }, [accountId, loadLabels]);

  const getLabelCount = useCallback(async (labelId: string): Promise<{ thread_count: number; unread_count: number }> => {
    if (!accountId) return { thread_count: 0, unread_count: 0 };

    const { data } = await safeClient.from<any>('gmail_threads', (q) =>
      q.select('id, unread_count').eq('account_id', accountId).contains('label_ids', [labelId])
    );

    const threads = data ?? [];
    return {
      thread_count: threads.length,
      unread_count: threads.reduce((s: number, t: any) => s + (t.unread_count ?? 0), 0),
    };
  }, [accountId]);

  const systemLabels = SYSTEM_LABELS.map(sl => ({
    id:             `system-${sl.id}`,
    account_id:     accountId ?? '',
    gmail_label_id: sl.id,
    name:           sl.name,
    type:           'system' as const,
    color:          sl.color,
  }));

  const userLabels = labels.filter(l => l.type === 'user');
  const allLabels = [...systemLabels, ...userLabels];

  useEffect(() => {
    if (accountId) loadLabels();
  }, [accountId, loadLabels]);

  return {
    labels,
    userLabels,
    systemLabels,
    allLabels,
    isLoading,
    error,
    loadLabels,
    syncLabels,
    getLabelCount,
    SYSTEM_LABELS,
  };
}
