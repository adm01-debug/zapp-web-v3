// @ts-nocheck
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
import { MOCK_CONVERSATIONS } from './conversation-list/__mocks__/mockConversations';

/**
 * DEV ONLY: Quando `localStorage.setItem('mockConversations', '1')` está ativo,
 * a sidebar exibe um conjunto rico de dados mockados para análise visual do layout.
 * Para desligar: `localStorage.removeItem('mockConversations')` e recarregar.
 */
const USE_MOCKS =
  typeof window !== 'undefined' &&
  window.localStorage?.getItem('mockConversations') === '1';
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
  const { density } = useDensity();
  const isCompactMode = density === 'compact' || density === 'dense';

  const sourceConversations = USE_MOCKS ? MOCK_CONVERSATIONS : conversations;

  const filteredConversations = useMemo(() => {
    const q = search.toLowerCase();
    return sourceConversations.filter((conv) => {
      const matchesSearch = !q || 
        conv.contact.name.toLowerCase().includes(q) ||
        conv.contact.phone.includes(q) ||
        (conv.lastMessage?.content?.toLowerCase().includes(q));
      const matchesFilter = filter === 'all' || conv.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [sourceConversations, search, filter]);

  const counts = useMemo(() => {
    const c = { all: sourceConversations.length, open: 0, pending: 0, waiting: 0 };
    for (const conv of sourceConversations) {
      if (conv.status === 'open') c.open++;
      else if (conv.status === 'pending') c.pending++;
      else if (conv.status === 'waiting') c.waiting++;
    }
    return c;
  }, [sourceConversations]);

  const virtualizer = useVirtualizer({
    count: filteredConversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => isCompactMode ? 64 : 78,
    overscan: 10,
  });

  return (
    <div className="flex flex-col h-full bg-background border-r border-border overflow-hidden ">
      {/* Header */}
      <div className={cn(
        "border-b border-border bg-background shrink-0",
        isCompactMode ? "p-2 space-y-2" : "p-3 space-y-3"
      )}>
        <div className="flex items-center justify-between">
          <h2 className={cn(
            "font-bold text-foreground select-none tracking-tight",
            isCompactMode ? "text-[15px]" : "text-lg"
          )}>Conversas</h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" aria-label="Filtrar conversas" className={cn(
              "rounded-full text-muted-foreground hover:bg-accent hover:text-foreground",
              isCompactMode ? "w-7 h-7" : "w-8 h-8"
            )}>
              <Filter className={cn(isCompactMode ? "w-3.5 h-3.5" : "w-4 h-4")} />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-10">
            <Search className={cn(
              "text-muted-foreground group-focus-within:text-primary transition-colors",
              isCompactMode ? "w-3.5 h-3.5" : "w-4 h-4"
            )} />
          </div>
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              "pl-9 pr-4 bg-muted/30 border-none rounded-xl text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:bg-background transition-all",
              isCompactMode ? "h-[30px] text-[12px]" : "h-[36px] text-sm"
            )}
          />
        </div>

        {/* Tabs */}
        <Tabs value={filter} onValueChange={setFilter} className="w-full">
          <TabsList className={cn(
            "w-full p-1 bg-muted/30 border-none rounded-xl",
            isCompactMode ? "h-8" : "h-9"
          )}>
            {[
              { id: 'all', label: 'Todas', count: counts.all },
              { id: 'open', label: 'Abertas', count: counts.open },
              { id: 'pending', label: 'Pendentes', count: counts.pending },
              { id: 'waiting', label: 'Aguardando', count: counts.waiting }
            ].map((t) => (
              <TabsTrigger 
                key={t.id}
                value={t.id} 
                className={cn(
                  "flex-1 font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground transition-all",
                  isCompactMode ? "text-[10px] h-6" : "text-[11px] h-7"
                )}
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
              <div className={cn(
                "rounded-full flex items-center justify-center mx-auto bg-muted/30",
                isCompactMode ? "w-12 h-12 mb-3" : "w-16 h-16 mb-4"
              )}>
                <Search className={cn("text-muted-foreground/50", isCompactMode ? "w-5 h-5" : "w-7 h-7")} />
              </div>
              <h3 className={cn("font-semibold text-foreground mb-1", isCompactMode ? "text-[13px]" : "text-base")}>Nenhuma conversa</h3>
              <p className={cn("text-muted-foreground max-w-[200px] mx-auto", isCompactMode ? "text-[11px]" : "text-sm")}>
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
