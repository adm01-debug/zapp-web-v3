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
 *  - when the bus has no attempt counters (e.g. after a page reload), we
 *    hydrate from the persisted `retry_attempt` / `retry_total` columns so
 *    the "2/3" badge survives navigation.
 */
import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { Message } from '@/types/chat';
import { MessageStatusIcon } from './messageUtils';
import { useMessageSendStatus } from '@/hooks/realtime/useMessageSendStatus';
import { useFailureReason, formatFailureReason } from '@/hooks/inbox/useFailureReason';

interface MessageStatusInlineProps {
  message: Pick<Message, 'id' | 'status' | 'retry_attempt' | 'retry_total'>;
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
  const isTerminalFailure = TERMINAL_FAILURES.has(effectiveStatus);

  // Counters: prefer the live bus, fall back to persisted DB columns.
  const attempt = bus?.attempt ?? message.retry_attempt ?? undefined;
  const totalRetries = bus?.totalRetries ?? message.retry_total ?? undefined;

  const showAttemptBadge =
    isRetrying && typeof attempt === 'number' && typeof totalRetries === 'number';
  const showFailedAfterRetries =
    effectiveStatus === 'failed_retries' && typeof totalRetries === 'number';

  // Lazy lookup do motivo final no evolution_retry_metrics — só roda em falha.
  const { data: failure } = useFailureReason(message.id, isTerminalFailure);

  const baseTooltip = isRetrying
    ? showAttemptBadge
      ? `Tentando reenviar (${attempt}/${totalRetries})…`
      : 'Tentando reenviar…'
    : showFailedAfterRetries
      ? `Falhou após ${totalRetries} tentativas`
      : isTerminalFailure
        ? 'Falha no envio'
        : undefined;

  const tooltip = isTerminalFailure && failure
    ? `${baseTooltip} — ${formatFailureReason(failure.reason)} (após ${failure.attempts} tentativa${failure.attempts === 1 ? '' : 's'})`
    : baseTooltip;

  return (
    <span
      className={cn('inline-flex items-center gap-0.5', className)}
      title={tooltip}
      data-testid="message-status-inline"
      data-status={effectiveStatus}
      data-attempt={showAttemptBadge ? attempt : undefined}
    >
      <MessageStatusIcon status={effectiveStatus} />
      {showAttemptBadge && (
        <span
          className="text-[9px] font-semibold leading-none text-warning tabular-nums px-0.5"
          aria-label={`Tentativa ${attempt} de ${totalRetries}`}
        >
          {attempt}/{totalRetries}
        </span>
      )}
      {showFailedAfterRetries && (
        <span
          className="text-[9px] font-semibold leading-none text-destructive tabular-nums px-0.5"
          aria-label={`Falhou após ${totalRetries} tentativas`}
        >
          ×{totalRetries}
        </span>
      )}
    </span>
  );
});
