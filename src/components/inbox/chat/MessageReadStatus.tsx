/**
 * MessageReadStatus — indicador clicável de status para mensagens
 * recebidas (inbound). Abre o `MessageStatusPanel` com timeline
 * "Recebida / Lida por você".
 *
 * Renderiza um par ✓ (recebida) ou ✓✓ azul (lida pelo agente).
 */
import { memo } from 'react';
import { cn } from '@/lib/utils';
import { MessageStatusIcon } from './messageUtils';
import { MessageStatusPanel } from './MessageStatusPanel';
import { MessageStatusTimestamps } from './MessageStatusTimestamps';
import { useInboxStatusPref } from '@/hooks/useInboxStatusPref';
import type { Message } from '@/types/chat';

interface Props {
  message: Pick<Message, 'id' | 'sender' | 'status' | 'timestamp' | 'created_at' | 'updated_at'> & {
    status_updated_at?: string;
    contact_read_at?: string | null;
    error_code?: string | null;
    error_reason?: string | null;
  };
  className?: string;
  forceLabel?: boolean;
}

export const MessageReadStatus = memo(function MessageReadStatus({
  message,
  className,
  forceLabel,
}: Props) {
  const { showLabel } = useInboxStatusPref();
  const showTextLabel = forceLabel || showLabel;
  const reachedRead = !!message.contact_read_at;

  return (
    <MessageStatusPanel message={message}>
      <button
        type="button"
        className={cn(
          'inline-flex items-center gap-0.5 cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60 hover:opacity-80 transition-opacity',
          className,
        )}
        data-testid="message-read-status"
        data-status={reachedRead ? 'inbound-read' : 'inbound-received'}
        aria-label={
          reachedRead
            ? 'Detalhes — recebida e lida por você'
            : 'Detalhes — recebida (ainda não lida)'
        }
        title={reachedRead ? 'Lida por você' : 'Recebida'}
      >
        <MessageStatusIcon status={reachedRead ? 'read' : 'delivered'} />
        {showTextLabel && (
          <span className="text-[10px] font-medium leading-none ml-0.5 opacity-90">
            {reachedRead ? 'Lida' : 'Recebida'}
          </span>
        )}
        <MessageStatusTimestamps message={message} className="ml-1" />
      </button>
    </MessageStatusPanel>
  );
});
