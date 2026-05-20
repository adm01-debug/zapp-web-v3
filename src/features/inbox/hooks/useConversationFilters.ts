import { useState, useMemo } from 'react';
import { ConversationWithMessages } from '@/features/inbox';

export type ConversationSort = 'lastMessage' | 'unread' | 'name';

export function useConversationFilters(conversations: ConversationWithMessages[]) {
  const [search, setSearch] = useState('');
  const [statusFilter, setFilter] = useState<'all' | 'open' | 'closed' | 'unread'>('all');
  const [sortBy, setSortBy] = useState<ConversationSort>('lastMessage');

  const filteredConversations = useMemo(() => {
    let filtered = [...conversations];

    // 1. Search
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(conv => 
        conv.contact.name.toLowerCase().includes(q) ||
        conv.contact.phone.includes(q) ||
        conv.lastMessage?.content?.toLowerCase().includes(q)
      );
    }

    // 2. Status Filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(conv => {
        if (statusFilter === 'unread') return conv.unreadCount > 0;
        // Logic for open/closed depends on where status is stored. 
        // For now using contact.contact_type or similar if available, 
        // but often it's in a separate 'team_conversations' table.
        // Assuming standard status if available.
        return true; 
      });
    }

    // 3. Sorting
    filtered.sort((a, b) => {
      if (sortBy === 'unread') {
        if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
      }
      
      if (sortBy === 'name') {
        return a.contact.name.localeCompare(b.contact.name);
      }

      // Default: lastMessage
      const aTime = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : new Date(a.contact.created_at).getTime();
      const bTime = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : new Date(b.contact.created_at).getTime();
      return bTime - aTime;
    });

    return filtered;
  }, [conversations, search, statusFilter, sortBy]);

  return {
    search,
    setSearch,
    statusFilter,
    setFilter,
    sortBy,
    setSortBy,
    filteredConversations
  };
}
