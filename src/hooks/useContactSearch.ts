/**
 * useContactSearch.ts
 * Debounced contact search using the search_contacts() RPC.
 * Uses materialized tsvector + unaccent — finds "José" with "jose".
 *
 * Uses the optimized search_contacts() RPC instead of
 * client-side ILIKE for better performance on 100k+ contacts.
 */
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeText } from '@/lib/sanitize';
import { type Contact } from '@/hooks/useContacts';

interface SearchResult {
  id:             string;
  remote_jid:     string;
  phone_number:   string | null;
  full_name:      string | null;
  push_name:      string | null;
  email:          string | null;
  company:        string | null;
  tags:           string[];
  lead_status:    string;
  lead_score:     number;
  last_message_at:string | null;
  profile_pic_url:string | null;
  rank:           number;
}

interface Options {
  instanceName?:  string;
  leadStatus?:    string | null;
  limit?:         number;
  debounceMs?:    number;
  minLength?:     number;
}

export function useContactSearch({
  instanceName = 'wpp2',
  leadStatus,
  limit = 10,
  debounceMs = 350,
  minLength = 2,
}: Options = {}) {
  const [results,  setResults]  = useState<SearchResult[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [query,    setQuery]    = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
    clearTimeout(debounceRef.current);

    if (!searchQuery.trim() || searchQuery.trim().length < minLength) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('search_contacts', {
          p_query:         searchQuery.trim(),
          p_instance_name: instanceName,
          p_lead_status:   leadStatus ?? null,
          p_limit:         limit,
          p_offset:        0,
        });

        if (error) throw error;
        setResults((data ?? []) as SearchResult[]);
      } catch (err) {
        console.error('[useContactSearch]', err);
        // Fallback to simple ilike
        try {
          const safe = sanitizeText(searchQuery.trim());
          const { data: fallback } = await supabase
            .from('evolution_contacts')
            .select('id,remote_jid,phone_number,full_name,push_name,email,company,tags,lead_status,lead_score,last_message_at,profile_picture_url')
            .is('deleted_at', null)
            .eq('instance_name', instanceName)
            .or(`full_name.ilike.%${safe}%,phone_number.ilike.%${safe}%,email.ilike.%${safe}%`)
            .limit(limit);

          setResults((fallback ?? []).map((c) => ({
            ...c,
            phone_number:    c.phone_number as string | null,
            full_name:       c.full_name as string | null,
            push_name:       c.push_name as string | null,
            email:           c.email as string | null,
            company:         c.company as string | null,
            tags:            Array.isArray(c.tags) ? c.tags as string[] : [],
            lead_status:     String(c.lead_status ?? 'novo'),
            lead_score:      Number(c.lead_score ?? 0),
            last_message_at: c.last_message_at as string | null,
            profile_pic_url: c.profile_picture_url as string | null,
            rank:            0.5,
          })));
        } catch { setResults([]); }
      } finally {
        setLoading(false);
      }
    }, debounceMs);
  }, [instanceName, leadStatus, limit, debounceMs, minLength]);

  const clear = useCallback(() => {
    clearTimeout(debounceRef.current);
    setResults([]);
    setQuery('');
  }, []);

  return { results, loading, query, search, clear };
}

/**
 * Convert a SearchResult to a Contact type.
 * Useful when you need to pass search results to components expecting Contact.
 */
export function searchResultToContact(r: SearchResult): Partial<Contact> {
  return {
    id:              r.id,
    remote_jid:      r.remote_jid,
    phone_number:    r.phone_number,
    full_name:       r.full_name ? sanitizeText(r.full_name) : null,
    push_name:       r.push_name ? sanitizeText(r.push_name) : null,
    email:           r.email,
    company:         r.company ? sanitizeText(r.company) : null,
    tags:            r.tags,
    lead_status:     r.lead_status,
    lead_score:      r.lead_score,
    last_message_at: r.last_message_at,
    profile_picture_url: r.profile_pic_url,
  };
}
