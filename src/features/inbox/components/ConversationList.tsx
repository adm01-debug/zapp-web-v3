import { useState, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';
import { Conversation } from '@/types/chat';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConversationItem } from './conversation-list/ConversationItem';
import { ConversationContextMenu } from './ConversationContextMenu';
import { useDensity } from '@/hooks/useDensity';
import {
  Search,
  Filter,
} from 'lucide-react';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId?: string;
  onSelect: (conversation: Conversation) => void;
  isLoading?: boolean;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  isLoading = false,
}: ConversationListProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const parentRef = useRef<HTMLDivElement>(null);

  const filteredConversations = useMemo(() => {
    const q = search.toLowerCase();
    return conversations.filter((conv) => {
      const matchesSearch = !q || 
        conv.contact.name.toLowerCase().includes(q) ||
        conv.contact.phone.includes(q) ||
        (conv.lastMessage?.content?.toLowerCase().includes(q));
      const matchesFilter = filter === 'all' || conv.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [conversations, search, filter]);

  const counts = useMemo(() => {
    const c = { all: conversations.length, open: 0, pending: 0, waiting: 0 };
    for (const conv of conversations) {
      if (conv.status === 'open') c.open++;
      else if (conv.status === 'pending') c.pending++;
      else if (conv.status === 'waiting') c.waiting++;
    }
    return c;
  }, [conversations]);

  const virtualizer = useVirtualizer({
    count: filteredConversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 78, // Based on ConversationItem min-h
    overscan: 10,
  });

  return (
    <div className="flex flex-col h-full bg-background border-r border-border overflow-hidden font-sans">
      {/* Header */}
      <div className="p-3 border-b border-border bg-background space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground select-none tracking-tight">Conversas</h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" aria-label="Filtrar conversas" className="w-8 h-8 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-10">
            <Search className="w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          </div>
          <Input
            placeholder="Buscar conversas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 h-[36px] bg-muted/30 border-none rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:bg-background transition-all"
          />
        </div>

        {/* Tabs */}
        <Tabs value={filter} onValueChange={setFilter} className="w-full">
          <TabsList className="w-full h-9 p-1 bg-muted/30 border-none rounded-xl">
            {[
              { id: 'all', label: 'Todas', count: counts.all },
              { id: 'open', label: 'Abertas', count: counts.open },
              { id: 'pending', label: 'Pendentes', count: counts.pending },
              { id: 'waiting', label: 'Aguardando', count: counts.waiting }
            ].map((t) => (
              <TabsTrigger 
                key={t.id}
                value={t.id} 
                className="flex-1 text-[11px] font-semibold h-7 rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground transition-all"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Conversations List */}
      <div ref={parentRef} className="flex-1 overflow-y-auto scrollbar-none" role="listbox" aria-label="Lista de conversas">
        {isLoading ? (
          <div className="space-y-0">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-3 border-b border-border animate-pulse flex items-start gap-3.5">
                <div className="w-[49px] h-[49px] rounded-full bg-muted shrink-0" />
                <div className="flex-1 min-w-0 space-y-2 py-1">
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-24 bg-muted rounded" />
                    <div className="h-3 w-10 bg-muted rounded" />
                  </div>
                  <div className="h-3.5 w-full bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex items-center justify-center h-full p-4">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-muted/30">
                <Search className="w-7 h-7 text-muted-foreground/50" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Nenhuma conversa</h3>
              <p className="text-sm text-muted-foreground max-w-[200px]">
                {search ? 'Nenhum resultado para sua busca' : 'Suas conversas aparecerão aqui'}
              </p>
            </div>
          </div>
        ) : (
          <div 
            style={{ 
              height: `${virtualizer.getTotalSize()}px`, 
              width: '100%', 
              position: 'relative' 
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const conversation = filteredConversations[virtualRow.index];
              const isSelected = selectedId === conversation.id;

              return (
                <div 
                  key={virtualRow.key} 
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <ConversationContextMenu
                    conversationId={conversation.id}
                    contactName={conversation.contact.name}
                    isMuted={conversation.is_muted}
                  >
                    <ConversationItem 
                      conversation={conversation}
                      isSelected={isSelected}
                      onSelect={onSelect}
                    />
                  </ConversationContextMenu>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
