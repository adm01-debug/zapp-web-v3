import { useEffect, useRef, useState, useCallback } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth';
import type { TeamMessage } from './teamChatTypes';

const MESSAGES_PER_PAGE = 50;

export function useTeamMessages(conversationId: string | null, searchQuery: string = '') {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const lastReadRef = useRef<string | null>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error
  } = useInfiniteQuery({
    queryKey: ['team-messages', conversationId, searchQuery],
    queryFn: async ({ pageParam = 0 }) => {
      if (!conversationId) return { messages: [], nextCursor: null };
      
      let query = supabase
        .from('team_messages')
        .select('*, sender:profiles!team_messages_sender_id_fkey(id, name, avatar_url)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false }) // Get latest first for infinite scroll up
        .range(pageParam, pageParam + MESSAGES_PER_PAGE - 1);

      if (searchQuery.trim()) {
        query = query.ilike('content', `%${searchQuery.trim()}%`);
      }

      const { data: messages, error } = await query;
      
      if (error) throw error;

      // Reverse back to ascending for the UI
      const sortedMessages = (messages || []).slice().reverse() as TeamMessage[];
      
      return {
        messages: sortedMessages,
        nextCursor: messages?.length === MESSAGES_PER_PAGE ? pageParam + MESSAGES_PER_PAGE : null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!conversationId && !!profile,
    initialPageParam: 0,
  });

  // Flatten messages from all pages and ensure chronological order (ascending)
  // Since useInfiniteQuery appends new pages at the END of data.pages, 
  // and each page contains older messages (because of DESC order in query),
  // we need to combine them such that the OLDEST messages (from later pages) are at the START.
  const messages = useMemo(() => {
    if (!data?.pages) return [];
    // pages[0] = newest 50
    // pages[1] = previous 50
    // ...
    // To display correctly in UI (oldest to newest): [...pages[last], ..., pages[1], pages[0]]
    const allMessages = [...data.pages].reverse().flatMap(page => page.messages);
    return allMessages;
  }, [data?.pages]);


  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`team-messages-${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_messages', filter: `conversation_id=eq.${conversationId}` }, () => {
        // For infinite scroll, we might need a more sophisticated strategy, 
        // but for now invalidating is safer to keep it consistent.
        queryClient.invalidateQueries({ queryKey: ['team-messages', conversationId] });
        queryClient.invalidateQueries({ queryKey: ['team-conversations'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, queryClient]);

  useEffect(() => {
    if (!conversationId || !profile) return;
    if (lastReadRef.current === conversationId) return;
    lastReadRef.current = conversationId;
    const timeout = setTimeout(() => {
      supabase.from('team_conversation_members').update({ last_read_at: new Date().toISOString() }).eq('conversation_id', conversationId).eq('profile_id', profile.id).then();
    }, 500);
    return () => clearTimeout(timeout);
  }, [conversationId, profile]);

  useEffect(() => {
    if (!conversationId || !profile || !messages.length) return;
    supabase.from('team_conversation_members').update({ last_read_at: new Date().toISOString() }).eq('conversation_id', conversationId).eq('profile_id', profile.id).then();
  }, [conversationId, profile, messages.length]);

  return {
    messages,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  };
}
