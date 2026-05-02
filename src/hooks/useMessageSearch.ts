/**
 * useMessageSearch.ts
 * Search within conversation messages with highlighting.
 * 
 * Features:
 * - Full-text search within a conversation's messages
 * - Returns matching messages with highlighted terms
 * - Navigate between matches (prev/next)
 * - Debounced search input
 */
import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchResult {
  id: string;
  content: string;
  sender_name: string;
  sender_type: string;
  created_at: string;
  match_index: number;
}

export function useMessageSearch(conversationId: string, workspaceId: string) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const debouncedQuery = useDebounce(query, 300);

  const search = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim() || searchTerm.length < 2) {
      setResults([]);
      setActiveIndex(0);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, content, sender_name, sender_type, created_at')
        .eq('conversation_id', conversationId)
        .eq('workspace_id', workspaceId)
        .ilike('content', `%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const mapped: SearchResult[] = (data ?? []).map((msg, i) => ({
        ...msg,
        match_index: i,
      }));

      setResults(mapped);
      setActiveIndex(0);
    } catch (err) {
      console.error('[MessageSearch] Error:', err);
    } finally {
      setIsSearching(false);
    }
  }, [conversationId, workspaceId]);

  // Auto-search on debounced query change
  useMemo(() => {
    if (debouncedQuery) search(debouncedQuery);
    else { setResults([]); setActiveIndex(0); }
  }, [debouncedQuery, search]);

  const goToNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % Math.max(results.length, 1));
  }, [results.length]);

  const goToPrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + results.length) % Math.max(results.length, 1));
  }, [results.length]);

  const activeResult = results[activeIndex] ?? null;

  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
    setActiveIndex(0);
  }, []);

  return {
    query,
    setQuery,
    results,
    isSearching,
    activeIndex,
    activeResult,
    totalResults: results.length,
    goToNext,
    goToPrev,
    clear,
  };
}
