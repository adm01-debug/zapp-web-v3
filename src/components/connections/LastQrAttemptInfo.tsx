import { CheckCircle2, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLastQrAttempt } from '@/hooks/useLastQrAttempt';

interface LastQrAttemptInfoProps {
  connectionId: string;
  /**
   * Bump this whenever the dialog generates a new QR or transitions status,
   * so the panel re-fetches the latest attempt row.
   */
  refreshKey: unknown;
}

const STATUS_META: Record<
  'pending' | 'connected' | 'expired' | 'error',
  { label: string; icon: typeof CheckCircle2; tone: string }
> = {
  pending:   { label: 'Aguardando',  icon: Loader2,      tone: 'text-muted-foreground' },
  connected: { label: 'Conectado',   icon: CheckCircle2, tone: 'text-status-online'    },
  expired:   { label: 'Expirado',    icon: Clock,        tone: 'text-muted-foreground' },
  error:     { label: 'Falhou',      icon: AlertCircle,  tone: 'text-destructive'      },
};

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return 'agora';
  const sec = Math.floor(diff / 1000);
  if (sec < 60)  return `há ${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60)  return `há ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr  < 24)  return `há ${hr} h`;
  const day = Math.floor(hr / 24);
  return `há ${day} d`;
}

/**
 * Compact diagnostic strip shown inside the QR dialog: surfaces the result of
 * the most recent QR refresh attempt (timestamp + status + error reason) so
 * users and support can troubleshoot login issues without digging into logs.
 */
export function LastQrAttemptInfo({ connectionId, refreshKey }: LastQrAttemptInfoProps) {
  const { attempt, loading } = useLastQrAttempt(connectionId, refreshKey);

  if (loading && !attempt) {
    return (
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" /> Carregando histórico…
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="text-[11px] text-muted-foreground text-center">
        Nenhuma tentativa registrada ainda.
      </div>
    );
  }

  const meta = STATUS_META[attempt.status];
  const Icon = meta.icon;
  const eventTime =
    attempt.connected_at ?? attempt.expired_at ?? attempt.updated_at ?? attempt.created_at;

  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-left space-y-1">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">Última tentativa</span>
        <span className={cn('flex items-center gap-1 font-medium', meta.tone)}>
          <Icon className={cn('w-3.5 h-3.5', attempt.status === 'pending' && 'animate-spin')} />
          {meta.label}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span>{formatRelative(eventTime)}</span>
        <span title={new Date(eventTime).toLocaleString()}>
          {new Date(eventTime).toLocaleTimeString()}
        </span>
      </div>
      {attempt.status === 'error' && attempt.error_message && (
        <div className="text-[11px] text-destructive break-words">{attempt.error_message}</div>
      )}
    </div>
  );
}
