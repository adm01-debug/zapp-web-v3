import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useMessages, type Message } from '@/hooks/useMessages';
import { useMessageQueue, type PendingMessage } from '@/hooks/messaging/useMessageQueue';
import { useContactTyping } from '@/hooks/useContactTyping';
import { MessageCircle, Check, CheckCheck, MoreHorizontal, Star, AlertCircle, Clock, Trash2, Reply, RefreshCw, ChevronDown } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MessageListProps {
  remoteJid: string;
  searchTerm?: string;
  onReply?: (msg: Message) => void;
}

export const MessageList: React.FC<MessageListProps> = ({ remoteJid, searchTerm = '', onReply }) => {
  const { 
    messages, loading, loadingMore, hasMore, loadMore, 
    toggleStar, toggleImportant 
  } = useMessages(remoteJid);
  const { pendingMessages } = useMessageQueue();
  const isTyping = useContactTyping(remoteJid);
  
  const currentPending = pendingMessages.filter(p => p.remote_jid === remoteJid);
  
  // Local filtering for search
  const filteredMessages = useMemo(() => messages.filter(m => 
    !searchTerm || (m.content && m.content.toLowerCase().includes(searchTerm.toLowerCase()))
  ), [messages, searchTerm]);

  const parentRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);

  // Combine real and pending messages for the list
  const allItems = useMemo(() => [
    ...filteredMessages,
    ...currentPending.map(p => ({
      ...p,
      isPending: true,
      from_me: true,
      message_type: 'text',
      is_starred: false,
      is_important: false,
      message_id: p.id,
      created_at: new Date(p.timestamp).toISOString()
    }))
  ], [filteredMessages, currentPending]);

  const rowVirtualizer = useVirtualizer({
    count: allItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 10,
  });

  // Track messages for auto-scroll and notifications
  const prevItemsLength = useRef(allItems.length);
  useEffect(() => {
    if (allItems.length > prevItemsLength.current) {
      if (shouldAutoScroll) {
        rowVirtualizer.scrollToIndex(allItems.length - 1, { behavior: 'smooth' });
      } else {
        setNewMessagesCount(prev => prev + (allItems.length - prevItemsLength.current));
        setShowScrollBottom(true);
      }
    }
    prevItemsLength.current = allItems.length;
  }, [allItems.length, shouldAutoScroll, rowVirtualizer]);

  // Infinite scroll (top loading)
  useEffect(() => {
    const scrollElement = parentRef.current;
    if (!scrollElement) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      
      // Top loading
      if (scrollTop < 100 && hasMore && !loadingMore && !loading) {
        const oldScrollHeight = scrollHeight;
        loadMore().then(() => {
          // Adjust scroll to maintain position
          setTimeout(() => {
            if (parentRef.current) {
              const newScrollHeight = parentRef.current.scrollHeight;
              parentRef.current.scrollTop = newScrollHeight - oldScrollHeight;
            }
          }, 50);
        });
      }

      // Bottom detection
      const isBottom = scrollHeight - scrollTop <= clientHeight + 150;
      setShouldAutoScroll(isBottom);
      if (isBottom) {
        setShowScrollBottom(false);
        setNewMessagesCount(0);
      } else if (scrollTop < scrollHeight - clientHeight - 300) {
        setShowScrollBottom(true);
      }
    };

    scrollElement.addEventListener('scroll', handleScroll);
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadingMore, loading, loadMore]);

  const scrollToBottom = () => {
    rowVirtualizer.scrollToIndex(allItems.length - 1, { behavior: 'smooth' });
    setShowScrollBottom(false);
    setNewMessagesCount(0);
    setShouldAutoScroll(true);
  };

  const formatTime = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'HH:mm', { locale: ptBR });
    } catch {
      return '--:--';
    }
  };

  if (loading && messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-4">
        <div className="flex space-x-2 animate-pulse">
          <div className="w-2 h-2 bg-muted-foreground/30 rounded-full" />
          <div className="w-2 h-2 bg-muted-foreground/30 rounded-full" />
          <div className="w-2 h-2 bg-muted-foreground/30 rounded-full" />
        </div>
        <p className="text-xs text-muted-foreground">Carregando histórico...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden relative flex flex-col">
      {/* Background Overlay */}
      <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.02] pointer-events-none sticky top-0" 
        style={{ backgroundImage: 'url("https://wweb.static.whatsapp.net/7/7b/7b2e3e9d8e7e1c1f1f1f1f1f1f1f1f1f.png")' }} />

      <div 
        ref={parentRef}
        className="flex-1 overflow-y-auto p-4"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const msg = allItems[virtualRow.index] as any;
            const isMe = msg.from_me;
            const isPending = msg.isPending;
            
            const showDate = virtualRow.index === 0 || 
              format(new Date(msg.created_at), 'yyyy-MM-dd') !== format(new Date(allItems[virtualRow.index-1].created_at), 'yyyy-MM-dd');

            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                  paddingBottom: '12px'
                }}
              >
                {showDate && (
                  <div className="flex justify-center my-4 sticky top-2 z-20">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-background/80 backdrop-blur-sm border px-3 py-1 rounded-full text-muted-foreground shadow-sm">
                      {format(new Date(msg.created_at), "d 'de' MMMM", { locale: ptBR })}
                    </span>
                  </div>
                )}
                
                <div className={cn(
                  "flex flex-col group max-w-[85%] sm:max-w-[75%] lg:max-w-[65%]",
                  isMe ? "ml-auto items-end" : "mr-auto items-start"
                )}>
                  <div className={cn(
                    "relative px-3 py-1.5 rounded-lg shadow-sm border transition-all",
                    isMe 
                      ? "bg-primary text-primary-foreground rounded-tr-none border-primary/20" 
                      : "bg-background text-foreground rounded-tl-none border-border",
                    isPending && "opacity-70 italic bg-primary/80",
                    searchTerm && msg.content?.toLowerCase().includes(searchTerm.toLowerCase()) && "ring-2 ring-primary/30"
                  )}>
                    {/* Quoted Message Preview */}
                    {msg.quoted_message_id && (
                      <div className="mb-1 p-2 rounded bg-black/5 dark:bg-white/5 border-l-4 border-l-primary/50 text-[11px] opacity-80">
                        {messages.find(m => m.message_id === msg.quoted_message_id)?.content || 'Mensagem citada'}
                      </div>
                    )}

                    {/* Message Content */}
                    <div className="text-sm break-words whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </div>

                    {/* Footer: Time + Indicators */}
                    <div className={cn(
                      "flex items-center justify-end gap-1.5 mt-1 select-none",
                      isMe ? "text-primary-foreground/70" : "text-muted-foreground/60"
                    )}>
                      {isPending ? (
                        <>
                          <span className="text-[10px] font-medium uppercase">
                            {msg.status === 'sending' ? 'Enviando...' : msg.status === 'failed' ? 'Falhou' : 'Aguardando'}
                          </span>
                          {msg.status === 'sending' ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : msg.status === 'failed' ? (
                            <AlertCircle className="h-3 w-3 text-red-300" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                        </>
                      ) : (
                        <>
                          {msg.is_important && <AlertCircle className="h-3 w-3 text-orange-400" />}
                          {msg.is_starred && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
                          <span className="text-[10px] font-medium uppercase">{formatTime(msg.created_at)}</span>
                          {isMe && (
                            <div className="flex items-center">
                              {msg.status === 1 && <Check className="h-3 w-3 text-primary-foreground/40" />}
                              {msg.status === 2 && <CheckCheck className="h-3 w-3 text-primary-foreground/40" />}
                              {msg.status >= 3 && <CheckCheck className="h-3 w-3 text-blue-300" />}
                              {msg.status === 0 && <AlertCircle className="h-3 w-3 text-red-300" />}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Action Menu (Visible on hover) */}
                    {!isPending && (
                      <div className={cn(
                        "absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity",
                        isMe ? "right-full mr-2" : "left-full ml-2"
                      )}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="h-7 w-7 rounded-full bg-background/90 border shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align={isMe ? "end" : "start"} className="w-40">
                            <DropdownMenuItem onClick={() => toggleStar(msg.id, msg.is_starred)} className="gap-2">
                              <Star className={cn("h-4 w-4", msg.is_starred && "fill-yellow-400 text-yellow-400")} />
                              {msg.is_starred ? 'Remover estrela' : 'Marcar com estrela'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleImportant(msg.id, msg.is_important)} className="gap-2">
                              <AlertCircle className={cn("h-4 w-4", msg.is_important && "text-orange-400")} />
                              {msg.is_important ? 'Remover importante' : 'Marcar importante'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onReply?.(msg)} className="gap-2">
                              <Reply className="h-4 w-4" /> Responder
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 text-destructive">
                              <Trash2 className="h-4 w-4" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isTyping && (
        <div className="absolute bottom-16 left-4 z-20 animate-in slide-in-from-bottom-2">
          <div className="bg-background border px-3 py-2 rounded-lg rounded-tl-none shadow-sm flex items-center gap-1">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce"></span>
            </div>
            <span className="text-[11px] text-muted-foreground ml-1 font-medium">Digitando...</span>
          </div>
        </div>
      )}

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button 
          onClick={scrollToBottom}
          className="absolute bottom-6 right-6 h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center animate-in fade-in slide-in-from-bottom-2 duration-300 z-30"
          aria-label="Ir para o final"
        >
          <ChevronDown className="h-6 w-6" />
          {newMessagesCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[10px] font-bold h-5 min-w-[20px] px-1.5 rounded-full border-2 border-background flex items-center justify-center">
              {newMessagesCount > 9 ? '9+' : newMessagesCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
};
