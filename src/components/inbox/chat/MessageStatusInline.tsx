/**
 * Inline message status indicator used inside message bubbles.
 *
 * Combines the persisted `message.status` (DB) with the transient send-status
 * bus (in-memory) so that retries surface live next to the message — agents
 * can see "2/3" while a send is being retried, without relying on toasts.
 *
 * Rendering rules:
 *  - bus state wins for transient statuses (sending/retrying)
 *  - bus state wins on terminal statuses if it is more recent than the DB row
 *  - otherwise we fall back to `message.status`
 */
import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { Message } from '@/types/chat';
import { MessageStatusIcon } from './messageUtils';
import { useMessageSendStatus } from '@/hooks/realtime/useMessageSendStatus';
import { useFailureReason, formatFailureReason } from '@/hooks/inbox/useFailureReason';

interface MessageStatusInlineProps {
  message: Pick<Message, 'id' | 'status'>;
  className?: string;
}

const TRANSIENT = new Set(['sending', 'retrying']);
const TERMINAL_FAILURES = new Set(['failed', 'failed_auth', 'failed_retries']);

export const MessageStatusInline = memo(function MessageStatusInline({
  message,
  className,
}: MessageStatusInlineProps) {
  const bus = useMessageSendStatus(message.id);

  // Decide which status to render
  const effectiveStatus =
    bus && (TRANSIENT.has(bus.status) || bus.status === 'failed_retries' || bus.status === 'failed_auth')
      ? bus.status
      : message.status;

  const isRetrying = effectiveStatus === 'retrying';
  const showAttemptBadge =
    isRetrying && typeof bus?.attempt === 'number' && typeof bus?.totalRetries === 'number';
  const showFailedAfterRetries = effectiveStatus === 'failed_retries' && typeof bus?.totalRetries === 'number';

  const tooltip = isRetrying
    ? showAttemptBadge
      ? `Tentando reenviar (${bus!.attempt}/${bus!.totalRetries})…`
      : 'Tentando reenviar…'
    : showFailedAfterRetries
      ? `Falhou após ${bus!.totalRetries} tentativas`
      : undefined;

  return (
    <span
      className={cn('inline-flex items-center gap-0.5', className)}
      title={tooltip}
      data-testid="message-status-inline"
      data-status={effectiveStatus}
      data-attempt={showAttemptBadge ? bus!.attempt : undefined}
    >
      <MessageStatusIcon status={effectiveStatus} />
      {showAttemptBadge && (
        <span
          className="text-[9px] font-semibold leading-none text-warning tabular-nums px-0.5"
          aria-label={`Tentativa ${bus!.attempt} de ${bus!.totalRetries}`}
        >
          {bus!.attempt}/{bus!.totalRetries}
        </span>
      )}
      {showFailedAfterRetries && (
        <span
          className="text-[9px] font-semibold leading-none text-destructive tabular-nums px-0.5"
          aria-label={`Falhou após ${bus!.totalRetries} tentativas`}
        >
          ×{bus!.totalRetries}
        </span>
      )}
    </span>
  );
});
