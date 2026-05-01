import { SLAIndicator } from './SLAIndicator';
import { useApplicableSLA, ApplicableSLA, SLAMatchedLevel } from '@/features/sla';
import { Conversation } from '@/types/chat';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface SLAIndicatorForContactProps {
  conversation: Conversation;
  compact?: boolean;
  className?: string;
}

const HIERARCHY: { level: SLAMatchedLevel; label: string }[] = [
  { level: 'contact', label: 'Contato' },
  { level: 'company', label: 'Empresa' },
  { level: 'job_title', label: 'Cargo' },
  { level: 'contact_type', label: 'Tipo' },
  { level: 'queue', label: 'Fila' },
  { level: 'agent', label: 'Agente' },
];

function levelLabel(level: SLAMatchedLevel, conversation: Conversation): string {
  const c = conversation.contact;
  switch (level) {
    case 'contact': return 'Contato específico';
    case 'company': return `Empresa${c.company ? `: ${c.company}` : ''}`;
    case 'job_title': return `Cargo${c.job_title ? `: ${c.job_title}` : ''}`;
    case 'contact_type': return `Tipo${c.contact_type ? `: ${c.contact_type}` : ''}`;
    case 'queue': return 'Fila';
    case 'agent': return 'Agente atribuído';
    case 'global_default': return 'Padrão global';
    case 'system_default': return 'Padrão do sistema (fallback)';
  }
}

interface SLATooltipContentProps {
  applicable: ApplicableSLA | undefined;
  isLoading: boolean;
  fallbackFr: number;
  fallbackRes: number;
  priority: Conversation['priority'];
  conversation: Conversation;
}

function SLATooltipContent({ applicable, isLoading, fallbackFr, fallbackRes, priority, conversation }: SLATooltipContentProps) {
  const fr = applicable?.firstResponseMinutes ?? fallbackFr;
  const res = applicable?.resolutionMinutes ?? fallbackRes;
  const matched = applicable?.matchedLevel;

  return (
    <div className="flex flex-col gap-2 text-xs">
      <div className="font-semibold text-sm">
        {applicable?.ruleName ?? (isLoading ? 'Carregando regras…' : 'Sem regra específica')}
      </div>

      {matched && (
        <div className="inline-flex w-fit items-center rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          {levelLabel(matched, conversation)}
        </div>
      )}

      <div className="flex flex-col gap-0.5 text-foreground">
        <div>1ª resposta: <span className="font-medium">{fr} min</span></div>
        <div>Resolução: <span className="font-medium">{res} min</span></div>
      </div>

      <div className="border-t border-border/50 pt-1.5">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Hierarquia</div>
        <div className="flex flex-wrap items-center gap-x-1 text-[11px] text-muted-foreground">
          {HIERARCHY.map((h, i) => (
            <span key={h.level} className="inline-flex items-center gap-1">
              <span className={cn(matched === h.level && 'font-semibold text-foreground')}>{h.label}</span>
              {i < HIERARCHY.length - 1 && <span className="opacity-40">›</span>}
            </span>
          ))}
        </div>
      </div>

      {!applicable && (
        <div className="text-[11px] text-muted-foreground border-t border-border/50 pt-1.5">
          {isLoading
            ? `Carregando regras de SLA — usando padrões da prioridade (${priority}).`
            : `Nenhuma regra cadastrada cobre este contato. Usando padrão por prioridade (${priority}).`}
        </div>
      )}
    </div>
  );
}

/**
 * Resolves the applicable SLA for the contact (hierarchy: contact > company > job_title > contact_type > queue > agent)
 * and renders the SLAIndicator with those minutes. Tooltip explains the matched rule and fallback reason.
 */
export function SLAIndicatorForContact({ conversation, compact, className }: SLAIndicatorForContactProps) {
  const contact = conversation.contact;
  const { data: applicable, isLoading } = useApplicableSLA({
    contactId: contact.id,
    company: contact.company ?? null,
    jobTitle: contact.job_title ?? null,
    contactType: contact.contact_type ?? null,
    queueId: conversation.queue?.id ?? null,
    agentId: conversation.assignedTo?.id ?? null,
  });

  const fallbackFr = conversation.priority === 'high' ? 2 : 5;
  const fallbackRes = conversation.priority === 'high' ? 30 : 60;

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <SLAIndicator
            firstMessageAt={conversation.createdAt}
            firstResponseAt={conversation.status === 'resolved' ? conversation.updatedAt : null}
            resolvedAt={conversation.status === 'resolved' ? conversation.updatedAt : null}
            firstResponseMinutes={applicable?.firstResponseMinutes ?? fallbackFr}
            resolutionMinutes={applicable?.resolutionMinutes ?? fallbackRes}
            compact={compact}
            className={className}
          />
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <SLATooltipContent
          applicable={applicable}
          isLoading={isLoading}
          fallbackFr={fallbackFr}
          fallbackRes={fallbackRes}
          priority={conversation.priority}
          conversation={conversation}
        />
      </TooltipContent>
    </Tooltip>
  );
}
