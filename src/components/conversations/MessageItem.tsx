import React, { memo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { MessageCircle, Check, CheckCheck, MoreHorizontal, Star, AlertCircle, Clock, Trash2, Reply, RefreshCw } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type Message } from '@/hooks/useMessages';

interface MessageItemProps {
  msg: any;
  isMe: boolean;
  isPending: boolean;
  searchTerm?: string;
  onReply?: (msg: any) => void;
  toggleStar: (id: string, current: boolean) => Promise<void>;
  toggleImportant: (id: string, current: boolean) => Promise<void>;
  quotedMessageContent?: string | null;
}

const MessageItem = memo(({ 
  msg, 
  isMe, 
  isPending, 
  searchTerm, 
  onReply, 
  toggleStar, 
  toggleImportant,
  quotedMessageContent
}: MessageItemProps) => {
  const formatTime = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'HH:mm', { locale: ptBR });
    } catch {
      return '--:--';
    }
  };

  return (
    <div className={cn(
      "flex flex-col group max-w-[85%] sm:max-w-[75%] lg:max-w-[65%]",
      isMe ? "ml-auto items-end" : "mr-auto items-start"
    )}>
      <div className={cn(
        "relative px-4 py-2 rounded-2xl shadow-md border transition-all duration-200",
        isMe 
          ? "bg-[hsl(var(--chat-bubble-sent))] text-[hsl(var(--chat-bubble-sent-foreground))] rounded-tr-none border-primary/20 shadow-primary/10" 
          : "bg-[hsl(var(--chat-bubble-received))] text-[hsl(var(--chat-bubble-received-foreground))] rounded-tl-none border-white/5 shadow-black/20",
        isPending && "opacity-70 italic bg-primary/80",
        searchTerm && msg.content?.toLowerCase().includes(searchTerm.toLowerCase()) && "ring-2 ring-primary/30"
      )}>
        {/* Quoted Message Preview */}
        {msg.quoted_message_id && (
          <div className="mb-1 p-2 rounded bg-black/5 dark:bg-white/5 border-l-4 border-l-primary/50 text-[11px] opacity-80">
            {quotedMessageContent || 'Mensagem citada'}
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
                  {msg.status >= 3 && <CheckCheck className="h-3 w-3 text-cyan-400" />}
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
  );
});

MessageItem.displayName = 'MessageItem';

export { MessageItem };
