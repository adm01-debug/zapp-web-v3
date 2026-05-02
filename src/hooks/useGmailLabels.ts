/**
 * useGmailLabels.ts — Gerenciamento de labels/pastas Gmail
 *
 * Permite listar, criar e sincronizar labels do Gmail.
 * Labels são usadas para filtrar threads por categoria.
 *
 * Labels do sistema sempre presentes:
 *   INBOX, SENT, DRAFTS, STARRED, IMPORTANT, TRASH, SPAM
 *
 * Labels customizadas são gerenciadas via gmail-sync.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GmailLabel {
  id:           string;
  account_id:   string;
  gmail_label_id: string;
  name:         string;
  type:         'system' | 'user';
  color?:       string | null;
  thread_count?: number;
  unread_count?: number;
}

// Labels do sistema com ícones e cores padrão
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

  // Carregar labels da DB
  const loadLabels = useCallback(async () => {
    if (!accountId) return;

    setIsLoading(true);
    setError(null);
    try {
      const { data, error: dbErr } = await supabase
        .from('gmail_labels')
        .select('*')
        .eq('account_id', accountId)
        .order('name', { ascending: true });

      if (dbErr) throw new Error(dbErr.message);
      setLabels(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [accountId]);

  // Sincronizar labels via gmail-sync
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
      // Labels sync é best-effort
    }
  }, [accountId, loadLabels]);

  // Contar threads por label (query ao banco)
  const getLabelCount = useCallback(async (labelId: string): Promise<{ thread_count: number; unread_count: number }> => {
    if (!accountId) return { thread_count: 0, unread_count: 0 };

    const { data, error } = await supabase
      .from('gmail_threads')
      .select('id, unread_count')
      .eq('account_id', accountId)
      .contains('label_ids', [labelId]);

    const threads = data ?? [];
    return {
      thread_count: threads.length,
      unread_count: threads.reduce((s, t) => s + (t.unread_count ?? 0), 0),
    };
  }, [accountId]);

  // Labels do sistema enriquecidas com info local
  const systemLabels = SYSTEM_LABELS.map(sl => ({
    id:             `system-${sl.id}`,
    account_id:     accountId ?? '',
    gmail_label_id: sl.id,
    name:           sl.name,
    type:           'system' as const,
    color:          sl.color,
  }));

  // Labels customizadas do usuário
  const userLabels = labels.filter(l => l.type === 'user');

  // Todas as labels em ordem: sistema primeiro, depois custom
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
