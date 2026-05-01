/**
 * useEmailSearch.ts — Busca full-text em emails (local + Gmail API)
 *
 * Estratégia dual:
 * 1. Busca local imediata no Supabase (FTS via tsvector) — < 100ms
 * 2. Busca remota na Gmail API para resultados não sincronizados — async
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { gmailListThreads } from './gmail/gmailApi';
import { useDebouncedCallback } from 'use-debounce';

export interface EmailSearchResult {
  id: string;
  thread_id: string;
  subject: string;
  snippet: string;
  from_email: string;
  from_name: string | null;
  last_message_at: string | null;
  unread_count: number;
  source: 'local' | 'remote';
}

const DEBOUNCE_MS = 350;
const MIN_QUERY_LEN = 2;

export function useEmailSearch(accountId: string | null) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<EmailSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const searchLocal = useCallback(async (q: string): Promise<EmailSearchResult[]> => {
    if (!accountId) return [];

    // Normaliza para FTS: substitui espaços por &
    const ftsQuery = q.trim().split(/\s+/).join(' & ');

    const { data, error: dbErr } = await supabase
      .from('gmail_threads')
      .select(`
        id,
        thread_id,
        subject,
        snippet,
        last_message_at,
        unread_count,
        gmail_messages!inner ( from_email, from_name )
      `)
      .eq('account_id', accountId)
      .textSearch('subject', ftsQuery, { config: 'portuguese', type: 'websearch' })
      .order('last_message_at', { ascending: false })
      .limit(20);

    if (dbErr) return [];

    return (data ?? []).map((row: Record<string, unknown>) => {
      const msgs = Array.isArray(row.gmail_messages) ? row.gmail_messages : [];
      const first = (msgs[0] ?? {}) as Record<string, unknown>;
      return {
        id: row.id as string,
        thread_id: row.thread_id as string,
        subject: (row.subject as string) ?? '(sem assunto)',
        snippet: (row.snippet as string) ?? '',
        from_email: (first.from_email as string) ?? '',
        from_name: (first.from_name as string | null) ?? null,
        last_message_at: row.last_message_at as string | null,
        unread_count: (row.unread_count as number) ?? 0,
        source: 'local' as const,
      };
    });
  }, [accountId]);

  const searchRemote = useCallback(async (q: string): Promise<EmailSearchResult[]> => {
    if (!accountId) return [];

    try {
      const res = await gmailListThreads({ accountId, q, maxResults: 10 });
      // Marca resultados remotos para diferenciação visual
      return (res.threads ?? []).map((t: Record<string, unknown>) => ({
        id: String(t.id ?? ''),
        thread_id: String(t.id ?? ''),
        subject: String(t.snippet ?? '').substring(0, 80),
        snippet: String(t.snippet ?? ''),
        from_email: '',
        from_name: null,
        last_message_at: null,
        unread_count: 0,
        source: 'remote' as const,
      }));
    } catch {
      return [];
    }
  }, [accountId]);

  const doSearch = useCallback(async (q: string) => {
    if (!q || q.length < MIN_QUERY_LEN) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    // Cancela busca anterior se ainda em andamento
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setIsSearching(true);
    setError(null);

    try {
      // Fase 1: local imediato
      const local = await searchLocal(q);
      setResults(local);

      // Fase 2: remoto async (adiciona sem substituir local)
      const remote = await searchRemote(q);

      // Deduplica: remove resultados remotos que já vieram do local
      const localThreadIds = new Set(local.map(r => r.thread_id));
      const newRemote = remote.filter(r => !localThreadIds.has(r.thread_id));

      setResults([...local, ...newRemote]);
    } catch {
      setError('Erro ao buscar emails');
    } finally {
      setIsSearching(false);
    }
  }, [searchLocal, searchRemote]);

  const debouncedSearch = useDebouncedCallback(doSearch, DEBOUNCE_MS);

  const handleQueryChange = useCallback((q: string) => {
    setQuery(q);
    debouncedSearch(q);
  }, [debouncedSearch]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setError(null);
    abortRef.current?.abort();
  }, []);

  // Limpa ao desmontar
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  return {
    query,
    results,
    isSearching,
    error,
    handleQueryChange,
    clearSearch,
  };
}
