import { useRef, useEffect } from 'react';
import { ArrowLeft, User, Mail, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { type GmailThread, type GmailMessage } from '@/hooks/gmail/gmailTypes';
import { EmailChatBubble } from './EmailChatBubble';
import { EmailChatReplyBar } from './EmailChatReplyBar';
import { EmailSLABadge, SLAProgressBar } from './EmailSLABadge';
import { useEmailSLA } from '@/hooks/useEmailSLA';

interface EmailChatThreadProps {
  thread: GmailThread;
  messages: GmailMessage[];
  accountId: string;
  isLoading: boolean;
  onBack?: () => void;
  className?: string;
}

export function EmailChatThread({
  thread,
  messages,
  accountId,
  isLoading,
  onBack,
  className,
}: EmailChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const { getRecord, getStatus, markReplied } = useEmailSLA(accountId);

  const slaRecord = getRecord(thread.thread_id);
  const slaStatus = getStatus(thread.thread_id);

  // Auto-scroll para o final ao carregar novas mensagens
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isLoading]);

  // Recebe emails dos participantes para reply
  const externalEmails = messages
    .filter(m => !m.is_sent)
    .map(m => m.from_email ?? '')
    .filter(Boolean);
  const replyTo = externalEmails.length > 0 ? [externalEmails[0]] : (thread as any).participant_emails ?? [];

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b space-y-2">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 md:hidden" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}

          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm leading-tight truncate">
              {thread.subject || '(sem assunto)'}
            </h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-muted-foreground">
                {thread.message_count} {thread.message_count === 1 ? 'mensagem' : 'mensagens'}
              </span>
              {(thread as any).participant_emails?.length > 0 && (
                <>
                  <span className="text-muted-foreground/50">·</span>
                  <span className="text-xs text-muted-foreground truncate max-w-48">
                    {(thread as any).participant_emails.join(', ')}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {slaRecord && (
              <EmailSLABadge
                status={slaStatus}
                receivedAt={slaRecord.received_at}
                frtMinutes={slaRecord.frt_minutes}
                thresholdMinutes={slaRecord.sla_threshold_minutes}
              />
            )}
          </div>
        </div>

        {/* SLA Progress */}
        {slaRecord && !slaRecord.first_reply_at && (
          <SLAProgressBar
            receivedAt={slaRecord.received_at}
            thresholdMinutes={slaRecord.sla_threshold_minutes}
            className="mt-1"
          />
        )}

        {/* Labels */}
        {thread.label_ids.filter(l => !['INBOX','UNREAD','STARRED'].includes(l)).length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {thread.label_ids
              .filter(l => !['INBOX','UNREAD','STARRED'].includes(l))
              .map(l => (
                <Badge key={l} variant="secondary" className="text-[10px] h-4 px-1.5">{l}</Badge>
              ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border/40">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
              <Mail className="h-8 w-8 opacity-30" />
              <p className="text-sm">Nenhuma mensagem</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <EmailChatBubble
                key={msg.id}
                message={msg}
                accountId={accountId}
                slaStatus={idx === 0 ? slaStatus : null}
                isFirst={idx === messages.length - 1}
                onReply={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <Separator />

      {/* Reply bar */}
      <EmailChatReplyBar
        accountId={accountId}
        threadId={thread.id}
        threadGmailId={thread.thread_id}
        toEmails={replyTo}
        subject={thread.subject ?? ''}
        onSent={() => {
          markReplied(thread.thread_id);
        }}
      />
    </div>
  );
}
