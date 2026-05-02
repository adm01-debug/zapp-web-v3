/**
 * useContactSearch.ts — v2.0
 * Full-text search hook for contacts using search_contacts() RPC.
 * Features:
 * - FTS (tsvector) with unaccent support
 * - Trigram fallback for partial matching
 * - Debounced search (400ms)
 * - Abort on new query
 * - XSS prevention via sanitizeForSearch
 */
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeForSearch } from '@/lib/sanitize';
import { dbFrom } from '@/integrations/datasource/db';

export interface SearchResult {
  id:           string;
  remote_jid:   string;
  phone_number: string | null;
  full_name:    string | null;
  push_name:    string | null;
  email:        string | null;
  company:      string | null;
  lead_status:  string;
  lead_score:   number;
  tags:         string[];
  rank:         number;
}

export interface ContactSearchOptions {
  instanceName?: string;
  leadStatus?:   string | null;
  limit?:        number;
  debounceMs?:   number;
}

export function useContactSearch(options: ContactSearchOptions = {}) {
  const {
    instanceName = 'wpp2',
    leadStatus   = null,
    limit        = 20,
    debounceMs   = 400,
  } = options;

  const [results,   setResults]   = useState<SearchResult[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [query,     setQuery]     = useState('');
  const timerRef   = useRef<ReturnType<typeof setTimeout>>();
  const abortRef   = useRef<AbortController | null>(null);

  const mapRow = (row: Record<string, unknown>): SearchResult => ({
    id:           String(row.id ?? ''),
    remote_jid:   String(row.remote_jid ?? ''),
    phone_number: row.phone_number as string | null,
    full_name:    row.full_name as string | null,
    push_name:    row.push_name as string | null,
    email:        row.email as string | null,
    company:      row.company as string | null,
    lead_status:  String(row.lead_status ?? 'novo'),
    lead_score:   Number(row.lead_score ?? 0),
    tags:         Array.isArray(row.tags) ? row.tags as string[] : [],
    rank:         Number(row.rank ?? 0),
  });

  const search = useCallback((rawQuery: string) => {
    setQuery(rawQuery);

    // Clear previous debounce
    clearTimeout(timerRef.current);

    if (!rawQuery.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    timerRef.current = setTimeout(async () => {
      // Cancel previous request
      abortRef.current?.abort();
      const abort = new AbortController();
      abortRef.current = abort;

      const sanitized = sanitizeForSearch(rawQuery);
      if (!sanitized) { setResults([]); return; }

      setLoading(true);

      try {
        // Primary: FTS with unaccent via RPC
        const { data, error } = await supabase.rpc('search_contacts', {
          p_query:         sanitized,
          p_instance_name: instanceName,
          p_lead_status:   leadStatus ?? null,
          p_limit:         limit,
          p_offset:        0,
        });

        if (abort.signal.aborted) return;

        if (error) {
          // Fallback: direct ilike search
          const { data: fallback } = await dbFrom('contacts')
            .select('id,remote_jid,phone_number,full_name,push_name,email,company,lead_status,lead_score,tags')
            .is('deleted_at', null)
            .eq('instance_name', instanceName)
            .or(`full_name.ilike.%${sanitized}%,push_name.ilike.%${sanitized}%,phone_number.ilike.%${sanitized}%,email.ilike.%${sanitized}%`)
            .limit(limit);

          if (!abort.signal.aborted) {
            setResults((fallback ?? []).map((row) => mapRow({ ...row, rank: 0 })));
          }
        } else {
          setResults((data ?? []).map(mapRow));
        }
      } catch (err) {
        if (!abort.signal.aborted) {
          console.error('[useContactSearch]', err);
        }
      } finally {
        if (!abort.signal.aborted) setLoading(false);
      }
    }, debounceMs);
  }, [instanceName, leadStatus, limit, debounceMs]);

  const clearSearch = useCallback(() => {
    clearTimeout(timerRef.current);
    abortRef.current?.abort();
    setQuery('');
    setResults([]);
    setLoading(false);
  }, []);

  return { results, loading, query, search, clearSearch };
}

export default useContactSearch;
