import { useState, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';
import { Conversation } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, StaggeredList, StaggeredItem } from '@/components/ui/motion';
import { SLAIndicatorForContact } from './SLAIndicatorForContact';
import { ConversationContextMenu } from './ConversationContextMenu';
import { ThreadSLASettingsDialog } from './ThreadSLASettingsDialog';
import { useExternalContact360Batch, CRMBatchResult } from '@/hooks/useExternalContact360Batch';
import { isExternalConfigured } from '@/integrations/supabase/externalClient';
import {
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Building,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/** Renders CRM company badge from pre-fetched batch data (no individual RPC call). */

function CRMConversationBadge({ crmInfo }: { crmInfo: CRMBatchResult | undefined }) {
  if (!crmInfo?.company_name) return null;
  return (
    <div className="flex items-center gap-1 mt-0.5">
      <Sparkles className="w-3 h-3 text-primary/60 shrink-0" />
      <span className="text-[10px] text-primary/70 truncate max-w-[140px]">
        {crmInfo.company_name}
      </span>
    </div>
  );
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedId?: string;
  onSelect: (conversation: Conversation) => void;
}

const statusIcons = {
  open: AlertCircle,
  pending: Clock,
  resolved: CheckCircle2,
  waiting: Loader2,
};

const statusColors = {
  open: 'bg-status-open',
  pending: 'bg-status-pending',
  resolved: 'bg-status-resolved',
  waiting: 'bg-status-waiting',
};

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
}: ConversationListProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [slaSettingsThreadId, setSlaSettingsThreadId] = useState<string | null>(null);
  const [isSlaDialogOpen, setIsSlaDialogOpen] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

  // Batch CRM lookup: collect all phones, make 1 single RPC call
  const allPhones = useMemo(
    () => conversations.map((c) => c.contact.phone),
    [conversations]
  );
  const { lookup: crmLookup } = useExternalContact360Batch(allPhones);

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
    estimateSize: () => 73, // 72px item + 1px border
    overscan: 10,
  });

  return (
    <div className="flex flex-col h-full bg-background border-r border-border overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-border bg-background space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground select-none">Conversas</h2>
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
            className="pl-10 pr-4 h-[40px] md:h-[35px] bg-card border-none rounded-lg text-[16px] md:text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 transition-all"
          />
        </div>

        {/* Tabs */}
        <Tabs value={filter} onValueChange={setFilter} className="w-full">
          <TabsList className="w-full h-8 p-1 bg-card border-none rounded-lg">
            {[
              { id: 'all', label: 'Todas', count: counts.all },
              { id: 'open', label: 'Abertas', count: counts.open },
              { id: 'pending', label: 'Pendentes', count: counts.pending },
              { id: 'waiting', label: 'Aguardando', count: counts.waiting }
            ].map((t) => (
              <TabsTrigger 
                key={t.id}
                value={t.id} 
                className="flex-1 text-[11px] h-6 rounded-md data-[state=active]:bg-accent data-[state=active]:text-primary text-muted-foreground hover:text-foreground transition-all"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>


      {/* Conversations List */}
      <div ref={parentRef} className="flex-1 overflow-y-auto scrollbar-none" role="listbox" aria-label="Lista de conversas">
        {filteredConversations.length === 0 ? (
          <div className="flex items-center justify-center h-full p-4">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-card">
                <Search className="w-7 h-7 text-muted-foreground" />
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
                  className="p-0"
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
                  <div
                    role="option"
                    tabIndex={0}
                    aria-selected={isSelected}
                    onClick={() => onSelect(conversation)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(conversation); } }}
                    className={cn(
                      'relative p-0 cursor-pointer transition-colors duration-200 outline-none h-full',
                      isSelected ? 'bg-accent' : 'hover:bg-card bg-background'
                    )}
                  >
                    <div className="px-3 h-full">
                      <div className="flex items-center gap-3 py-3 border-b border-border h-full">
                        <div className="relative flex-shrink-0">
                          <Avatar className="w-[49px] h-[49px] ring-0">
                            <AvatarImage 
                              src={conversation.contact.avatar} 
                              referrerPolicy="no-referrer" 
                              onError={(e) => { (e.target as HTMLImageElement).removeAttribute('src'); }}
                            />
                            <AvatarFallback className="bg-primary/5 text-primary text-sm font-semibold">
                              {conversation.contact.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-[14px] leading-tight text-foreground truncate">
                              {conversation.contact.name}
                            </span>
                            <span className="text-[11px] leading-tight text-muted-foreground tabular-nums flex-shrink-0 ml-2">
                              {formatDistanceToNow(conversation.updatedAt, { addSuffix: false, locale: ptBR })}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <p className={cn(
                              "text-[13px] leading-tight truncate pr-2",
                              conversation.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground font-normal"
                            )}>
                              {conversation.lastMessage?.content || 'Sem mensagens'}
                            </p>
                            {conversation.unreadCount > 0 && (
                              <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-[10px] font-bold bg-primary text-background">
                                {conversation.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
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
