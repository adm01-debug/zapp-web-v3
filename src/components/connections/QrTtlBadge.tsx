import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { QrTtlSource } from '@/hooks/useConnectionsManager';

interface QrTtlBadgeProps {
  ttlSeconds: number;
  source: QrTtlSource;
}

const SOURCE_META: Record<QrTtlSource, { label: string; tooltip: string; icon: typeof Info; tone: string }> = {
  detected: {
    label: 'TTL detectado',
    tooltip: 'A duração foi extraída diretamente da resposta da API Evolution.',
    icon: CheckCircle2,
    tone: 'text-status-online',
  },
  default: {
    label: 'TTL padrão (fallback)',
    tooltip: 'A resposta da API não trouxe um campo de duração — estamos usando o valor padrão.',
    icon: AlertTriangle,
    tone: 'text-warning',
  },
  clamped: {
    label: 'TTL ajustado',
    tooltip: 'O valor recebido da API estava fora dos limites seguros e foi ajustado para um intervalo razoável.',
    icon: Info,
    tone: 'text-muted-foreground',
  },
};

/**
 * Mostra o TTL detectado para o QR atual e a origem (detectado/padrão/ajustado),
 * facilitando o diagnóstico quando a API Evolution não devolve a duração esperada.
 */
export function QrTtlBadge({ ttlSeconds, source }: QrTtlBadgeProps) {
  const meta = SOURCE_META[source];
  const Icon = meta.icon;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`inline-flex items-center justify-center gap-1.5 text-[11px] ${meta.tone}`}
            data-ttl-source={source}
            aria-label={`${meta.label}: ${ttlSeconds} segundos`}
          >
            <Icon className="w-3 h-3" />
            <span>
              {meta.label}: <strong>{ttlSeconds}s</strong>
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          {meta.tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
