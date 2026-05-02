import { Eye, MousePointerClick, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * EmailTrackingBadge — Badge compacto que mostra status de rastreio inline
 *
 * Usado na lista de threads e na view de thread para indicar:
 * - Quantas vezes o email foi aberto
 * - Quantos cliques em links
 * - Quando foi a primeira abertura
 *
 * Tamanhos: sm (inline em listas), md (header de thread)
 */

interface EmailTrackingBadgeProps {
  openCount:      number;
  clickCount?:    number;
  firstOpenedAt?: string | null;
  lastOpenedAt?:  string | null;
  size?:          'sm' | 'md';
  showTooltip?:   boolean;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'agora';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}min`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h`;
  return `${Math.floor(diff / 86400_000)}d`;
}

export function EmailTrackingBadge({
  openCount,
  clickCount = 0,
  firstOpenedAt,
  lastOpenedAt,
  size = 'sm',
  showTooltip = true,
}: EmailTrackingBadgeProps) {
  // Sem aberturas
  if (openCount === 0 && clickCount === 0) {
    return (
      <Badge variant="outline" className={`text-muted-foreground gap-1 ${size === 'sm' ? 'text-[10px] h-4 px-1' : 'text-xs h-5 px-1.5'}`}>
        <Eye className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
        Não aberto
      </Badge>
    );
  }

  const content = (
    <div className="flex items-center gap-1.5">
      {/* Indicador de abertura */}
      <Badge
        variant="default"
        className={`gap-1 bg-green-600 hover:bg-green-700 ${size === 'sm' ? 'text-[10px] h-4 px-1' : 'text-xs h-5 px-1.5'}`}
      >
        <Eye className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
        {openCount}x
      </Badge>

      {/* Indicador de cliques */}
      {clickCount > 0 && (
        <Badge
          variant="default"
          className={`gap-1 bg-blue-600 hover:bg-blue-700 ${size === 'sm' ? 'text-[10px] h-4 px-1' : 'text-xs h-5 px-1.5'}`}
        >
          <MousePointerClick className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
          {clickCount}
        </Badge>
      )}

      {/* Tempo da primeira abertura */}
      {firstOpenedAt && size === 'md' && (
        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
          <Clock className="h-2.5 w-2.5" />
          {timeAgo(firstOpenedAt)}
        </span>
      )}
    </div>
  );

  if (!showTooltip || !firstOpenedAt) return content;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <div className="space-y-0.5">
          <p>{openCount} abertura{openCount !== 1 ? 's' : ''}</p>
          {clickCount > 0 && <p>{clickCount} clique{clickCount !== 1 ? 's' : ''} em links</p>}
          <p className="text-muted-foreground">
            1ª abertura: {new Date(firstOpenedAt).toLocaleString('pt-BR')}
          </p>
          {lastOpenedAt && lastOpenedAt !== firstOpenedAt && (
            <p className="text-muted-foreground">
              Última: {new Date(lastOpenedAt).toLocaleString('pt-BR')}
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export default EmailTrackingBadge;
