// @ts-nocheck
import { lazy, Suspense, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDensity } from '@/hooks/useDensity';
import { MobilePullToRefreshIndicator } from '@/components/mobile/MobilePullToRefresh';
import { VirtualizedRealtimeList } from './VirtualizedRealtimeList';
import { ErrorBoundary } from '@/components/errors/ErrorBoundary';
import { BulkActionsToolbar } from './BulkActionsToolbar';
import { InboxFilters } from './InboxFilters';
import { ContactTypeFilter, FILTER_OPTIONS } from './ContactTypeFilter';
import { FailureCategoryFilter } from './FailureCategoryFilter';
import { TicketTabs } from './TicketTabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Tooltips were removed from this header to avoid Radix Slot ref-loop bug
// (TooltipTrigger asChild on inline span/Button caused Maximum update depth).
// Replaced with native title/aria-label which are equivalent for these controls.
import { MessageSquare, RefreshCw, Search as SearchIcon, MessageSquarePlus, X, AlertTriangle, MessageCircle, LayoutList, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RealtimeContactsIndicator } from './RealtimeContactsIndicator';
import { WhatsAppConnectionStatus } from '@/features/connections';
import { useInboxShortcuts } from '../hooks/useInboxShortcuts';
import { toast } from 'sonner';


// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ConversationListSidebarProps {
  inbox: any;
  inboxFilters: any;
  bulkActions: any;
  pullToRefresh: any;
}

export function ConversationListSidebar({ inbox, inboxFilters, bulkActions, pullToRefresh }: ConversationListSidebarProps) {
  const isMobile = useIsMobile();
  const { density, setDensity } = useDensity();
  const contactSearchRef = useRef<HTMLInputElement>(null);
  const [contactSearch, setContactSearch] = useState('');
  
  const conversationsWithUnreadCount = useMemo(() => 
    inbox.conversations.filter((c: any) => c.unreadCount > 0).length,
    [inbox.conversations]
  );


  // Debounced search to prevent heavy filter calculations on every keystroke
  const debouncedSetSearch = useDebounce((value: string) => {
    inbox.setSearch(value);
  }, 250);

  // Sync local search to inbox filters
  const handleContactSearch = useCallback((value: string) => {
    setContactSearch(value);
    debouncedSetSearch(value);
  }, [debouncedSetSearch]);

  const clearContactSearch = useCallback(() => {
    setContactSearch('');
    inbox.setSearch('');
    contactSearchRef.current?.focus();
  }, [inbox]);


  const sortedFilteredIds = useMemo(() => 
    inboxFilters.filteredConversations.map((c: any) => c.contact.id), 
    [inboxFilters.filteredConversations]
  );

  const handleNextConversation = useCallback(() => {
    const currentId = inbox.selectedContactId;
    if (!currentId) {
      if (sortedFilteredIds.length > 0) inbox.handleSelectConversation(sortedFilteredIds[0]);
      return;
    }
    const idx = sortedFilteredIds.indexOf(currentId);
    if (idx >= 0 && idx < sortedFilteredIds.length - 1) {
      inbox.handleSelectConversation(sortedFilteredIds[idx + 1]);
    }
  }, [inbox, sortedFilteredIds]);

  const handlePrevConversation = useCallback(() => {
    const currentId = inbox.selectedContactId;
    if (!currentId) return;
    const idx = sortedFilteredIds.indexOf(currentId);
    if (idx > 0) {
      inbox.handleSelectConversation(sortedFilteredIds[idx - 1]);
    }
  }, [inbox, sortedFilteredIds]);

  useInboxShortcuts({
    onSearchFocus: () => contactSearchRef.current?.focus(),
    onNextConversation: handleNextConversation,
    onPrevConversation: handlePrevConversation,
    onArchive: () => {
      if (inbox.selectedContactId) {
        toast.info('Arquivando conversa...');
        // Hook internal handles real logic via context menu or bulk actions
      }
    },
    onTransfer: () => {
      if (inbox.selectedContactId) {
        // Dispatch event for UI to open transfer dialog
        window.dispatchEvent(new CustomEvent('open-transfer-dialog', { detail: { contactId: inbox.selectedContactId } }));
      }
    },
    onRefresh: () => inbox.refetch(),
  });

  return (
    <div className={cn(
      'h-full min-h-0 flex-shrink-0 relative z-10 border-r border-border/10 bg-background dark:bg-card flex flex-col overflow-hidden shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] transition-all duration-500',
      isMobile ? (inbox.selectedContactId ? 'hidden' : 'w-full') : 'w-[340px] min-w-[340px] max-w-[340px]'
    )}>
      <BulkActionsToolbar
        selectedCount={bulkActions.selectedIds.size}
        onMarkAsRead={bulkActions.bulkMarkAsRead}
        onTransfer={bulkActions.bulkTransfer}
        onArchive={bulkActions.bulkArchive}
        onClearSelection={bulkActions.clearSelection}
        isLoading={bulkActions.bulkLoading}
      />

      <div className={cn(
        "px-4 border-b border-border/20 shrink-0 transition-all", 
        isMobile ? "pt-2 pb-3 space-y-4" : (density === 'compact' ? "pt-3 pb-2 space-y-2 bg-muted/20" : "pt-8 pb-5 space-y-4 bg-muted/40 backdrop-blur-3xl")
      )}>
        {!isMobile && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className={cn(
                "font-extrabold text-foreground tracking-tight  bg-clip-text transition-all",
                density === 'compact' ? "text-[15px]" : "text-[18px]"
              )}>Inbox</h2>
              <span
                title={inbox.isOnline ? 'Mensagens: tempo real ativo' : 'Mensagens: desconectado'}
                className={cn('w-2 h-2 rounded-full ring-2 ring-background', inbox.isOnline ? 'bg-success shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-destructive shadow-[0_0_10px_rgba(244,63,94,0.5)]')}
                aria-label={inbox.isOnline ? 'Mensagens: online' : 'Mensagens: offline'}
              />
              <RealtimeContactsIndicator />
              <div className="h-4 w-px bg-border/40 mx-1" />
              <WhatsAppConnectionStatus />
            </div>

            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={inbox.refetch}
                disabled={inbox.loading}
                className="w-7 h-7 rounded-lg hover:bg-muted/60 active:scale-90 transition-all duration-150"
                aria-label="Atualizar"
                title="Atualizar"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', inbox.loading && 'animate-spin')} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => inbox.setShowNewConversation(true)}
                className="w-7 h-7 rounded-lg text-primary hover:bg-primary/10 active:scale-90 transition-all duration-150"
                aria-label="Nova conversa"
                title="Nova Conversa"
              >
                <MessageSquarePlus className="w-3.5 h-3.5" />
              </Button>
              
              <div className="h-4 w-px bg-border/40 mx-1" />

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDensity(density === 'compact' ? 'comfortable' : 'compact')}
                className="w-7 h-7 rounded-lg hover:bg-muted/60 active:scale-90 transition-all duration-150"
                aria-label={density === 'compact' ? "Modo Confortável" : "Modo Compacto"}
                title={density === 'compact' ? "Modo Confortável" : "Modo Compacto"}
              >
                {density === 'compact' ? <LayoutGrid className="w-3.5 h-3.5" /> : <LayoutList className="w-3.5 h-3.5" />}
              </Button>
              
              <div className="h-4 w-px bg-border/40 mx-0.5" />
              
              <Select value={inbox.sortBy} onValueChange={inbox.setSortBy}>
                <SelectTrigger className="w-auto h-7 text-[11px] font-medium border-none bg-transparent hover:bg-muted/60 rounded-lg px-2 gap-1.5 focus:ring-0">
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent align="end" className="w-[140px]">
                  <SelectItem value="lastMessage" className="text-xs font-semibold tracking-tight">Recentes</SelectItem>
                  <SelectItem value="unread" className="text-xs font-semibold tracking-tight">Não lidas</SelectItem>
                  <SelectItem value="name" className="text-xs font-semibold tracking-tight">Nome (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}


        <div className="flex items-center gap-1.5">
          <div className="relative flex-1 group">
            <SearchIcon className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 transition-all duration-300",
              "group-focus-within:text-primary group-focus-within:scale-110"
            )} />
            <Input
              ref={contactSearchRef}
              placeholder={isMobile ? "Buscar..." : "Buscar conversas..."}
              value={contactSearch}
              onChange={(e) => handleContactSearch(e.target.value)}
              className={cn(
                "pl-9 pr-8 bg-muted/40 hover:bg-muted/60 focus:bg-background border border-border/20 focus:border-primary/30 rounded-2xl  text-xs placeholder:text-muted-foreground/30 transition-all duration-500 shadow-sm focus:shadow-md",
                isMobile ? "h-[46px] text-[16px]" : (density === 'compact' ? "h-[34px] text-[12px]" : "h-[40px] text-[13px]")
              )}
              aria-label="Buscar conversa"
            />
            {contactSearch && (
              <Button variant="ghost" size="icon" onClick={clearContactSearch}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 md:w-7 md:h-7 hover:bg-transparent text-muted-foreground/40 hover:text-foreground transition-colors" aria-label="Limpar busca">
                <X className="w-4 h-4 md:w-3.5 md:h-3.5" />
              </Button>
            )}
            {!contactSearch && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 opacity-40 group-focus-within:opacity-0 transition-opacity duration-300">
                <kbd className="h-4 px-1 rounded bg-muted text-[9px]  flex items-center border border-border/50 text-muted-foreground">K</kbd>
              </div>
            )}
          </div>

          <div className={cn("shrink-0", isMobile ? "w-[130px]" : "w-[130px]")}>
            <ContactTypeFilter value={inboxFilters.selectedContactType} onChange={inboxFilters.handleContactTypeChange} conversations={inbox.cachedConversations} />
          </div>
          <Button
            variant={inbox.statusFilter === 'unread' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => inbox.setStatusFilter(inbox.statusFilter === 'unread' ? 'all' : 'unread')}
            className={cn(
              'shrink-0 relative active:scale-90 transition-all duration-150',
              isMobile ? 'w-8 h-8 rounded-lg' : 'w-7 h-7 rounded-md',
              inbox.statusFilter === 'unread'
                ? 'bg-warning text-foreground hover:bg-warning'
                : 'hover:bg-muted/60 text-muted-foreground'
            )}
            aria-label={inbox.statusFilter === 'unread' ? 'Mostrar todas' : 'Mostrar apenas não lidas'}
            title={inbox.statusFilter === 'unread' ? 'Mostrar todas' : 'Apenas não lidas'}
          >
            <MessageCircle className={cn(isMobile ? 'w-4 h-4' : 'w-3.5 h-3.5')} />
            {conversationsWithUnreadCount > 0 && inbox.statusFilter !== 'unread' && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-warning text-foreground text-[9px] font-semibold leading-none flex items-center justify-center tabular-nums shadow-sm"
              >
                {conversationsWithUnreadCount > 99 ? '99+' : conversationsWithUnreadCount}
              </span>
            )}
          </Button>

          {inboxFilters.showOnlyRetrying && (
            <FailureCategoryFilter
              value={inboxFilters.failureCategoryFilter}
              onChange={inboxFilters.setFailureCategoryFilter}
              counts={inboxFilters.failureCategoryCounts}
            />
          )}
        </div>

        <div className={cn("transition-all duration-300", density === 'compact' ? "scale-[0.96] origin-top" : "")}>
          <TicketTabs
            conversations={inbox.allConversations || inbox.conversations}
            mainTab={inboxFilters.mainTab}
            subTab={inboxFilters.subTab}
            onMainTabChange={inboxFilters.setMainTab}
            onSubTabChange={inboxFilters.setSubTab}
            showAll={inboxFilters.showAll}
            onShowAllChange={inboxFilters.setShowAll}
            scope={inboxFilters.scope}
            onScopeChange={inboxFilters.setScope}
            selectedQueueId={inboxFilters.selectedQueueId}
            onQueueChange={inboxFilters.setSelectedQueueId}
            contactType={inboxFilters.selectedContactType}
            onContactTypeChange={inboxFilters.handleContactTypeChange}
          />
        </div>


        <div className={cn("transition-all duration-300", density === 'compact' ? "scale-[0.96] origin-top -mt-1" : "")}>
          <InboxFilters filters={inboxFilters.filters} onFiltersChange={inboxFilters.setFilters} />
        </div>
      </div>

      {isMobile && (
        <MobilePullToRefreshIndicator
          isRefreshing={pullToRefresh.isRefreshing}
          pullProgress={pullToRefresh.pullProgress}
          pullDistance={pullToRefresh.pullDistance}
        />
      )}

      <div
        ref={pullToRefresh.containerRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
        {...(isMobile ? pullToRefresh.handlers : {})}
      >
        {inbox.loading ? (
          <div className="p-3 space-y-1">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06, duration: 0.3, ease: 'easeOut' }}
                className="flex items-center gap-3 p-2.5 rounded-xl"
              >
                <Skeleton className="w-11 h-11 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3.5 rounded-md" style={{ width: `${60 + Math.random() * 40}%` }} />
                    <Skeleton className="h-3 w-10 rounded-md" />
                  </div>
                  <Skeleton className="h-3 rounded-md" style={{ width: `${40 + Math.random() * 30}%` }} />
                </div>
              </motion.div>
            ))}
          </div>
        ) : inboxFilters.filteredConversations.length === 0 ? (
          (() => {
            const activeOpt = FILTER_OPTIONS.find(o => o.value === (inboxFilters.selectedContactType || 'all'));
            const EmptyIcon = activeOpt?.icon || MessageSquare;
            const emptyMessages: Record<string, string> = {
              individual: 'Nenhum chat individual encontrado',
              grupo: 'Nenhum grupo encontrado',
              grupo_orcamentos: 'Nenhum orçamento em aberto',
              grupo_aprovacao: 'Nenhuma aprovação pendente',
              grupo_os: 'Nenhuma O.S. encontrada',
              grupo_acerto: 'Nenhum acerto pendente',
              grupo_sem_categoria: 'Nenhum grupo sem categoria',
              cliente: 'Nenhum cliente encontrado',
              colaborador: 'Nenhum colaborador encontrado',
              fornecedor: 'Nenhum fornecedor encontrado',
              prestador_servico: 'Nenhum prestador encontrado',
              transportadora: 'Nenhuma transportadora encontrada',
            };
            const msg = inboxFilters.search ? 'Nenhuma conversa encontrada' : emptyMessages[inboxFilters.selectedContactType || ''] || 'Sem conversas';
            return (
              <motion.div 
                key={inboxFilters.selectedContactType || 'all'} 
                initial={{ opacity: 0, y: 8 }} 
                animate={{ opacity: 1, y: 0 }} 
                className={cn("text-center", density === 'compact' ? "p-4" : "p-8")}
              >
                <EmptyIcon className={cn('mx-auto mb-3 transition-all duration-300', density === 'compact' ? 'w-7 h-7' : 'w-10 h-10', activeOpt?.iconColor || 'text-muted-foreground/30')} />
                <p className={cn("text-muted-foreground", density === 'compact' ? "text-[12px]" : "text-sm")}>{msg}</p>
              </motion.div>
            );
          })()
        ) : (
          <ErrorBoundary
            fallback={<div className="p-8 text-center"><MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" /><p className="text-sm text-muted-foreground">Erro ao carregar. Recarregue.</p></div>}
          >
            <VirtualizedRealtimeList
              conversations={inboxFilters.filteredConversations}

              selectedContactId={inbox.selectedContactId}
              onSelectConversation={inbox.handleSelectConversation}
              selectionMode={bulkActions.selectionMode}
              selectedIds={bulkActions.selectedIds}
              onToggleSelection={bulkActions.toggleSelection}
            />
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
}
