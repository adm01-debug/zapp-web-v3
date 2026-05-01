import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Search, Radar, GraduationCap, FileText, Info, Loader2, AlertTriangle } from 'lucide-react';
import { VisionIcon } from '@/features/inbox/components/ai-tools/VisionIcon';

type ActiveTool = 'chatSearch' | 'objections' | 'university' | 'aiAssistant' | 'summary' | null;

interface ChatHeaderToolbarProps {
  activeTool?: ActiveTool;
  showAIAssistant: boolean;
  showDetails?: boolean;
  showSummaryPanel?: boolean;
  isSummaryLoading?: boolean;
  onOpenSearch: () => void;
  onSetActiveTool?: (tool: ActiveTool) => void;
  onToggleAIAssistant: () => void;
  onToggleDetails?: () => void;
  onGenerateSummary?: () => void;
  /** Filtro: exibir apenas mensagens com falha terminal (failed/failed_auth/failed_retries). */
  failuresOnly?: boolean;
  onToggleFailuresOnly?: () => void;
  /** Quantidade de mensagens em falha — exibida no aria-label e como contador. */
  failuresCount?: number;
}

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
  badge?: boolean;
  highlight?: boolean;
}

function ToolButton({ icon, label, active, onClick, disabled, badge, highlight }: ToolButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "w-9 h-9",
            highlight ? "text-primary bg-primary/10 hover:bg-primary/20 hover:text-primary ring-1 ring-primary/20" :
            active ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted",
            badge && "relative"
          )}
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
        >
          {icon}
          {badge && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary animate-pulse" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

export function ChatHeaderToolbar({
  activeTool, showAIAssistant, showDetails, showSummaryPanel, isSummaryLoading,
  onOpenSearch, onSetActiveTool, onToggleAIAssistant, onToggleDetails, onGenerateSummary,
  failuresOnly, onToggleFailuresOnly, failuresCount = 0,
}: ChatHeaderToolbarProps) {
  return (
    <>
      <ToolButton icon={<Search className="w-[18px] h-[18px]" />} label="Buscar na conversa (Ctrl+F)" onClick={onOpenSearch} highlight />
      {onToggleFailuresOnly && (
        <ToolButton
          icon={
            <span className="relative inline-flex">
              <AlertTriangle className="w-[18px] h-[18px]" />
              {failuresCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold leading-[14px] text-center"
                  aria-hidden="true"
                >
                  {failuresCount > 99 ? '99+' : failuresCount}
                </span>
              )}
            </span>
          }
          label={
            failuresOnly
              ? `Mostrando ${failuresCount} mensagem(s) com falha — clique para limpar`
              : failuresCount > 0
                ? `Filtrar somente falhas (${failuresCount})`
                : 'Filtrar somente falhas terminais'
          }
          active={failuresOnly}
          onClick={onToggleFailuresOnly}
        />
      )}
      <ToolButton icon={<Radar className="w-[18px] h-[18px]" />} label="Monitoramento de Objeções" active={activeTool === 'objections'} onClick={() => onSetActiveTool?.('objections')} />
      <ToolButton icon={<GraduationCap className="w-[18px] h-[18px]" />} label="Ajuda dos Universitários" active={activeTool === 'university'} onClick={() => onSetActiveTool?.('university')} />
      <ToolButton icon={<VisionIcon className="w-[18px] h-[18px]" />} label="Visão" active={showAIAssistant} onClick={onToggleAIAssistant} />
      {onGenerateSummary && (
        <ToolButton
          icon={isSummaryLoading ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : <FileText className="w-[18px] h-[18px]" />}
          label="Resumo da conversa" active={showSummaryPanel} onClick={onGenerateSummary} disabled={isSummaryLoading}
        />
      )}
      {onToggleDetails && (
        <ToolButton icon={<Info className="w-[18px] h-[18px]" />} label="Detalhes do contato" active={showDetails} onClick={onToggleDetails} badge={!showDetails} />
      )}
    </>
  );
}
