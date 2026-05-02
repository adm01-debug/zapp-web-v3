/**
 * useConversations.ts
 * Main conversations hook using evolution_conversations table.
 * Features: pagination, filters, realtime, assign, close, SLA check.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { sanitizeText } from '@/lib/sanitize';
import { dbFrom, dbTable } from '@/integrations/datasource/db';

// ── Types ──────────────────────────────────────────────────────────────────

export interface Conversation {
  id:                   string;
  contact_id:           string | null;
  remote_jid:           string;
  status:               string;
  assigned_to:          string | null;
  department:           string | null;
  subject:              string | null;
  priority:             string;
  labels:               string[];
  message_count:        number;
  unread_count:         number;
  first_message_at:     string | null;
  last_message_at:      string | null;
  last_message_content: string | null;
  last_message_type:    string | null;
  first_response_at:    string | null;
  first_response_seconds: number | null;
  resolution_at:        string | null;
  resolution_seconds:   number | null;
  is_bot_active:        boolean;
  satisfaction_score:   number | null;
  instance_name:        string;
  created_at:           string;
  updated_at:           string;
  // Joined contact
  contact_name?:        string;
  contact_phone?:       string;
  contact_avatar?:      string;
}

export interface ConversationFilters {
  status:       'open' | 'closed' | 'all';
  assigned_to:  string | null;
  priority:     string | null;
  search:       string;
  instance_name: string;
  sort_field:   'last_message_at' | 'created_at' | 'unread_count';
  sort_order:   'asc' | 'desc';
}

const DEFAULT_FILTERS: ConversationFilters = {
  status:       'open',
  assigned_to:  null,
  priority:     null,
  search:       '',
  instance_name:'wpp2',
  sort_field:   'last_message_at',
  sort_order:   'desc',
};

const PAGE_SIZE = 50;

// ── Hook ───────────────────────────────────────────────────────────────────

export function useConversations() {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [loadingMore,   setLoadingMore]   = useState(false);
  const [hasMore,       setHasMore]       = useState(false);
  const [total,         setTotal]         = useState(0);
  const [filters,       setFilters]       = useState<ConversationFilters>(DEFAULT_FILTERS);
  const cursorRef = useRef<string | null>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout>>();

  const buildQuery = useCallback((f: ConversationFilters) => {
    let q = dbFrom('conversations')
      .select([
        'id','contact_id','remote_jid','status','assigned_to','department',
        'subject','priority','labels','message_count','unread_count',
        'first_message_at','last_message_at','last_message_content','last_message_type',
        'first_response_at','first_response_seconds','resolution_at','resolution_seconds',
        'is_bot_active','satisfaction_score','instance_name','created_at','updated_at',
      ].join(','), { count: 'exact' })
      .eq('instance_name', f.instance_name)
      .limit(PAGE_SIZE);

    if (f.status !== 'all') q = q.eq('status', f.status);
    if (f.assigned_to) q = q.eq('assigned_to', f.assigned_to);
    if (f.priority) q = q.eq('priority', f.priority);
    if (f.search?.trim()) {
      const s = sanitizeText(f.search.trim());
      q = q.or(`remote_jid.ilike.%${s}%,subject.ilike.%${s}%,last_message_content.ilike.%${s}%`);
    }

    q = q.order(f.sort_field, { ascending: f.sort_order === 'asc', nullsFirst: false });
    return q;
  }, []);

  const mapRow = (row: Record<string, unknown>): Conversation => ({
    id:                   String(row.id),
    contact_id:           row.contact_id as string | null,
    remote_jid:           String(row.remote_jid ?? ''),
    status:               String(row.status ?? 'open'),
    assigned_to:          row.assigned_to as string | null,
    department:           row.department as string | null,
    subject:              row.subject ? sanitizeText(row.subject as string) : null,
    priority:             String(row.priority ?? 'normal'),
    labels:               Array.isArray(row.labels) ? row.labels as string[] : [],
    message_count:        Number(row.message_count ?? 0),
    unread_count:         Number(row.unread_count ?? 0),
    first_message_at:     row.first_message_at as string | null,
    last_message_at:      row.last_message_at as string | null,
    last_message_content: row.last_message_content ? sanitizeText(row.last_message_content as string) : null,
    last_message_type:    row.last_message_type as string | null,
    first_response_at:    row.first_response_at as string | null,
    first_response_seconds: row.first_response_seconds as number | null,
    resolution_at:        row.resolution_at as string | null,
    resolution_seconds:   row.resolution_seconds as number | null,
    is_bot_active:        Boolean(row.is_bot_active ?? false),
    satisfaction_score:   row.satisfaction_score as number | null,
    instance_name:        String(row.instance_name ?? 'wpp2'),
    created_at:           String(row.created_at ?? ''),
    updated_at:           String(row.updated_at ?? ''),
  });

  // ── Load ──────────────────────────────────────────────────────────────

  const loadConversations = useCallback(async (overrideFilters?: Partial<ConversationFilters>) => {
    const f = { ...filters, ...overrideFilters };
    setLoading(true); setConversations([]); cursorRef.current = null;
    try {
      const { data, count, error } = await buildQuery(f);
      if (error) throw error;
      const items = (data ?? []).map(mapRow);
      const last = items[items.length - 1];
      cursorRef.current = last ? String((last as Record<string, unknown>)[f.sort_field] ?? '') : null;
      setConversations(items);
      setTotal(count ?? items.length);
      setHasMore(items.length === PAGE_SIZE);
    } catch (err) {
      console.error('[useConversations]', err);
      toast({ title: 'Erro ao carregar conversas', description: String(err), variant: 'destructive' });
    } finally { setLoading(false); }
  }, [filters, buildQuery, toast]);

  // ── Load More ─────────────────────────────────────────────────────────

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !cursorRef.current) return;
    setLoadingMore(true);
    try {
      let q = buildQuery(filters);
      q = filters.sort_order === 'asc' ? q.gt(filters.sort_field, cursorRef.current!) : q.lt(filters.sort_field, cursorRef.current!);
      const { data, error } = await q;
      if (error) throw error;
      const newItems = (data ?? []).map(mapRow);
      const last = newItems[newItems.length - 1];
      if (last) cursorRef.current = String((last as Record<string, unknown>)[filters.sort_field] ?? '');
      setConversations((prev) => [...prev, ...newItems]);
      setHasMore(newItems.length === PAGE_SIZE);
    } finally { setLoadingMore(false); }
  }, [loadingMore, hasMore, filters, buildQuery]);

  // ── Update Filters ────────────────────────────────────────────────────

  const updateFilters = useCallback((updates: Partial<ConversationFilters>) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);
    loadConversations(newFilters);
  }, [filters, loadConversations]);

  // ── Actions ───────────────────────────────────────────────────────────

  const assignConversation = useCallback(async (id: string, agentId: string) => {
    const { data, error } = await supabase.rpc('assign_conversation', {
      p_conversation_id: id, p_agent_id: agentId,
    });
    if (error) throw error;
    setConversations((prev) => prev.map((c) => c.id === id ? { ...c, assigned_to: agentId } : c));
    return data;
  }, []);

  const closeConversation = useCallback(async (id: string, note?: string) => {
    const { data, error } = await supabase.rpc('close_conversation', {
      p_id: id, p_note: note ?? null,
    });
    if (error) throw error;
    // Remove from open list if filtering by open
    if (filters.status === 'open') {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      setTotal((t) => Math.max(0, t - 1));
    }
    toast({ title: '✅ Conversa encerrada!', duration: 2_500 });
    return data;
  }, [filters.status, toast]);

  const markAsRead = useCallback(async (id: string) => {
    await dbFrom('conversations').update({ unread_count: 0, updated_at: new Date().toISOString() }).eq('id', id);
    setConversations((prev) => prev.map((c) => c.id === id ? { ...c, unread_count: 0 } : c));
  }, []);

  // ── Realtime ──────────────────────────────────────────────────────────

  useEffect(() => {
    const channel = supabase
      .channel(`conversations:${filters.instance_name}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: dbTable('conversations'),
        filter: `instance_name=eq.${filters.instance_name}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newConv = mapRow(payload.new as Record<string, unknown>);
          if (filters.status === 'all' || newConv.status === filters.status) {
            setConversations((prev) => [newConv, ...prev]);
            setTotal((t) => t + 1);
          }
        } else if (payload.eventType === 'UPDATE') {
          setConversations((prev) => prev.map((c) =>
            c.id === payload.new.id ? mapRow(payload.new as Record<string, unknown>) : c
          ));
        } else if (payload.eventType === 'DELETE') {
          setConversations((prev) => prev.filter((c) => c.id !== payload.old.id));
          setTotal((t) => Math.max(0, t - 1));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [filters.instance_name, filters.status]);

  return {
    conversations, loading, loadingMore, hasMore, total, filters,
    loadConversations, loadMore, updateFilters,
    assignConversation, closeConversation, markAsRead,
  };
}
