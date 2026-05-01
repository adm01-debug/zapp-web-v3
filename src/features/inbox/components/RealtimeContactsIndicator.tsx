/**
 * Visual indicator for the realtime status of evolution_contacts.
 * Uses semantic tokens; supports compact (dot) and labeled modes.
 */
import { Wifi, WifiOff, Loader2, AlertTriangle } from 'lucide-react';
// Tooltip removido para evitar loop de refs do Radix Slot quando usado com asChild
// em <span>. Substituído por title nativo, que cumpre o mesmo papel informativo.
import { cn } from '@/lib/utils';
import {
  useRealtimeContactsStatus,
  type RealtimeContactsStatus,
} from '..';

interface Props {
  className?: string;
  /** Show status text next to the dot */
  withLabel?: boolean;
}

const META: Record<
  RealtimeContactsStatus,
  { label: string; tone: string; dot: string; hint: string; Icon: typeof Wifi }
> = {
  connected: {
    label: 'Sincronizado',
    tone: 'text-success',
    dot: 'bg-success',
    hint: 'Sincronização de contatos ativa em tempo real',
    Icon: Wifi,
  },
  connecting: {
    label: 'Conectando…',
    tone: 'text-muted-foreground',
    dot: 'bg-warning animate-pulse',
    hint: 'Estabelecendo canal de tempo real para contatos',
    Icon: Loader2,
  },
  disconnected: {
    label: 'Desconectado',
    tone: 'text-muted-foreground',
    dot: 'bg-muted-foreground/60',
    hint: 'Canal de tempo real de contatos inativo',
    Icon: WifiOff,
  },
  error: {
    label: 'Reconectando…',
    tone: 'text-destructive',
    dot: 'bg-destructive animate-pulse',
    hint: 'Falha no canal de tempo real — tentando reconectar',
    Icon: AlertTriangle,
  },
  idle: {
    label: 'Aguardando',
    tone: 'text-muted-foreground',
    dot: 'bg-muted-foreground/40',
    hint: 'Sincronização ainda não inicializada',
    Icon: Loader2,
  },
};

export function RealtimeContactsIndicator({ className, withLabel = false }: Props) {
  const status = useRealtimeContactsStatus();
  const meta = META[status];
  const isSpin = status === 'connecting' || status === 'idle';

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={`Sincronização de contatos: ${meta.label}`}
      title={`Contatos: ${meta.hint}`}
      className={cn('inline-flex items-center gap-1.5', className)}
    >
      {withLabel ? (
        <>
          <meta.Icon className={cn('w-3 h-3', meta.tone, isSpin && 'animate-spin')} />
          <span className={cn('text-[10px] font-medium', meta.tone)}>{meta.label}</span>
        </>
      ) : (
        <span className={cn('w-1.5 h-1.5 rounded-full', meta.dot)} />
      )}
    </span>
  );
}
