import { useMemo, useCallback, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { InboxFiltersState } from '@/components/inbox/InboxFilters';
import { ConversationWithMessages } from '@/hooks/useRealtimeMessages';
import { filterByContactType } from '@/components/inbox/ContactTypeFilter';
import { isAfter, isBefore, startOfDay, endOfDay, parseISO } from 'date-fns';
import { MainTab, SubTab } from '@/components/inbox/TicketTabs';
import { useFailureMetricsBatch, type FailureCategory } from '@/hooks/inbox/useFailureMetricsBatch';
import { useAllTicketStates } from '@/hooks/useTicketStatus';

interface UseInboxFiltersProps {
  conversations: ConversationWithMessages[];
  profileId: string | undefined;
}

export function useInboxFilters({ conversations, profileId }: UseInboxFiltersProps) {
  const [mainTab, setMainTab] = useState<MainTab>('open');
  const [subTab, setSubTab] = useState<SubTab>('attending');
  const [showAll, setShowAll] = useState(false);
  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null);
  const [selectedContactType, setSelectedContactType] = useState<string | null>(null);
  const [showOnlyRetrying, setShowOnlyRetrying] = useState(false);
  const [failureCategoryFilter, setFailureCategoryFilter] = useState<FailureCategory | 'all'>('all');

  const { filters: urlFilters, setFilters: setUrlFilters, clearFilters: clearUrlFilters } = useUrlFilters();

  // Carrega categorias de falha em lote quando o filtro de retry está ativo
  const { data: failureCategoryById = {} } = useFailureMetricsBatch(
    conversations,
    showOnlyRetrying,
  );

  // Sync state with URL on mount only
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // Contact Type
    const typeFromUrl = params.get('type');
    if (typeFromUrl && typeFromUrl !== 'all') {
      setSelectedContactType(typeFromUrl);
    }

    // Failures Only (deep-link de monitoramento)
    if (params.get('failuresOnly') === 'true') {
      setShowOnlyRetrying(true);
    }

    // Failure Category (deep-link de monitoramento)
    const catFromUrl = params.get('failureCategory');
    if (catFromUrl) {
      const validCategories: (FailureCategory | 'all')[] = ['all', 'auth', 'http_4xx', 'http_5xx', 'network', 'unknown'];
      if (validCategories.includes(catFromUrl as any)) {
        setFailureCategoryFilter(catFromUrl as any);
      }
    }
  }, []);

  const handleContactTypeChange = useCallback((value: string | null) => {
    setSelectedContactType(value);
    
    const params = new URLSearchParams(window.location.search);
    if (value && value !== 'all') {
      params.set('type', value);
    } else {
      params.delete('type');
    }
    window.history.replaceState(null, '', `?${params.toString()}${window.location.hash}`);
  }, []);

  // Sync URL when failure filters change
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let changed = false;

    if (showOnlyRetrying) {
      if (params.get('failuresOnly') !== 'true') {
        params.set('failuresOnly', 'true');
        changed = true;
      }
    } else if (params.has('failuresOnly')) {
      params.delete('failuresOnly');
      changed = true;
    }

    if (failureCategoryFilter !== 'all') {
      if (params.get('failureCategory') !== failureCategoryFilter) {
        params.set('failureCategory', failureCategoryFilter);
        changed = true;
      }
    } else if (params.has('failureCategory')) {
      params.delete('failureCategory');
      changed = true;
    }

    if (changed) {
      window.history.replaceState(null, '', `?${params.toString()}${window.location.hash}`);
    }
  }, [showOnlyRetrying, failureCategoryFilter]);

  // Load contact_tags mapping
  const { data: contactTagsMap = {} } = useQuery({
    queryKey: ['contact-tags-map'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_tags')
        .select('contact_id, tag_id');
      if (error) throw error;
      const map: Record<string, string[]> = {};
      (data || []).forEach(ct => {
        if (!map[ct.contact_id]) map[ct.contact_id] = [];
        map[ct.contact_id].push(ct.tag_id);
      });
      return map;
    },
    staleTime: 30_000,
  });

  // Convert URL filters to InboxFiltersState
  const filters = useMemo<InboxFiltersState>(() => ({
    status: urlFilters.status,
    tags: urlFilters.tags,
    agentId: urlFilters.agentId,
    dateRange: {
      from: urlFilters.dateFrom ? parseISO(urlFilters.dateFrom) : null,
      to: urlFilters.dateTo ? parseISO(urlFilters.dateTo) : null,
    },
  }), [urlFilters]);

  const search = urlFilters.search;
  const setSearch = useCallback((value: string) => {
    setUrlFilters({ search: value });
  }, [setUrlFilters]);

  const setFilters = useCallback((newFilters: InboxFiltersState) => {
    setUrlFilters({
      status: newFilters.status,
      tags: newFilters.tags,
      agentId: newFilters.agentId,
      dateFrom: newFilters.dateRange.from?.toISOString().split('T')[0] || null,
      dateTo: newFilters.dateRange.to?.toISOString().split('T')[0] || null,
    });
  }, [setUrlFilters]);

  const ticketStates = useAllTicketStates();

  const filteredConversations = useMemo(() => {
    let result = conversations.filter(c => c && c.contact && c.contact.id);

    // Memoize utility functions for current render
    const statusOf = (id: string) => ticketStates[id]?.status ?? 'open';
    const assignedOf = (id: string, fallback: string | null | undefined) =>
      ticketStates[id]?.assignedTo ?? fallback ?? null;

    // 1. Tab-based filtering
    if (mainTab === 'open') {
      result = result.filter(c => {
        const s = statusOf(c.contact.id);
        const isOpenOrProgress = s === 'open' || s === 'in_progress';
        
        // If searching and showAll is on, we might want to bypass tab filtering
        // to find contacts in other tabs, but current logic keeps them scoped.
        // The test has setShowAll(true), but we are in mainTab='open' (default).
        if (!isOpenOrProgress) return false;

        if (subTab === 'attending') {
          if (!showAll) {
            return assignedOf(c.contact.id, c.contact.assigned_to) === profileId;
          }
          return true; // With showAll=true, we see all in 'open' tab
        } 
        
        if (subTab === 'waiting') {
          return !assignedOf(c.contact.id, c.contact.assigned_to);
        }

        return true;
      });

      if (selectedQueueId) {
        result = result.filter(c => c.contact.queue_id === selectedQueueId);
      }
    } else if (mainTab === 'resolved') {
      result = result.filter(c => statusOf(c.contact.id) === 'resolved');
    }

    // 2. Search filtering
    const searchTrimmed = search.trim();
    if (searchTrimmed) {
      const searchLower = searchTrimmed.toLowerCase();
      const digits = searchTrimmed.replace(/\D/g, '');
      result = result.filter((c) => {
        const name = c.contact.name?.toLowerCase() ?? '';
        const phone = c.contact.phone ?? '';
        const email = c.contact.email?.toLowerCase() ?? '';
        const jid = String(c.contact.id ?? '').toLowerCase();
        const lastMsg = c.lastMessage?.content?.toLowerCase() ?? '';
        return (
          name.includes(searchLower) ||
          (digits.length > 0 && phone.replace(/\D/g, '').includes(digits)) ||
          email.includes(searchLower) ||
          jid.includes(searchLower) ||
          lastMsg.includes(searchLower)
        );
      });
    }

    // 3. Status array filter
    if (filters.status.length > 0) {
      result = result.filter((c) => {
        const hasUnread = c.unreadCount > 0;
        const isAssigned = !!c.contact.assigned_to;
        if (filters.status.includes('unread') && hasUnread) return true;
        if (filters.status.includes('read') && !hasUnread && isAssigned) return true;
        if (filters.status.includes('pending') && !isAssigned && c.messages.length > 0) return true;
        if (filters.status.includes('resolved') && c.messages.length === 0) return true;
        return false;
      });
    }

    // 4. Tags filter
    if (filters.tags.length > 0) {
      result = result.filter((c) => {
        const tagIds = contactTagsMap[c.contact.id] || [];
        return filters.tags.some(filterTagId => tagIds.includes(filterTagId));
      });
    }

    // 5. Agent filter
    if (filters.agentId) {
      result = result.filter((c) => c.contact.assigned_to === filters.agentId);
    }

    // 6. Date range filter
    if (filters.dateRange.from) {
      const fromStart = startOfDay(filters.dateRange.from);
      const toEnd = filters.dateRange.to ? endOfDay(filters.dateRange.to) : null;
      
      result = result.filter((c) => {
        const lastMessageDate = c.lastMessage
          ? new Date(c.lastMessage.created_at)
          : new Date(c.contact.created_at);
        if (isBefore(lastMessageDate, fromStart)) return false;
        if (toEnd && isAfter(lastMessageDate, toEnd)) return false;
        return true;
      });
    }

    // 7. Contact type filter
    result = filterByContactType(result, selectedContactType);

    // 8. Failure filter
    if (showOnlyRetrying) {
      result = result.filter((c) => {
        const failingMsgs = c.messages.filter(
          (m) => m.status === 'retrying' || m.status === 'failed_retries' || m.status === 'failed' || m.status === 'failed_auth'
        );
        if (failingMsgs.length === 0) return false;

        if (failureCategoryFilter === 'all') return true;

        return failingMsgs.some((m) => {
          if (m.status === 'retrying') return false;
          if (m.status === 'failed_auth' && failureCategoryFilter === 'auth') return true;
          const cat = failureCategoryById[m.id];
          return cat === failureCategoryFilter;
        });
      });
    }

    // 9. Sorting
    return [...result].sort((a, b) => {
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      const aTime = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : new Date(a.contact.updated_at).getTime();
      const bTime = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : new Date(b.contact.updated_at).getTime();
      return bTime - aTime;
    });
  }, [
    conversations, 
    search, 
    filters, 
    mainTab, 
    subTab, 
    showAll, 
    selectedQueueId, 
    selectedContactType, 
    showOnlyRetrying, 
    failureCategoryFilter, 
    failureCategoryById, 
    profileId, 
    contactTagsMap, 
    ticketStates
  ]);

  const retryingCount = useMemo(
    () => conversations.filter((c) =>
      c.messages?.some((m) => m.status === 'retrying' || m.status === 'failed_retries')
    ).length,
    [conversations]
  );

  // Contagem por categoria (apenas quando filtro retry está ativo e métricas carregadas)
  const failureCategoryCounts = useMemo(() => {
    const counts: Record<FailureCategory | 'all', number> = {
      all: 0, auth: 0, http_4xx: 0, http_5xx: 0, network: 0, unknown: 0,
    };
    if (!showOnlyRetrying) return counts;
    const seenConvs = new Set<string>();
    const seenByCat: Record<string, Set<string>> = { auth: new Set(), http_4xx: new Set(), http_5xx: new Set(), network: new Set(), unknown: new Set() };
    for (const c of conversations) {
      const failing = c.messages?.filter(
        (m) => m.status === 'failed' || m.status === 'failed_auth' || m.status === 'failed_retries'
      ) || [];
      if (failing.length === 0) continue;
      seenConvs.add(c.contact.id);
      for (const m of failing) {
        const cat: FailureCategory = m.status === 'failed_auth' ? 'auth' : (failureCategoryById[m.id] ?? 'unknown');
        seenByCat[cat].add(c.contact.id);
      }
    }
    counts.all = seenConvs.size;
    counts.auth = seenByCat.auth.size;
    counts.http_4xx = seenByCat.http_4xx.size;
    counts.http_5xx = seenByCat.http_5xx.size;
    counts.network = seenByCat.network.size;
    counts.unknown = seenByCat.unknown.size;
    return counts;
  }, [conversations, showOnlyRetrying, failureCategoryById]);

  return {
    mainTab, setMainTab,
    subTab, setSubTab,
    showAll, setShowAll,
    selectedQueueId, setSelectedQueueId,
    selectedContactType, handleContactTypeChange,
    showOnlyRetrying, setShowOnlyRetrying,
    failureCategoryFilter, setFailureCategoryFilter,
    failureCategoryCounts,
    retryingCount,
    filters, setFilters,
    search, setSearch,
    filteredConversations,
    clearUrlFilters,
  };
}
