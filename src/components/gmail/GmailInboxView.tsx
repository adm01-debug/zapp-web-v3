import { useState, useEffect } from 'react';
import { Mail, Inbox, Send, Star, Trash2, Tag, ChevronRight, ChevronDown, Loader2, RefreshCw, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useGmail } from '@/hooks/useGmail';
import { GmailAccountSelector } from './GmailAccountSelector';
import { EmailSearchBar } from '../email/EmailSearchBar';
import { EmailThreadList } from '../email/EmailThreadList';
import { EmailChatThread } from '../email/EmailChatThread';
import { EmailContactPanel } from '../email/EmailContactPanel';
import { type GmailLabel } from '@/hooks/gmail/gmailTypes';

interface GmailInboxViewProps {
  className?: string;
}

const SYSTEM_LABELS = [
  { id: 'INBOX', name: 'Inbox', icon: Inbox },
  { id: 'SENT', name: 'Enviados', icon: Send },
  { id: 'STARRED', name: 'Com estrela', icon: Star },
  { id: 'TRASH', name: 'Lixeira', icon: Trash2 },
];

export function GmailInboxView({ className }: GmailInboxViewProps) {
  const {
    threads,
    selectedThread,
    messages,
    isLoadingThreads,
    isLoadingMessages,
    isSyncing,
    hasMore,
    error,
    activeAccountId,
    accounts,
    tokenStatus,
    selectThread,
    setActiveAccountId,
    syncNow,
    loadMore,
    startOAuth,
    disconnect,
  } = useGmail();

  const [activeLabel, setActiveLabel] = useState<string>('INBOX');
  const [userLabels, setUserLabels] = useState<GmailLabel[]>([]);
  const [showLabels, setShowLabels] = useState(false);
  const [showContactPanel, setShowContactPanel] = useState(false);

  // Carrega labels do Supabase
  useEffect(() => {
    if (!activeAccountId) return;
    supabase
      .from('gmail_labels')
      .select('*')
      .eq('account_id', activeAccountId)
      .eq('type', 'user')
      .order('name')
      .then(({ data }) => setUserLabels((data ?? []) as GmailLabel[]));
  }, [activeAccountId]);

  // Filtra threads pelo label selecionado
  const filteredThreads = threads.filter(t => {
    if (activeLabel === 'INBOX') return t.label_ids.includes('INBOX');
    if (activeLabel === 'SENT') return t.label_ids.includes('SENT');
    if (activeLabel === 'STARRED') return t.label_ids.includes('STARRED');
    if (activeLabel === 'TRASH') return t.label_ids.includes('TRASH');
    return t.label_ids.includes(activeLabel);
  });

  const totalUnread = threads.filter(t => t.unread_count > 0).length;

  return (
    <div className={cn('flex h-full overflow-hidden bg-background', className)}>
      {/* Sidebar: Labels + Account */}
      <div className="w-56 shrink-0 border-r flex flex-col">
        {/* Account selector */}
        <div className="p-3 border-b">
          <GmailAccountSelector
            accounts={accounts}
            activeAccountId={activeAccountId}
            tokenStatus={tokenStatus}
            isSyncing={isSyncing}
            onSelectAccount={setActiveAccountId}
            onAddAccount={startOAuth}
            onDisconnect={disconnect}
            onSync={syncNow}
            totalUnread={totalUnread}
          />
        </div>

        {/* Compose button */}
        <div className="p-3">
          <Button size="sm" className="w-full gap-2 h-8" onClick={() => {}}>
            <Plus className="h-4 w-4" />
            Novo Email
          </Button>
        </div>

        <Separator />

        {/* System labels */}
        <ScrollArea className="flex-1">
          <nav className="py-2 space-y-0.5 px-2">
            {SYSTEM_LABELS.map(({ id, name, icon: Icon }) => {
              const count = id === 'INBOX' ? totalUnread : threads.filter(t => t.label_ids.includes(id) && t.unread_count > 0).length;
              return (
                <button
                  key={id}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors',
                    activeLabel === id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-muted/60 text-foreground/80'
                  )}
                  onClick={() => { setActiveLabel(id); selectThread(null); }}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">{name}</span>
                  {count > 0 && (
                    <Badge className="h-4 text-[10px] px-1.5">{count > 99 ? '99+' : count}</Badge>
                  )}
                </button>
              );
            })}

            {/* User labels */}
            {userLabels.length > 0 && (
              <>
                <Separator className="my-2" />
                <button
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowLabels(v => !v)}
                >
                  {showLabels ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  <Tag className="h-3.5 w-3.5" />
                  <span>Labels</span>
                </button>
                {showLabels && userLabels.map(label => (
                  <button
                    key={label.label_id}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors pl-8',
                      activeLabel === label.label_id
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-muted/60 text-foreground/70'
                    )}
                    onClick={() => { setActiveLabel(label.label_id); selectThread(null); }}
                  >
                    <div
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: label.color_bg ?? '#6B7280' }}
                    />
                    <span className="flex-1 text-left truncate">{label.name}</span>
                    {label.messages_unread > 0 && (
                      <Badge className="h-3.5 text-[9px] px-1">{label.messages_unread}</Badge>
                    )}
                  </button>
                ))}
              </>
            )}
          </nav>
        </ScrollArea>
      </div>

      {/* Thread list */}
      <div className="w-80 shrink-0 border-r flex flex-col">
        <div className="p-3 border-b">
          <EmailSearchBar
            accountId={activeAccountId}
            onSelectThread={(result) => {
              const t = threads.find(th => th.id === result.id || th.thread_id === result.thread_id);
              if (t) selectThread(t);
            }}
          />
        </div>

        <EmailThreadList
          threads={filteredThreads}
          selectedThreadId={selectedThread?.id}
          accountId={activeAccountId}
          isLoading={isLoadingThreads}
          hasMore={hasMore}
          onSelectThread={selectThread}
          onLoadMore={loadMore}
          onRefresh={syncNow}
          className="flex-1"
        />
      </div>

      {/* Thread view */}
      <div className="flex-1 min-w-0 h-full overflow-hidden">
        {selectedThread ? (
          <EmailChatThread
            thread={selectedThread}
            messages={messages}
            accountId={activeAccountId ?? ''}
            isLoading={isLoadingMessages}
            onBack={() => selectThread(null)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
            <Mail className="h-16 w-16 opacity-10" />
            <div className="text-center">
              <p className="font-medium">Selecione um email</p>
              <p className="text-sm mt-1">Escolha uma conversa na lista para visualizar</p>
            </div>
          </div>
        )}
      </div>

      {/* Contact panel (opcional) */}
      {showContactPanel && selectedThread && (
        <div className="w-72 shrink-0 border-l overflow-hidden">
          <EmailContactPanel
            thread={selectedThread}
            messages={messages}
            accountId={activeAccountId}
          />
        </div>
      )}
    </div>
  );
}
