import { useState, useRef } from 'react';
import { ChevronDown, ChevronUp, MoreHorizontal, Reply, Forward, Trash2, Star, StarOff, Mail, MailOpen } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { type GmailMessage } from '@/hooks/gmail/gmailTypes';
import { EmailAttachmentPreview } from './EmailAttachmentPreview';
import { EmailSLABadge } from './EmailSLABadge';
import { type SLAStatus } from '@/hooks/useEmailSLA';
import { gmailMarkRead, gmailTrashMessage, gmailModifyLabels } from '@/hooks/gmail/gmailApi';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EmailChatBubbleProps {
  message: GmailMessage;
  accountId: string;
  slaStatus?: SLAStatus | null;
  onReply?: () => void;
  onForward?: () => void;
  isFirst?: boolean;
  className?: string;
}

// Sanitiza HTML de email (remoção de scripts)
function sanitizeHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  // Remove scripts e iframes
  div.querySelectorAll('script, iframe, object, embed, form').forEach(el => el.remove());
  // Remove event handlers
  div.querySelectorAll('*').forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('on')) el.removeAttribute(attr.name);
    });
    // Restringe hrefs externos
    if (el.tagName === 'A') {
      (el as HTMLAnchorElement).target = '_blank';
      (el as HTMLAnchorElement).rel = 'noopener noreferrer nofollow';
    }
  });
  return div.innerHTML;
}

function getInitials(name: string | null, email: string | null): string {
  if (name) return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  if (email) return email[0]?.toUpperCase() ?? '?';
  return '?';
}

function getAvatarColor(email: string | null): string {
  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];
  const code = (email ?? '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return colors[code % colors.length];
}

export function EmailChatBubble({
  message,
  accountId,
  slaStatus,
  onReply,
  onForward,
  isFirst = false,
  className,
}: EmailChatBubbleProps) {
  const [expanded, setExpanded] = useState(isFirst);
  const [showFullHtml, setShowFullHtml] = useState(false);
  const [isStarred, setIsStarred] = useState(message.label_ids.includes('STARRED'));
  const [isRead, setIsRead] = useState(message.is_read);
  const contentRef = useRef<HTMLDivElement>(null);

  const sentAt = message.internal_date
    ? new Date(message.internal_date)
    : null;

  const hasHtml = !!message.body_html;
  const hasQuote = message.body_html?.includes('gmail_quote') || message.body_html?.includes('blockquote');

  const displayHtml = hasHtml
    ? sanitizeHtml(
        showFullHtml
          ? message.body_html ?? ''
          : (message.body_html ?? '').replace(/<div class="gmail_quote"[\s\S]*/i, '').replace(/<blockquote[\s\S]*<\/blockquote>/i, '')
      )
    : message.body_plain ?? message.snippet ?? '';

  const handleToggleStar = async () => {
    const wasStarred = isStarred;
    setIsStarred(!wasStarred);
    try {
      await gmailModifyLabels({
        accountId,
        messageId: message.message_id,
        addLabels: wasStarred ? [] : ['STARRED'],
        removeLabels: wasStarred ? ['STARRED'] : [],
      } as any);
    } catch (err) {
      setIsStarred(wasStarred);
    }
  };

  const handleToggleRead = async () => {
    const wasRead = isRead;
    setIsRead(!wasRead);
    try {
      await gmailMarkRead({ accountId, messageIds: [message.message_id], read: !wasRead });
    } catch (err) {
      setIsRead(wasRead);
    }
  };

  const handleTrash = async () => {
    try {
      await gmailTrashMessage({ accountId, messageId: message.message_id } as any);
      toast.success('Mensagem movida para lixeira');
    } catch (err) {
      toast.error('Erro ao mover para lixeira');
    }
  };

  return (
    <div className={cn('group relative', className)}>
      {/* Header */}
      <div
        className={cn(
          'flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg',
          !expanded && 'rounded-b-lg'
        )}
        onClick={() => setExpanded(v => !v)}
      >
        {/* Avatar */}
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className={cn('text-white text-xs font-semibold', getAvatarColor(message.from_email))}>
            {getInitials(message.from_name, message.from_email)}
          </AvatarFallback>
        </Avatar>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className={cn('text-sm truncate', !isRead && 'font-semibold')}>
                {message.from_name || message.from_email || '?'}
              </span>
              {!isRead && <Badge className="h-4 text-[10px] px-1.5">Novo</Badge>}
              {isStarred && <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />}
              {slaStatus && <EmailSLABadge status={slaStatus} compact />}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {sentAt && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {formatDistanceToNow(sentAt, { locale: ptBR, addSuffix: true })}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{format(sentAt, "dd/MM/yyyy HH:mm", { locale: ptBR })}</TooltipContent>
                </Tooltip>
              )}
              {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>

          {!expanded && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{message.snippet}</p>
          )}

          {expanded && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
              <span>Para: {message.to_emails.join(', ')}</span>
              {message.cc_emails.length > 0 && <span>· Cc: {message.cc_emails.join(', ')}</span>}
            </div>
          )}
        </div>

        {/* Actions (aparecem no hover) */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
          {onReply && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onReply}>
                  <Reply className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Responder</TooltipContent>
            </Tooltip>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {onForward && (
                <DropdownMenuItem onClick={onForward}>
                  <Forward className="h-4 w-4 mr-2" />Encaminhar
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleToggleStar}>
                {isStarred ? <StarOff className="h-4 w-4 mr-2" /> : <Star className="h-4 w-4 mr-2" />}
                {isStarred ? 'Remover estrela' : 'Adicionar estrela'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleRead}>
                {isRead ? <Mail className="h-4 w-4 mr-2" /> : <MailOpen className="h-4 w-4 mr-2" />}
                Marcar como {isRead ? 'não lido' : 'lido'}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleTrash}>
                <Trash2 className="h-4 w-4 mr-2" />Mover para lixeira
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="px-4 pb-4 pl-15">
          <div className="pl-11">
            {hasHtml ? (
              <div
                ref={contentRef}
                className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed overflow-hidden"
                style={{ maxHeight: showFullHtml ? 'none' : '400px' }}
                dangerouslySetInnerHTML={{ __html: displayHtml }}
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{displayHtml}</p>
            )}

            {/* Mostrar citação */}
            {hasQuote && !showFullHtml && (
              <button
                className="mt-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                onClick={e => { e.stopPropagation(); setShowFullHtml(true); }}
              >
                <span className="text-lg leading-none">···</span>
                <span>Mostrar conteúdo citado</span>
              </button>
            )}

            {/* Attachments */}
            {message.has_attachments && (
              <EmailAttachmentPreview attachments={[]} className="mt-3" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
