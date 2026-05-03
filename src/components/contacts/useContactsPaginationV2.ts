/**
 * useContactsPaginationV2.ts
 * Server-side pagination hook v2 for the contacts list.
 * Cursor-based pagination with filter support for infinite scroll.
 */
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeText } from '@/lib/sanitize';
import { dbFrom } from '@/integrations/datasource/db';

export interface ContactListItem {
  id: string; name: string; phone: string | null; email: string | null;
  company: string | null; tags: string[]; channel: string | null;
  avatar_url: string | null; created_at: string; last_seen_at: string | null; version?: number;
}

export interface ContactPaginationFilters {
  search: string; tags: string[]; channel: string | null;
  sortField: 'name' | 'created_at' | 'last_seen_at';
  sortOrder: 'asc' | 'desc';
}

const PAGE_SIZE = 50;
const DEFAULT_FILTERS: ContactPaginationFilters = { search: '', tags: [], channel: null, sortField: 'last_seen_at', sortOrder: 'desc' };

export function useContactsPaginationV2(workspaceId: string) {
  const [contacts, setContacts] = useState<ContactListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<ContactPaginationFilters>(DEFAULT_FILTERS);
  const cursorRef = useRef<string | null>(null);

  const buildQuery = useCallback((f: ContactPaginationFilters) => {
    let q = dbFrom('contacts')
      .select('id,name,phone,email,company,tags,channel,avatar_url,created_at,last_seen_at,version', { count: 'exact' })
      .eq('workspace_id', workspaceId).is('deleted_at', null).limit(PAGE_SIZE);
    if (f.search?.trim()) q = q.or(`name.ilike.%${f.search.trim()}%,phone.ilike.%${f.search.trim()}%,email.ilike.%${f.search.trim()}%`);
    if (f.channel) q = q.eq('channel', f.channel);
    if (f.tags?.length > 0) q = q.overlaps('tags', f.tags);
    q = q.order(f.sortField, { ascending: f.sortOrder === 'asc', nullsFirst: false });
    return q;
  }, [workspaceId]);

  const toItem = (c: Record<string, unknown>): ContactListItem => ({
    id: String(c.id), name: sanitizeText(c.name), phone: c.phone as string | null,
    email: c.email as string | null, company: c.company ? sanitizeText(c.company) : null,
    tags: Array.isArray(c.tags) ? c.tags : [], channel: c.channel as string | null,
    avatar_url: c.avatar_url as string | null, created_at: String(c.created_at),
    last_seen_at: c.last_seen_at as string | null, version: c.version as number | undefined,
  });

  const loadContacts = useCallback(async (overrideFilters?: Partial<ContactPaginationFilters>) => {
    const f = { ...filters, ...overrideFilters };
    setLoading(true); setContacts([]); cursorRef.current = null;
    try {
      const { data, count, error } = await buildQuery(f);
      if (error) throw error;
      const items = (data ?? []).map(toItem);
      const last = items[items.length - 1];
      cursorRef.current = last ? String(last[f.sortField] ?? '') : null;
      setContacts(items); setTotal(count ?? items.length); setHasMore(items.length === PAGE_SIZE);
    } catch (err) { console.error('[useContactsPaginationV2]', err); }
    finally { setLoading(false); }
  }, [filters, buildQuery]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !cursorRef.current) return;
    setLoadingMore(true);
    try {
      let q = buildQuery(filters);
      q = filters.sortOrder === 'asc' ? q.gt(filters.sortField, cursorRef.current!) : q.lt(filters.sortField, cursorRef.current!);
      const { data, error } = await q;
      if (error) throw error;
      const newItems = (data ?? []).map(toItem);
      const last = newItems[newItems.length - 1];
      if (last) cursorRef.current = String(last[filters.sortField] ?? '');
      setContacts((prev) => [...prev, ...newItems]);
      setHasMore(newItems.length === PAGE_SIZE);
    } catch (err) { console.error('[useContactsPaginationV2] loadMore', err); }
    finally { setLoadingMore(false); }
  }, [loadingMore, hasMore, filters, buildQuery]);

  const updateFilters = useCallback((updates: Partial<ContactPaginationFilters>) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);
    loadContacts(newFilters);
  }, [filters, loadContacts]);

  return { contacts, loading, loadingMore, hasMore, total, filters, loadContacts, loadMore, updateFilters };
}
