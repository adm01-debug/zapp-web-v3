import { useState, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import { Conversation } from '@/types/chat';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from '@/components/ui/motion';
import { Search, Filter } from 'lucide-react';
import { ConversationItem } from './conversation-list/ConversationItem';
import { useDensity } from '@/hooks/useDensity';

const ITEM_HEIGHT = 140;
const COMPACT_ITEM_HEIGHT = 80;

interface VirtualizedConversationListProps {
  conversations: Conversation[];
  selectedId?: string;
  onSelect: (conversation: Conversation) => void;
  compactMode?: boolean;
  onArchive?: (conversation: Conversation) => void;
  onMarkRead?: (conversation: Conversation) => void;
}

export function VirtualizedConversationList({ conversations, selectedId, onSelect, compactMode: forceCompact = false }: VirtualizedConversationListProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const parentRef = useRef<HTMLDivElement>(null);
  const { density } = useDensity();
  const isCompactMode = density === 'compact' || density === 'dense' || forceCompact;
  const itemHeight = isCompactMode ? 64 : 78; // Consistência com ConversationList.tsx

  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      const matchesSearch = conv.contact.name.toLowerCase().includes(search.toLowerCase()) || conv.contact.phone.includes(search);
      const matchesFilter = filter === 'all' || conv.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [conversations, search, filter]);

  const counts = useMemo(() => ({
    all: conversations.length,
    open: conversations.filter((c) => c.status === 'open').length,
    pending: conversations.filter((c) => c.status === 'pending').length,
    waiting: conversations.filter((c) => c.status === 'waiting').length,
  }), [conversations]);

  const virtualizer = useVirtualizer({
    count: filteredConversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: 5,
  });

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-border/30">
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.4, ease: "easeOut" }} 
        className={cn("p-5 border-b border-border/10 bg-sidebar/50 backdrop-blur-md sticky top-0 z-20", compactMode ? "space-y-3" : "space-y-5")}
      >
        <div className="flex items-center justify-between">
          <h2 className={cn("font-display font-semibold tracking-normal text-foreground/90", compactMode ? "text-[14px]" : "text-[15px]")}>
            Conversas
          </h2>
          <div className="flex items-center gap-1">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10 text-muted-foreground transition-all">
                <Filter className="w-3.5 h-3.5" />
              </Button>
            </motion.div>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
            <Search className="w-3.5 h-3.5 text-muted-foreground/50 transition-colors group-focus-within:text-primary group-focus-within:scale-110 duration-300" />
          </div>
          <Input 
            placeholder="Buscar por nome ou telefone..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className={cn(
              "pl-10 h-9 bg-muted/20 border-border/20 rounded-full text-xs font-light tracking-tight transition-all duration-300",
              "placeholder:text-muted-foreground/40",
              "focus:bg-background focus:border-primary/30 focus:ring-4 focus:ring-primary/5 shadow-sm",
              compactMode && "h-8"
            )} 
          />
        </div>

        <Tabs value={filter} onValueChange={setFilter} className="w-full">
          <TabsList className={cn(
            "w-full h-9 p-1 bg-muted/20 border-none rounded-lg gap-1", 
            compactMode && "h-8"
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
                  "flex-1 text-[11px] font-normal tracking-tight rounded-md transition-all duration-300",
                  "data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:font-medium",
                  "text-muted-foreground/70 hover:text-foreground/80",
                  compactMode && "text-[9px] py-0.5"
                )}
              >
                {t.label}
                <span className="ml-1 opacity-50 font-light text-[10px]">{t.count}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </motion.div>

      <div ref={parentRef} className="flex-1 overflow-auto scrollbar-thin" role="listbox" aria-label="Lista de conversas virtualizada">
        {filteredConversations.length === 0 ? (
          <EmptyState icon={Search} title="Nenhuma conversa encontrada" description="Ajuste os filtros ou aguarde novas mensagens chegarem" illustration="inbox" size="sm" />
        ) : (
          <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const conversation = filteredConversations[virtualRow.index];
              return (
                <div key={virtualRow.key} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)` }}>
                  <ConversationItem conversation={conversation} isSelected={selectedId === conversation.id} onSelect={onSelect} compact={compactMode} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
