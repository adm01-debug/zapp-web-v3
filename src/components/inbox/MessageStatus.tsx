import React from 'react';
import { Check, CheckCheck, Clock, AlertCircle, RefreshCw, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type MessageStatusValue =
  | 'sending'
  | 'pending'
  | 'retrying'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'played'
  | 'failed'
  | 'failed_auth'
  | 'failed_retries';

interface MessageStatusProps {
  status: MessageStatusValue;
  className?: string;
  showLabel?: boolean;
  detail?: {
    attempt?: number;
    totalRetries?: number;
    errorCode?: string | number;
    errorReason?: string;
  };
}

const statusConfig: Record<MessageStatusValue, { icon: typeof Check; label: string; color: string; iconClass?: string }> = {
  pending: { icon: Clock, label: 'Enviando...', color: 'text-muted-foreground' },
  sending: { icon: Clock, label: 'Enviando...', color: 'text-muted-foreground' },
  retrying: { icon: RefreshCw, label: 'Tentando reenviar…', color: 'text-warning', iconClass: 'animate-spin' },
  sent: { icon: Check, label: 'Enviado', color: 'text-muted-foreground' },
  delivered: { icon: CheckCheck, label: 'Entregue', color: 'text-muted-foreground' },
  read: { icon: CheckCheck, label: 'Lido', color: 'text-info' },
  played: { icon: CheckCheck, label: 'Reproduzido', color: 'text-info' },
  failed: { icon: AlertCircle, label: 'Falha no envio', color: 'text-destructive' },
  failed_auth: { icon: ShieldAlert, label: 'Falha de autenticação', color: 'text-destructive' },
  failed_retries: { icon: AlertCircle, label: 'Falhou após várias tentativas', color: 'text-destructive' },
};

function buildLabel(status: MessageStatusValue, detail?: MessageStatusProps['detail']): string {
  const base = statusConfig[status]?.label ?? '';
  if (status === 'retrying' && detail?.attempt && detail?.totalRetries) {
    return `Tentando ${detail.attempt}/${detail.totalRetries}…`;
  }
  if (status === 'failed_auth' && detail?.errorCode) {
    return `Falha de autenticação (${detail.errorCode})`;
  }
  if (status === 'failed_retries' && detail?.totalRetries) {
    return `Falhou após ${detail.totalRetries} tentativas`;
  }
  if ((status === 'failed' || status === 'failed_auth' || status === 'failed_retries') && detail?.errorReason) {
    return `${base} — ${detail.errorReason}`;
  }
  return base;
}

export const MessageStatus: React.FC<MessageStatusProps> = ({
  status,
  className,
  showLabel = false,
  detail,
}) => {
  const config = statusConfig[status] || statusConfig.sent;
  const Icon = config.icon;
  const label = buildLabel(status, detail);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('inline-flex items-center gap-1', className)}>
            <Icon className={cn('h-3.5 w-3.5', config.color, config.iconClass)} />
            {showLabel && (
              <span className={cn('text-xs', config.color)}>{label}</span>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
