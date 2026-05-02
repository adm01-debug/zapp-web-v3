/**
 * useContacts.ts
 * Main contacts data hook — uses evolution_contacts table.
 * Handles CRUD, search, pagination, filters, soft delete, and undo.
 *
 * Actual DB schema:
 *   id, remote_jid, phone_number, full_name, push_name, email,
 *   company, lead_status, lead_score, tags, notes, instance_name,
 *   deleted_at, version, lgpd_consent_at, lgpd_opt_out_at
 */
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { sanitizeText } from '@/lib/sanitize';
import { normalizePhone } from '@/lib/phoneUtils';

// ── Types ──────────────────────────────────────────────────────────────────

export interface Contact {
  id:              string;
  remote_jid:      string;
  phone_number:    string | null;
  full_name:       string | null;
  push_name:       string | null;
  email:           string | null;
  company:         string | null;
  lead_status:     string;
  lead_score:      number;
  tags:            string[];
  notes:           string | null;
  instance_name:   string;
  assigned_to:     string | null;
  first_contact_at:string | null;
  last_message_at: string | null;
  total_messages:  number;
  created_at:      string;
  updated_at:      string;
  deleted_at:      string | null;
  version:         number;
  profile_picture_url: string | null;
  lgpd_consent_at: string | null;
  lgpd_opt_out_at: string | null;
  lgpd_marketing_consent: boolean;
  merge_source_id: string | null;
}

export interface ContactFilters {
  search:      string;
  lead_status: string | null;
  tags:        string[];
  instance_name: string;
  sort_field:  'last_message_at' | 'full_name' | 'created_at' | 'lead_score';
  sort_order:  'asc' | 'desc';
}

const DEFAULT_FILTERS: ContactFilters = {
  search:       '',
  lead_status:  null,
  tags:         [],
  instance_name:'wpp2',
  sort_field:   'last_message_at',
  sort_order:   'desc',
};

const PAGE_SIZE = 50;
const UNDO_WINDOW_MS = 5_000;

// ── Hook ───────────────────────────────────────────────────────────────────

export function useContacts() {
  const { toast, dismiss } = useToast();
  const [contacts, setContacts]       = useState<Contact[]>([]);
  const [loading,  setLoading]        = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,  setHasMore]        = useState(false);
  const [total,    setTotal]          = useState(0);
  const [filters,  setFilters]        = useState<ContactFilters>(DEFAULT_FILTERS);
  const cursorRef      = useRef<string | null>(null);
  const pendingDeleteRef = useRef<string[]>([]);
  const undoTimerRef   = useRef<ReturnType<typeof setTimeout>>();

  // ── Fetch helpers ──────────────────────────────────────────────────────

  const buildQuery = useCallback((f: ContactFilters) => {
    let q = supabase
      .from('evolution_contacts')
      .select([
        'id','remote_jid','phone_number','full_name','push_name','email',
        'company','lead_status','lead_score','tags','notes','instance_name',
        'assigned_to','first_contact_at','last_message_at','total_messages',
        'created_at','updated_at','deleted_at','version',
        'profile_picture_url','lgpd_consent_at','lgpd_opt_out_at',
        'lgpd_marketing_consent','merge_source_id',
      ].join(','), { count: 'exact' })
      .is('deleted_at', null)
      .eq('instance_name', f.instance_name)
      .limit(PAGE_SIZE);

    // Text search
    if (f.search?.trim()) {
      const s = sanitizeText(f.search.trim());
      q = q.or(`full_name.ilike.%${s}%,phone_number.ilike.%${s}%,email.ilike.%${s}%,company.ilike.%${s}%`);
    }

    // Lead status filter
    if (f.lead_status) q = q.eq('lead_status', f.lead_status);

    // Tag filter
    if (f.tags?.length > 0) q = q.overlaps('tags', f.tags);

    // Sort
    q = q.order(f.sort_field, { ascending: f.sort_order === 'asc', nullsFirst: false });

    return q;
  }, []);

  const mapRow = useCallback((row: Record<string, unknown>): Contact => ({
    id:              String(row.id),
    remote_jid:      String(row.remote_jid ?? ''),
    phone_number:    row.phone_number as string | null,
    full_name:       row.full_name ? sanitizeText(row.full_name as string) : null,
    push_name:       row.push_name ? sanitizeText(row.push_name as string) : null,
    email:           row.email as string | null,
    company:         row.company ? sanitizeText(row.company as string) : null,
    lead_status:     String(row.lead_status ?? 'novo'),
    lead_score:      Number(row.lead_score ?? 0),
    tags:            Array.isArray(row.tags) ? row.tags as string[] : [],
    notes:           row.notes as string | null,
    instance_name:   String(row.instance_name ?? 'wpp2'),
    assigned_to:     row.assigned_to as string | null,
    first_contact_at:row.first_contact_at as string | null,
    last_message_at: row.last_message_at as string | null,
    total_messages:  Number(row.total_messages ?? 0),
    created_at:      String(row.created_at),
    updated_at:      String(row.updated_at),
    deleted_at:      row.deleted_at as string | null,
    version:         Number(row.version ?? 1),
    profile_picture_url: row.profile_picture_url as string | null,
    lgpd_consent_at:     row.lgpd_consent_at as string | null,
    lgpd_opt_out_at:     row.lgpd_opt_out_at as string | null,
    lgpd_marketing_consent: Boolean(row.lgpd_marketing_consent ?? false),
    merge_source_id:     row.merge_source_id as string | null,
  }), []);

  // ── Load (first page) ──────────────────────────────────────────────────

  const loadContacts = useCallback(async (overrideFilters?: Partial<ContactFilters>) => {
    const f = { ...filters, ...overrideFilters };
    setLoading(true);
    setContacts([]);
    cursorRef.current = null;

    try {
      const { data, count, error } = await buildQuery(f);
      if (error) throw error;

      const items = (data ?? []).map(mapRow);
      const last = items[items.length - 1];
      cursorRef.current = last ? String((last as Record<string, unknown>)[f.sort_field] ?? '') : null;
      setContacts(items);
      setTotal(count ?? items.length);
      setHasMore(items.length === PAGE_SIZE);
    } catch (err) {
      console.error('[useContacts] load error:', err);
      toast({ title: 'Erro ao carregar contatos', description: String(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [filters, buildQuery, mapRow, toast]);

  // ── Load More (infinite scroll) ────────────────────────────────────────

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !cursorRef.current) return;
    setLoadingMore(true);

    try {
      let q = buildQuery(filters);
      if (filters.sort_order === 'asc') {
        q = q.gt(filters.sort_field, cursorRef.current);
      } else {
        q = q.lt(filters.sort_field, cursorRef.current);
      }
      const { data, error } = await q;
      if (error) throw error;

      const newItems = (data ?? []).map(mapRow);
      const last = newItems[newItems.length - 1];
      if (last) cursorRef.current = String((last as Record<string, unknown>)[filters.sort_field] ?? '');
      setContacts((prev) => [...prev, ...newItems]);
      setHasMore(newItems.length === PAGE_SIZE);
    } catch (err) {
      console.error('[useContacts] loadMore error:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, filters, buildQuery, mapRow]);

  // ── Update Filters ────────────────────────────────────────────────────

  const updateFilters = useCallback((updates: Partial<ContactFilters>) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);
    loadContacts(newFilters);
  }, [filters, loadContacts]);

  // ── Create Contact ─────────────────────────────────────────────────────

  const createContact = useCallback(async (data: {
    full_name: string;
    phone_number?: string;
    email?: string;
    company?: string;
    tags?: string[];
    notes?: string;
    instance_name?: string;
  }) => {
    const phone = data.phone_number ? normalizePhone(data.phone_number) : null;
    const remote_jid = phone ? `55${phone}@c.us` : `unknown_${Date.now()}@c.us`;

    const { data: created, error } = await supabase
      .from('evolution_contacts')
      .insert({
        full_name:     sanitizeText(data.full_name),
        phone_number:  phone,
        email:         data.email?.toLowerCase()?.trim() || null,
        company:       data.company ? sanitizeText(data.company) : null,
        tags:          data.tags ?? [],
        notes:         data.notes || null,
        instance_name: data.instance_name ?? filters.instance_name,
        remote_jid,
        created_at:    new Date().toISOString(),
        updated_at:    new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new Error('Já existe um contato com esse número ou e-mail.');
      throw error;
    }

    toast({ title: '✅ Contato criado!', description: sanitizeText(data.full_name), duration: 3_000 });
    setContacts((prev) => [mapRow(created as Record<string, unknown>), ...prev]);
    setTotal((t) => t + 1);
    return created;
  }, [filters.instance_name, mapRow, toast]);

  // ── Update Contact (versioned) ─────────────────────────────────────────

  const updateContact = useCallback(async (
    id: string,
    expectedVersion: number,
    updates: Partial<Record<string, unknown>>
  ) => {
    const { data, error } = await supabase.rpc('update_contact_versioned', {
      p_contact_id:       id,
      p_expected_version: expectedVersion,
      p_updates:          updates,
    });

    if (error) throw error;

    const result = data as Record<string, unknown>;
    if (result?.error === 'CONFLICT') return { conflict: true, data: result };

    // Optimistic update in local state
    setContacts((prev) => prev.map((c) =>
      c.id === id
        ? { ...c, ...updates, version: (c.version ?? 1) + 1, updated_at: new Date().toISOString() }
        : c
    ));

    toast({ title: '✅ Contato atualizado!', duration: 2_500 });
    return { conflict: false, data: result };
  }, [toast]);

  // ── Soft Delete with Undo ──────────────────────────────────────────────

  const deleteContactsWithUndo = useCallback(async (ids: string[], label: string) => {
    clearTimeout(undoTimerRef.current);

    // Optimistic remove from UI
    setContacts((prev) => prev.filter((c) => !ids.includes(c.id)));
    setTotal((t) => Math.max(0, t - ids.length));

    // Mark as deleted in DB
    await supabase
      .from('evolution_contacts')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', ids);

    pendingDeleteRef.current = ids;

    const { id: toastId } = toast({
      title: `🗑️ ${label} excluído${ids.length !== 1 ? 's' : ''}`,
      description: `${ids.length} contato${ids.length !== 1 ? 's' : ''}. Clique em Desfazer.`,
      duration: UNDO_WINDOW_MS,
    });

    undoTimerRef.current = setTimeout(() => {
      pendingDeleteRef.current = [];
      dismiss(toastId);
    }, UNDO_WINDOW_MS);
  }, [toast, dismiss]);

  const undoDelete = useCallback(async () => {
    const ids = pendingDeleteRef.current;
    if (!ids.length) return;

    clearTimeout(undoTimerRef.current);
    pendingDeleteRef.current = [];

    // Restore in DB
    await supabase
      .from('evolution_contacts')
      .update({ deleted_at: null })
      .in('id', ids);

    // Reload to get restored contacts
    await loadContacts();

    toast({ title: '↩️ Recuperado!', description: `${ids.length} contato${ids.length !== 1 ? 's' : ''} restaurado${ids.length !== 1 ? 's' : ''}.`, duration: 3_000 });
  }, [loadContacts, toast]);

  // ── Merge Contacts ─────────────────────────────────────────────────────

  const mergeContacts = useCallback(async (primaryId: string, secondaryId: string, mergedFields: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.rpc('merge_contacts', {
      p_primary_id:   primaryId,
      p_secondary_id: secondaryId,
      p_merged_fields: mergedFields,
    });

    if (error) throw error;

    // Remove secondary from list, update primary
    setContacts((prev) => prev.filter((c) => c.id !== secondaryId));
    setTotal((t) => Math.max(0, t - 1));

    toast({ title: '🔀 Contatos mesclados!', description: 'Histórico unificado com sucesso.', duration: 3_000 });
    return data;
  }, [toast]);

  return {
    contacts, loading, loadingMore, hasMore, total, filters,
    loadContacts, loadMore, updateFilters,
    createContact, updateContact,
    deleteContactsWithUndo, undoDelete,
    mergeContacts,
  };
}
