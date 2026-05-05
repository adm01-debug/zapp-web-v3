import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { Conversation } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { motion } from '@/components/ui/motion';
import { SLAIndicatorForContact } from '@/features/inbox/components/SLAIndicatorForContact';
import { SentimentEmoji, getSentimentFromScore, type SentimentLevel } from '@/features/inbox/components/SentimentIndicator';
import { QuickPeek } from '@/components/ui/quick-peek';
import { TypingIndicatorCompact } from '@/features/inbox/components/TypingIndicator';
import { useContactTyping } from '@/hooks/useContactTyping';
import { useInViewport } from '@/hooks/useInViewport';
import {
  Clock, CheckCircle2, AlertCircle, Loader2, ExternalLink,
  MessageCircle, Instagram, Mail, Phone, UserCheck, Archive, Pin, Star, AlarmClock,
} from 'lucide-react';
import { openChatPopup } from '@/lib/popupManager';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RetryFailureBadge } from './RetryFailureBadge';

export function ChannelBadge({ type }: { type?: string | null }) {
  const iconClass = 'w-2.5 h-2.5 text-primary-foreground';
  let Icon = MessageCircle;
  let bgColor = 'bg-[hsl(142,70%,45%)]';
  if (type === 'instagram') { Icon = Instagram; bgColor = 'bg-[hsl(330,80%,55%)]'; }
  else if (type === 'email') { Icon = Mail; bgColor = 'bg-[hsl(220,70%,55%)]'; }
  else if (type === 'phone' || type === 'call') { Icon = Phone; bgColor = 'bg-[hsl(200,70%,50%)]'; }
  return (
    <span className={cn('absolute -top-0.5 -left-0.5 w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-sidebar z-10', bgColor)}>
      <Icon className={iconClass} />
    </span>
  );
}

export const statusIcons = {
  open: AlertCircle,
  pending: Clock,
  resolved: CheckCircle2,
  waiting: Loader2,
};

export const statusColors = {
  open: 'bg-status-open',
  pending: 'bg-status-pending',
  resolved: 'bg-status-resolved',
  waiting: 'bg-status-waiting',
};

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: (conversation: Conversation) => void;
  compact?: boolean;
}

export function ConversationItem({ conversation, isSelected, onSelect, compact = false }: ConversationItemProps) {
  const StatusIcon = statusIcons[conversation.status];
  const sentiment: SentimentLevel | null = conversation.sentiment || 
    (conversation.sentimentScore !== undefined ? getSentimentFromScore(conversation.sentimentScore) : null);

  // Gating de visibilidade: o canal Realtime de typing só é assinado quando
  // o card está (ou esteve recentemente) no viewport. Isso evita criar 1
  // canal por conversa em listas longas. Margem 200px antecipa entrada;
  // sticky 1500ms previne churn em scroll rápido.
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInViewport(rootRef, { rootMargin: '200px', keepVisibleMs: 1500 });
  const isTyping = useContactTyping(conversation.contact.id, inView);

  if (compact) {
    return (
      <motion.div ref={rootRef} onClick={() => onSelect(conversation)} whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.15 }}
        className={cn('relative p-[var(--density-padding-x)] rounded-lg cursor-pointer transition-all duration-200 h-full mx-2', isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/30 border border-transparent')}>
        {isSelected && <motion.div layoutId="conversationActiveCompact" className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-full bg-primary" />}
        <div className="flex items-center gap-2 relative z-10">
          <div className="relative flex-shrink-0">
            <ChannelBadge type={conversation.contact.contact_type} />
            <Avatar className="w-8 h-8">
              <AvatarImage src={conversation.contact.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">{conversation.contact.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}</AvatarFallback>
            </Avatar>
            {conversation.assignedTo ? (
              <Avatar className="absolute -bottom-0.5 -right-0.5 w-4 h-4 ring-1 ring-sidebar">
                <AvatarImage src={conversation.assignedTo.avatar} />
                <AvatarFallback className="bg-secondary text-secondary-foreground text-[7px] font-bold">{conversation.assignedTo.name[0]}</AvatarFallback>
              </Avatar>
            ) : (
              <span className={cn('absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-1 ring-sidebar', statusColors[conversation.status])} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 min-w-0">
                <span className={cn("font-medium text-xs truncate", isSelected ? "text-primary" : "text-foreground")}>{conversation.contact.name}</span>
                {sentiment && <SentimentEmoji sentiment={sentiment} animated={false} />}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(conversation.updatedAt, { addSuffix: false, locale: ptBR })}</span>
                {conversation.unreadCount > 0 && <span className="min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold bg-primary text-primary-foreground">{conversation.unreadCount}</span>}
              </div>
            </div>
            {isTyping ? (
              <TypingIndicatorCompact isVisible={true} className="text-[11px]" />
            ) : (
              <p className="text-[11px] text-muted-foreground truncate">{conversation.lastMessage?.content || 'Sem mensagens'}</p>
            )}
            {conversation.lastMessage && (
              <div className="mt-1 flex flex-col gap-1">
                <SLAIndicatorForContact conversation={conversation} compact className="w-full justify-start" />
                <RetryFailureBadge message={conversation.lastMessage} compact />
              </div>
            )}
          </div>
          {conversation.priority === 'high' && <div className="w-0.5 h-5 rounded-full bg-destructive flex-shrink-0" />}
        </div>
      </motion.div>
    );
  }

  const quickPeekPreview = (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-foreground">{conversation.contact.name}</p>
      {conversation.lastMessage?.content && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">{conversation.lastMessage.content}</p>}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 pt-1 border-t border-border/30">
        <span>{conversation.unreadCount > 0 ? `${conversation.unreadCount} não lidas` : 'Sem novas'}</span>
        {conversation.status && <span>• {conversation.status === 'resolved' ? 'Resolvido' : 'Aberto'}</span>}
      </div>
    </div>
  );

  return (
    <QuickPeek preview={quickPeekPreview} enabled={!isSelected} delay={500}>
      <div ref={rootRef} onClick={() => onSelect(conversation)} 
        className={cn(
          'relative p-3 cursor-pointer transition-all duration-300 min-h-[78px] mx-0 border-b border-border/40 group', 
          isSelected 
            ? 'bg-primary/10 shadow-[inset_0_0_20px_rgba(var(--primary),0.03)]' 
            : 'hover:bg-muted/30 bg-background'
        )}>
        {isSelected && (
          <motion.div 
            layoutId="activeIndicator"
            className="absolute left-0 top-3 bottom-3 w-1 bg-primary rounded-r-full z-20"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
        <div className="flex items-start gap-3.5 relative z-10">
          <div className="relative flex-shrink-0">
            <ChannelBadge type={conversation.contact.contact_type} />
            <Avatar className={cn(
              "w-[49px] h-[49px] ring-0 transition-transform duration-300",
              isSelected ? "scale-105" : "group-hover:scale-105"
            )}>
              <AvatarImage src={conversation.contact.avatar} className="object-cover" />
              <AvatarFallback className={cn(
                "text-sm font-semibold tracking-tighter transition-colors duration-200",
                isSelected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
              )}>
                {conversation.contact.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {conversation.assignedTo ? (
              <Avatar className="absolute -bottom-1 -right-1 w-5 h-5 ring-2 ring-background shadow-sm">
                <AvatarImage src={conversation.assignedTo.avatar} />
                <AvatarFallback className="bg-secondary text-secondary-foreground text-[8px] font-bold">{conversation.assignedTo.name[0]}</AvatarFallback>
              </Avatar>
            ) : (
              <span className={cn(
                'absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-background shadow-sm', 
                statusColors[conversation.status]
              )}>
                <StatusIcon className="w-2 h-2 text-white" />
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1 gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={cn(
                  "font-sans font-semibold text-[15px] leading-[1.2] tracking-[-0.01em] truncate transition-colors duration-200",
                  isSelected ? "text-primary" : "text-foreground"
                )}>
                  {(() => {
                    const firstName = conversation.contact.name?.trim().split(/\s+/)[0] || 'Contato';
                    const company = conversation.contact.company?.trim();
                    return company ? `${firstName} · ${company}` : conversation.contact.name || 'Contato';
                  })()}
                </span>
                {sentiment && <SentimentEmoji sentiment={sentiment} animated={false} />}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="font-sans text-[11px] font-semibold uppercase text-[hsl(var(--muted-foreground))] tabular-nums tracking-[0.04em]">
                  {formatDistanceToNow(conversation.updatedAt, { addSuffix: false, locale: ptBR })}
                </span>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                        onClick={(e) => { e.stopPropagation(); openChatPopup(conversation.contact.id, conversation.contact.name); }} title="Abrir em popup">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="text-xs">Abrir em popup</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              {isTyping ? (
                <TypingIndicatorCompact isVisible={true} />
              ) : (
                <p className={cn(
                  "font-sans text-[13.5px] leading-[1.35] truncate pr-2 transition-colors duration-300",
                  conversation.unreadCount > 0
                    ? isSelected ? "text-primary/90 font-bold" : "text-foreground font-bold"
                    : isSelected ? "text-primary/70 font-medium" : "text-muted-foreground font-normal"
                )}>
                  {conversation.lastMessage?.content || 'Sem mensagens'}
                </p>
              )}
              {conversation.unreadCount > 0 && (
                <motion.span 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex-shrink-0 min-w-[20px] h-[20px] px-1.5 rounded-full flex items-center justify-center font-sans text-[11px] font-bold tabular-nums bg-[hsl(0,75%,55%)] text-white shadow-[0_2px_6px_hsl(0,75%,55%,0.35)]"
                >
                  {conversation.unreadCount}
                </motion.span>
              )}
            </div>
            {conversation.contact.tags && conversation.contact.tags.length > 0 && (
              <div className="flex items-center gap-1 mt-1.5">
                {conversation.contact.tags.slice(0, 2).map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="font-sans text-[10px] h-[16px] px-1.5 py-0 leading-none font-semibold uppercase tracking-wide bg-warning/15 text-warning border-warning/30"
                  >
                    {tag}
                  </Badge>
                ))}
                {conversation.contact.tags.length > 2 && (
                  <Badge variant="outline" className="font-sans text-[10px] h-[16px] px-1.5 py-0 leading-none font-semibold tabular-nums bg-muted/40 text-muted-foreground border-border/40">
                    +{conversation.contact.tags.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>
          {conversation.priority === 'high' && <div className="w-1 h-8 rounded-full bg-destructive flex-shrink-0" />}
        </div>
      </div>
    </QuickPeek>
  );
}
