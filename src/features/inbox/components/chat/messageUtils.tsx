import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, CheckCheck, Clock, AlertCircle, RefreshCw, ShieldAlert, Headphones } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Message } from '@/types/chat';

export function formatMessageTime(date: Date): string {
  return format(date, 'HH:mm');
}

export function formatDateSeparator(date: Date): string {
  if (isToday(date)) return 'Hoje';
  if (isYesterday(date)) return 'Ontem';
  return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
}

/**
 * WhatsApp-authentic message status icons:
 * - sending/pending: Clock (animated pulse)
 * - retrying: RefreshCw spinning, warning color
 * - sent: Single check ✓
 * - delivered: Double check ✓✓
 * - read: Double check ✓✓ in blue
 * - played: Headphones in blue (ACK 5 — audio/video reproduzido)
 * - failed_auth: ShieldAlert in destructive
 * - failed/failed_retries: AlertCircle in destructive
 */
export function MessageStatusIcon({ status, className }: { status: Message['status']; className?: string }) {
  switch (status) {
    case 'sent':
      return (
        <Check className={cn('w-[14px] h-[14px] transition-all duration-300 ease-out', className)} strokeWidth={2.5} />
      );
    case 'delivered':
      return (
        <CheckCheck className={cn('w-[14px] h-[14px] transition-all duration-300 ease-out', className)} strokeWidth={2.5} />
      );
    case 'read':
      return (
        <CheckCheck className={cn('w-[14px] h-[14px] text-[#53bdeb] transition-all duration-500 ease-out', className)} strokeWidth={2.5} />
      );
    case 'played':
      return (
        <Headphones className={cn('w-[14px] h-[14px] text-[#53bdeb] transition-all duration-500 ease-out', className)} strokeWidth={2.5} aria-label="Reproduzido" />
      );
    case 'retrying':
      return (
        <RefreshCw className={cn('w-[14px] h-[14px] text-warning animate-spin', className)} strokeWidth={2.5} />
      );
    case 'failed_auth':
      return (
        <ShieldAlert className={cn('w-[14px] h-[14px] text-destructive', className)} strokeWidth={2.5} />
      );
    case 'failed':
    case 'failed_retries':
      return (
        <AlertCircle className={cn('w-[14px] h-[14px] text-destructive', className)} strokeWidth={2.5} />
      );
    case 'sending':
    default:
      return (
        <Clock className={cn('w-3 h-3 animate-pulse opacity-60', className)} strokeWidth={2} />
      );
  }
}
