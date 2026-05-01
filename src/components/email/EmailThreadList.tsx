import { useState, useCallback, useRef, useEffect } from 'react';
import { Mail, Star, StarOff, RefreshCw, Filter, Loader2, AlertTriangle, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { type GmailThread } from '@/hooks/gmail/gmailTypes';
import { SLADot } from './EmailSLABadge';
import { useEmailSLA } from '@/hooks/useEmailSLA';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type FilterValue = 'all' | 'unread' | 'starred' | 'sent';

interface EmailThreadListProps {
  threads: GmailThread[];
  selectedThreadId?: string | null;
  accountId: string | null;
  isLoading?: boolean;
  hasMore?: boolean;
  onSelectThread: (thread: GmailThread) => void;
  onLoadMore?: () => void;
  onRefresh?: () => void;
  className?: string;
}

function ThreadListItem({
  thread,
  selected,
  slaStatus,
  onClick,
}: {
  thread: GmailThread;
  selected: boolean;
  slaStatus: ReturnType<ReturnType<typeof useEmailSLA>['getStatus']>;
  onClick: () => void;
}) {
  const isUnread = thread.unread_count > 0;
  const isStarred = thread.label_ids.includes('STARRED');
  const lastActivity = thread.last_message_at ? new Date(thread.last_message_at) : null;

  return (
    <button
      className={cn(
        'w-full text-left px-4 py-3 border-b border-border/40 transition-colors hover:bg-muted/40',
        selected && 'bg-primary/8 border-l-2 border-l-primary',
        !selected && 'border-l-2 border-l-transparent',
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Unread indicator */}
        <div className="mt-1.5 shrink-0 flex flex-col items-center gap-1">
          <div className={cn('h-2 w-2 rounded-full', isUnread ? 'bg-primary' : 'bg-transparent')} />
          <SLADot status={slaStatus} />
        </div>

        <div className="flex-1 min-w-0">
          {/* From + date */}
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className={cn('text-sm truncate', isUnread && 'font-semibold')}>
              {thread.participant_emails?.[0] ?? '—'}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {isStarred && <Star className="h-3 w-3 text-amber-400 fill-amber-400" />}
              {lastActivity && (
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {formatDistanceToNow(lastActivity, { locale: ptBR, addSuffix: false })}
                </span>
              )}
            </div>
          </div>

          {/* Subject */}
          <p className={cn('text-xs truncate', isUnread ? 'text-foreground font-medium' : 'text-muted-foreground')}>
            {thread.subject || '(sem assunto)'}
          </p>

          {/* Snippet + badges */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-[11px] text-muted-foreground truncate flex-1">{thread.snippet}</p>
            {thread.message_count > 1 && (
              <Badge variant="secondary" className="text-[9px] h-4 px-1.5 shrink-0">{thread.message_count}</Badge>
            )}
            {thread.unread_count > 0 && (
              <Badge className="text-[9px] h-4 px-1.5 shrink-0">{thread.unread_count}</Badge>
            )}
          </div>

          {/* Labels */}
          {thread.label_ids.filter(l => !['INBOX','UNREAD','STARRED','SENT'].includes(l)).length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {thread.label_ids
                .filter(l => !['INBOX','UNREAD','STARRED','SENT'].includes(l))
                .slice(0, 3)
                .map(l => (
                  <Badge key={l} variant="outline" className="text-[9px] h-3.5 px-1 border-muted-foreground/30 text-muted-foreground">
                    {l}
                  </Badge>
                ))}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

export function EmailThreadList({
  threads,
  selectedThreadId,
  accountId,
  isLoading = false,
  hasMore = false,
  onSelectThread,
  onLoadMore,
  onRefresh,
  className,
}: EmailThreadListProps) {
  const [filter, setFilter] = useState<FilterValue>('all');
  const { getStatus } = useEmailSLA(accountId);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!onLoadMore || !hasMore) return;

    observerRef.current = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) onLoadMore(); },
      { threshold: 0.5 }
    );

    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);
    return () => observerRef.current?.disconnect();
  }, [onLoadMore, hasMore]);

  const filtered = threads.filter(t => {
    if (filter === 'unread') return t.unread_count > 0;
    if (filter === 'starred') return t.label_ids.includes('STARRED');
    if (filter === 'sent') return t.label_ids.includes('SENT');
    return true;
  });

  const unreadTotal = threads.filter(t => t.unread_count > 0).length;
  const breachedCount = threads.filter(t => getStatus(t.thread_id) === 'breached').length;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Inbox className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium text-sm">Inbox</span>
          {unreadTotal > 0 && (
            <Badge className="h-4 text-[10px] px-1.5">{unreadTotal}</Badge>
          )}
          {breachedCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="destructive" className="h-4 text-[10px] px-1.5 gap-1">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  {breachedCount}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>SLA violado em {breachedCount} thread(s)</TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Select value={filter} onValueChange={(v) => setFilter(v as FilterValue)}>
            <SelectTrigger className="h-7 w-28 text-xs border-0 bg-muted/50">
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="unread">Não lidos</SelectItem>
              <SelectItem value="starred">Com estrela</SelectItem>
              <SelectItem value="sent">Enviados</SelectItem>
            </SelectContent>
          </Select>

          {onRefresh && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Atualizar</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && threads.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
            <Mail className="h-10 w-10 opacity-30" />
            <div className="text-center">
              <p className="text-sm font-medium">Nenhum email</p>
              <p className="text-xs mt-1">
                {filter !== 'all' ? 'Tente mudar o filtro' : 'A caixa de entrada está vazia'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {filtered.map(thread => (
              <ThreadListItem
                key={thread.id}
                thread={thread}
                selected={selectedThreadId === thread.id}
                slaStatus={getStatus(thread.thread_id)}
                onClick={() => onSelectThread(thread)}
              />
            ))}

            {/* Load more sentinel */}
            {hasMore && (
              <div ref={loadMoreRef} className="py-4 flex items-center justify-center">
                {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
