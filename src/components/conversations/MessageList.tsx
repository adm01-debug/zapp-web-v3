/**
 * MessageList.tsx
 * Realtime, paginated message list for the Inbox.
 * Handles top-loading for older history and auto-scroll for new messages.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useMessages, type Message } from '@/hooks/useMessages';
import { MessageCircle, CheckCircle2, MoreHorizontal, Star, AlertCircle, Clock, Trash2, Reply } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MessageListProps {
  remoteJid: string;
}

export const MessageList: React.FC<MessageListProps> = ({ remoteJid }) => {
  const { 
    messages, loading, loadingMore, hasMore, loadMore, 
    toggleStar, toggleImportant 
  } = useMessages(remoteJid);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  
  // Infinite scroll (top loading)
  const topObserverRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          // Keep scroll position when loading older messages
          const scrollContainer = scrollRef.current;
          const oldScrollHeight = scrollContainer?.scrollHeight ?? 0;
          
          loadMore().then(() => {
            setTimeout(() => {
              if (scrollContainer) {
                const newScrollHeight = scrollContainer.scrollHeight;
                scrollContainer.scrollTop = newScrollHeight - oldScrollHeight;
              }
            }, 50);
          });
        }
      },
      { threshold: 0.1 }
    );
    
    if (topObserverRef.current) observer.observe(topObserverRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (shouldAutoScroll && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, shouldAutoScroll]);

  // Detect manual scroll up
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100;
    setShouldAutoScroll(isAtBottom);
  };

  const formatTime = (dateStr: string) => {
    return format(new Date(dateStr), 'HH:mm', { locale: ptBR });
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
    <div 
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 relative"
    >
      {/* Background Overlay */}
      <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.02] pointer-events-none sticky top-0" 
        style={{ backgroundImage: 'url("https://wweb.static.whatsapp.net/7/7b/7b2e3e9d8e7e1c1f1f1f1f1f1f1f1f1f.png")' }} />

      <div ref={topObserverRef} className="h-4 shrink-0" />
      
      {loadingMore && (
        <div className="text-center py-2">
          <span className="text-[10px] bg-background/50 backdrop-blur-sm px-2 py-1 rounded-full text-muted-foreground border">
            Carregando anteriores...
          </span>
        </div>
      )}

      {messages.length === 0 && !loading && (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/40 mt-10">
          <MessageCircle className="h-12 w-12 mb-3 opacity-20" />
          <p className="text-sm font-medium">Nenhuma mensagem nesta conversa</p>
        </div>
      )}

      {messages.map((msg, idx) => {
        const isMe = msg.from_me;
        const showDate = idx === 0 || 
          format(new Date(msg.created_at), 'yyyy-MM-dd') !== format(new Date(messages[idx-1].created_at), 'yyyy-MM-dd');

        return (
          <React.Fragment key={msg.id}>
            {showDate && (
              <div className="flex justify-center my-4 sticky top-2 z-20">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-background/80 backdrop-blur-sm border px-3 py-1 rounded-full text-muted-foreground shadow-sm">
                  {format(new Date(msg.created_at), "d 'de' MMMM", { locale: ptBR })}
                </span>
              </div>
            )}
            
            <div className={cn(
              "flex group max-w-[85%] sm:max-w-[75%] lg:max-w-[65%]",
              isMe ? "self-end flex-row-reverse" : "self-start"
            )}>
              <div className={cn(
                "relative px-3 py-1.5 rounded-lg shadow-sm border",
                isMe 
                  ? "bg-primary text-primary-foreground rounded-tr-none border-primary/20" 
                  : "bg-background text-foreground rounded-tl-none border-border"
              )}>
                {/* Message Content */}
                <div className="text-sm break-words whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                </div>

                {/* Footer: Time + Indicators */}
                <div className={cn(
                  "flex items-center justify-end gap-1.5 mt-1 select-none",
                  isMe ? "text-primary-foreground/70" : "text-muted-foreground/60"
                )}>
                  {msg.is_important && <AlertCircle className="h-3 w-3 text-orange-400" />}
                  {msg.is_starred && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
                  <span className="text-[10px] font-medium uppercase">{formatTime(msg.created_at)}</span>
                  {isMe && <CheckCircle2 className="h-3 w-3 text-blue-300" />}
                </div>

                {/* Action Menu (Visible on hover) */}
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
                      <DropdownMenuItem className="gap-2">
                        <Reply className="h-4 w-4" /> Responder
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2 text-destructive">
                        <Trash2 className="h-4 w-4" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </React.Fragment>
        );
      })}
      
      <div ref={bottomRef} className="h-1 shrink-0" />
    </div>
  );
};
