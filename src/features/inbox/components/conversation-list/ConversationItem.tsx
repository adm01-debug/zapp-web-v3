import { useRef, useState, useEffect, useCallback, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Conversation } from '@/types/chat';
import { useDensity } from '@/hooks/useDensity';
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
  MessageCircle, Instagram, Mail, Phone, Pin
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

/**
 * Wraps content in a Tooltip only when the underlying element is actually
 * truncated (scrollWidth > clientWidth). Avoids noisy tooltips for short text.
 */
function TruncatedTooltip({
  fullText,
  children,
  className,
  side = 'top',
}: {
  fullText: string;
  children: (ref: React.RefObject<HTMLSpanElement>) => ReactNode;
  className?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  const check = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setIsTruncated(el.scrollWidth > el.clientWidth + 1);
  }, []);

  useEffect(() => {
    check();
    if (typeof ResizeObserver === 'undefined') return;
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [check, fullText]);

  if (!isTruncated) return <>{children(ref)}</>;
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>{children(ref)}</TooltipTrigger>
      <TooltipContent side={side} className={cn('max-w-xs text-xs', className)}>
        {fullText}
      </TooltipContent>
    </Tooltip>
  );
}

interface ConversationItemProps {
  conversation: any; // Allow flexibility for mapped types
  isSelected: boolean;
  onSelect: (conversation: any) => void;
  compact?: boolean;
  // Selection Mode Props (for VirtualizedRealtimeList integration)
  selectionMode?: boolean;
  isMultiSelected?: boolean;
  onToggleSelection?: (id: string) => void;
  isPinned?: boolean;
}

/** Build "FirstName · Company" or fallbacks. */
function buildPrimaryLabel(conversation: any): string {
  const name = (conversation.contact?.name || conversation.contact?.pushName || '').trim();
  const company = conversation.contact?.company?.trim();
  const safeName = name === 'Você' ? '' : name;
  const firstName = safeName?.split(/\s+/)[0] || safeName;
  
  if (firstName && company) return `${firstName} · ${company}`;
  if (firstName) return firstName;
  if (company) return `Contato · ${company}`;
  return 'Contato';
}

function buildFullPrimaryLabel(conversation: any): string {
  const name = (conversation.contact?.name || conversation.contact?.pushName || 'Contato').trim();
  const company = conversation.contact?.company?.trim();
  const safeName = name === 'Você' ? 'Contato' : name;
  if (company) return `${safeName} · ${company}`;
  return safeName;
}


export function ConversationItem({ 
  conversation, 
  isSelected, 
  onSelect, 
  compact: forceCompact = false,
  selectionMode = false,
  isMultiSelected = false,
  onToggleSelection,
  isPinned = false
}: ConversationItemProps) {
  const { density } = useDensity();
  const isCompactMode = density === 'compact' || density === 'dense' || forceCompact;

  // Normalização de dados entre os tipos Conversation (legado) e ConversationWithMessages (realtime)
  const contact = conversation.contact;
  const contactId = contact?.id || conversation.id;
  const status = conversation.status || 'open';
  const priority = conversation.priority || 'medium';
  const unreadCount = conversation.unreadCount || 0;
  const lastMessage = conversation.lastMessage;
  const tags = contact?.tags ?? [];
  const company = contact?.company;
  const avatarUrl = contact?.avatar || contact?.avatar_url;
  
  // Datas
  const displayDate = conversation.updatedAt || 
                     (lastMessage?.created_at ? new Date(lastMessage.created_at) : null) || 
                     (contact?.updated_at ? new Date(contact.updated_at) : new Date());

  const StatusIcon = statusIcons[status as keyof typeof statusIcons] || AlertCircle;
  const sentiment: SentimentLevel | null = conversation.sentiment ||
    (conversation.sentimentScore !== undefined ? getSentimentFromScore(conversation.sentimentScore) : 
     (contact?.ai_sentiment ? contact.ai_sentiment : null));

  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInViewport(rootRef, { rootMargin: '200px', keepVisibleMs: 1500 });
  const isTyping = useContactTyping(contactId, inView);

  const primaryLabel = buildPrimaryLabel(conversation);
  const fullPrimaryLabel = buildFullPrimaryLabel(conversation);
  const hasTags = tags.length > 0;
  const previewText = lastMessage?.content?.trim() || 'Sem mensagens ainda';
  const visibleTags = tags.slice(0, 2);
  const hiddenTagsCount = Math.max(0, tags.length - visibleTags.length);
  const hiddenTagsLabel = tags.slice(2).join(', ');

  if (isCompactMode) {
    return (
      <TooltipProvider delayDuration={300}>
        <motion.div
          ref={rootRef}
          data-testid="conversation-item"
          data-density="compact"
          onClick={() => onSelect(conversation)}
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className={cn(
            'relative p-2.5 rounded-lg cursor-pointer transition-all duration-200 mx-2 min-h-[64px] flex items-center gap-2',
            isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/30 border border-transparent',
            isMultiSelected && 'bg-primary/15'
          )}
        >
          {isSelected && <motion.div layoutId="conversationActiveCompact" className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-full bg-primary" />}
          
          {selectionMode && (
            <div
              className="flex-shrink-0 flex items-center mr-1"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelection?.(contactId);
              }}
            >
              <input 
                type="checkbox" 
                checked={isMultiSelected} 
                onChange={() => {}} 
                className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/20" 
              />
            </div>
          )}

          <div className="flex items-start gap-2 relative z-10 flex-1 min-w-0">
            <div className="relative flex-shrink-0 mt-0.5">
              <ChannelBadge type={contact?.contact_type} />
              <Avatar className="w-[38px] h-[38px]">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                  {(contact?.name && contact.name !== 'Você' ? contact.name : 'C').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              {conversation.assignedTo ? (
                <Avatar className="absolute -bottom-0.5 -right-0.5 w-4 h-4 ring-1 ring-sidebar">
                  <AvatarImage src={conversation.assignedTo.avatar} />
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-[7px] font-bold">{conversation.assignedTo.name[0]}</AvatarFallback>
                </Avatar>
              ) : (
                <span className={cn('absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-1 ring-sidebar', statusColors[status as keyof typeof statusColors] || 'bg-muted')} />
              )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              {/* Linha 1: Primeiro nome + Empresa */}
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-1 min-w-0 flex-1">
                  {isPinned && <Pin className="w-2.5 h-2.5 text-primary flex-shrink-0" />}
                  <TruncatedTooltip fullText={fullPrimaryLabel}>
                    {(ref) => (
                      <span
                        ref={ref}
                        data-testid="conversation-primary"
                        className={cn(
                          'font-sans font-semibold text-[14px] leading-[1.2] truncate block min-w-0',
                          isSelected ? 'text-primary' : 'text-foreground'
                        )}
                      >
                        {primaryLabel}
                      </span>
                    )}
                  </TruncatedTooltip>
                  {sentiment && <SentimentEmoji sentiment={sentiment} animated={false} />}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="font-sans text-[11px] font-normal text-muted-foreground tabular-nums">
                    {formatDistanceToNow(displayDate, { addSuffix: false, locale: ptBR })}
                  </span>
                  {conversation.unreadCount > 0 && (
                    <span className="min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center font-sans text-[10px] font-medium bg-primary text-primary-foreground">
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>
              </div>
              {/* Linha 2: Última mensagem (com fallback) */}
              {isTyping ? (
                <TypingIndicatorCompact isVisible={true} className="text-[12px]" />
              ) : (
                <p
                  data-testid="conversation-preview"
                  className={cn(
                    'font-sans text-[12px] truncate leading-[1.35] min-w-0',
                    conversation.lastMessage
                      ? conversation.unreadCount > 0
                        ? 'text-foreground font-medium'
                        : 'text-muted-foreground font-normal'
                      : 'text-muted-foreground/60 font-normal italic'
                  )}
                >
                  {previewText}
                </p>
              )}
              {/* Linha 3: Tags (com fallback vazio para manter consistência) */}
              <div data-testid="conversation-tags" className="flex items-center gap-1 min-h-[16px]">
                {hasTags ? (
                  <>
                    {visibleTags.map((tag) => (
                      <TruncatedTooltip key={tag} fullText={tag}>
                        {(ref) => (
                          <Badge
                            variant="outline"
                            className="font-sans text-[10px] h-[15px] px-1.5 py-0 leading-none font-semibold uppercase tracking-wide bg-warning/15 text-warning border-warning/30 max-w-[90px] overflow-hidden"
                          >
                            <span ref={ref} className="truncate block">{tag}</span>
                          </Badge>
                        )}
                      </TruncatedTooltip>
                    ))}
                    {hiddenTagsCount > 0 && (
                      <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="font-sans text-[10px] h-[15px] px-1.5 py-0 leading-none font-semibold tabular-nums bg-muted/40 text-muted-foreground border-border/40">
                            +{hiddenTagsCount}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-xs">{hiddenTagsLabel}</TooltipContent>
                      </Tooltip>
                    )}
                  </>
                ) : null}
              </div>
              {conversation.lastMessage && (
                <div className="mt-1 flex flex-col gap-1">
                  <SLAIndicatorForContact conversation={conversation} compact={isCompactMode} className="w-full justify-start" />
                  <RetryFailureBadge message={conversation.lastMessage} compact />
                </div>
              )}
            </div>
            {conversation.priority === 'high' && <div className="w-0.5 h-5 rounded-full bg-destructive flex-shrink-0" />}
          </div>
        </motion.div>
      </TooltipProvider>
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
    <TooltipProvider delayDuration={300}>
      <QuickPeek preview={quickPeekPreview} enabled={!isSelected} delay={500}>
        <div
          ref={rootRef}
          data-testid="conversation-item"
          data-density="comfortable"
          onClick={() => onSelect(conversation)}
          className={cn(
            'relative p-3 cursor-pointer transition-all duration-300 min-h-[78px] mx-0 border-b border-border/40 group flex items-start gap-3',
            isSelected
              ? 'bg-primary/10 shadow-[inset_0_0_20px_rgba(var(--primary),0.03)]'
              : 'hover:bg-muted/30 bg-background',
            isMultiSelected && 'bg-primary/15',
            isPinned && !isSelected && 'bg-muted/30'
          )}
        >
          {isSelected && (
            <motion.div
              layoutId="activeIndicator"
              className="absolute left-0 top-3 bottom-3 w-1 bg-primary rounded-r-full z-20"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}

          {selectionMode && (
            <div
              className="flex-shrink-0 flex items-center pt-3"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelection?.(contactId);
              }}
            >
              <input 
                type="checkbox" 
                checked={isMultiSelected} 
                onChange={() => {}} 
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20" 
              />
            </div>
          )}

          <div className="flex items-start gap-3.5 relative z-10 flex-1 min-w-0">
            <div className="relative flex-shrink-0">
              <ChannelBadge type={contact?.contact_type} />
              <Avatar className={cn(
                'w-[49px] h-[49px] ring-0 transition-transform duration-300',
                isSelected ? 'scale-105' : 'group-hover:scale-105'
              )}>
                <AvatarImage src={avatarUrl} className="object-cover" />
                <AvatarFallback className={cn(
                  'text-sm font-semibold tracking-tighter transition-colors duration-200',
                  isSelected ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                )}>
                  {(contact?.name && contact.name !== 'Você' ? contact.name : 'C').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
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
                  statusColors[status as keyof typeof statusColors] || 'bg-muted'
                )}>
                  <StatusIcon className="w-2 h-2 text-white" />
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              {/* Linha 1: Nome + Empresa */}
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {isPinned && <Pin className="w-3 h-3 text-primary flex-shrink-0" />}
                  <TruncatedTooltip fullText={fullPrimaryLabel}>
                    {(ref) => (
                      <span
                        ref={ref}
                        data-testid="conversation-primary"
                        className={cn(
                          'font-sans font-semibold text-[15px] leading-[1.2] tracking-[-0.01em] truncate block min-w-0 transition-colors duration-200',
                          isSelected ? 'text-primary' : 'text-foreground'
                        )}
                      >
                        {primaryLabel}
                      </span>
                    )}
                  </TruncatedTooltip>
                  {sentiment && <SentimentEmoji sentiment={sentiment} animated={false} />}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="font-sans text-[11px] font-semibold uppercase text-[hsl(var(--muted-foreground))] tabular-nums tracking-[0.04em]">
                    {formatDistanceToNow(displayDate, { addSuffix: false, locale: ptBR })}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                        onClick={(e) => { e.stopPropagation(); openChatPopup(conversation.contact.id, conversation.contact.name); }}
                        aria-label="Abrir em popup"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="text-xs">Abrir em popup</TooltipContent>
                  </Tooltip>
                </div>
              </div>
              {/* Linha 2: Última mensagem */}
              <div className="flex items-center justify-between gap-2 min-w-0">
                {isTyping ? (
                  <TypingIndicatorCompact isVisible={true} />
                ) : (
                  <p
                    data-testid="conversation-preview"
                    className={cn(
                      'font-sans text-[13.5px] leading-[1.35] truncate pr-2 min-w-0 transition-colors duration-300',
                      conversation.lastMessage
                        ? conversation.unreadCount > 0
                          ? isSelected ? 'text-primary/90 font-bold' : 'text-foreground font-bold'
                          : isSelected ? 'text-primary/70 font-medium' : 'text-muted-foreground font-normal'
                        : 'text-muted-foreground/60 font-normal italic'
                    )}
                  >
                    {previewText}
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
              {/* Linha 3: Tags (com fallback vazio) */}
              <div data-testid="conversation-tags" className="flex items-center gap-1 min-h-[16px]">
                {hasTags ? (
                  <>
                    {visibleTags.map((tag) => (
                      <TruncatedTooltip key={tag} fullText={tag}>
                        {(ref) => (
                          <Badge
                            variant="outline"
                            className="font-sans text-[10px] h-[16px] px-1.5 py-0 leading-none font-semibold uppercase tracking-wide bg-warning/15 text-warning border-warning/30 max-w-[110px] overflow-hidden"
                          >
                            <span ref={ref} className="truncate block">{tag}</span>
                          </Badge>
                        )}
                      </TruncatedTooltip>
                    ))}
                    {hiddenTagsCount > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="font-sans text-[10px] h-[16px] px-1.5 py-0 leading-none font-semibold tabular-nums bg-muted/40 text-muted-foreground border-border/40">
                            +{hiddenTagsCount}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-xs">{hiddenTagsLabel}</TooltipContent>
                      </Tooltip>
                    )}
                  </>
                ) : (
                  <span className="text-[10px] text-muted-foreground/60 font-medium">Sem tags</span>
                )}
              </div>
            </div>
            {conversation.priority === 'high' && <div className="w-1 h-8 rounded-full bg-destructive flex-shrink-0" />}
          </div>
        </div>
      </QuickPeek>
    </TooltipProvider>
  );
}
