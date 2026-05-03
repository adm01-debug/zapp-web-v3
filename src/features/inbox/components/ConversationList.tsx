import { useState, useMemo } from 'react';
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

  return (
    <div className="flex flex-col h-full bg-[#111b21] border-r border-[#222d34]">
      {/* Header */}
      <div className="p-3 border-b border-[#222d34] bg-[#111b21] space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#e9edef]">Conversas</h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" aria-label="Filtrar conversas" className="w-8 h-8 rounded-full text-[#8696a0] hover:bg-[#2a3942] hover:text-[#e9edef]">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
            <Search className="w-4 h-4 text-[#8696a0] group-focus-within:text-[#00a884] transition-colors" />
          </div>
          <Input
            placeholder="Buscar conversas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 h-[35px] bg-[#202c33] border-none rounded-lg text-sm text-[#e9edef] placeholder:text-[#8696a0] focus-visible:ring-0 focus-visible:ring-offset-0 transition-all"
          />
        </div>

        {/* Tabs */}
        <Tabs value={filter} onValueChange={setFilter} className="w-full">
          <TabsList className="w-full h-8 p-1 bg-[#202c33] border-none rounded-lg">
            {[
              { id: 'all', label: 'Todas', count: counts.all },
              { id: 'open', label: 'Abertas', count: counts.open },
              { id: 'pending', label: 'Pendentes', count: counts.pending },
              { id: 'waiting', label: 'Aguardando', count: counts.waiting }
            ].map((t) => (
              <TabsTrigger 
                key={t.id}
                value={t.id} 
                className="flex-1 text-[11px] h-6 rounded-md data-[state=active]:bg-[#2a3942] data-[state=active]:text-[#00a884] text-[#8696a0] hover:text-[#e9edef] transition-all"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>


      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin" role="listbox" aria-label="Lista de conversas">
        {filteredConversations.length === 0 ? (
          <div className="flex items-center justify-center h-full p-4">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'var(--gradient-primary)' }}
              >
                <Search className="w-7 h-7 text-primary-foreground" />
              </motion.div>
              <h3 className="font-semibold text-foreground mb-1">Nenhuma conversa</h3>
              <p className="text-sm text-muted-foreground max-w-[200px]">
                {search ? 'Nenhum resultado para sua busca' : 'Suas conversas aparecerão aqui'}
              </p>
            </motion.div>
          </div>
        ) : (
          <div className="p-0 space-y-0">
            {filteredConversations.map((conversation) => {
              const isSelected = selectedId === conversation.id;

              return (
                <div key={conversation.id} className="p-0">
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
                      'relative p-0 cursor-pointer transition-colors duration-200 outline-none',
                      isSelected ? 'bg-[#2a3942]' : 'hover:bg-[#202c33] bg-[#111b21]'
                    )}
                  >
                    <div className="px-3">
                      <div className="flex items-center gap-3 py-3 border-b border-[#222d34]">

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
                            <span className="font-normal text-[17px] text-[#e9edef] truncate">
                              {conversation.contact.name}
                            </span>
                            <span className="text-[12px] text-[#8696a0] tabular-nums">
                              {formatDistanceToNow(conversation.updatedAt, { addSuffix: false, locale: ptBR })}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <p className={cn(
                              "text-[14px] truncate pr-2",
                              conversation.unreadCount > 0 ? "text-[#e9edef]" : "text-[#8696a0]"
                            )}>
                              {conversation.lastMessage?.content || 'Sem mensagens'}
                            </p>
                            {conversation.unreadCount > 0 && (
                              <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-[10px] font-bold bg-[#00a884] text-[#111b21]">
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
