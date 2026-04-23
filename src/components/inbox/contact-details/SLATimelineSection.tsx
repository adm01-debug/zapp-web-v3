import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, formatDistanceStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  MessageCircle, Reply, Clock, CheckCircle2, RotateCcw, Activity, AlertTriangle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { GenericEmptyState } from '@/components/ui/GenericEmptyState';
import { cn } from '@/lib/utils';
import { Conversation } from '@/types/chat';
import { useConversationSLATimeline } from '@/hooks/useConversationSLATimeline';
import { useApplicableSLA } from '@/hooks/useApplicableSLA';

type SLAStatus = 'ok' | 'warning' | 'breached' | 'na';

function getSLAStatus(durationMs: number | null, limitMinutes: number): SLAStatus {
  if (durationMs === null) return 'na';
  const limitMs = limitMinutes * 60_000;
  if (durationMs > limitMs) return 'breached';
  if (durationMs > limitMs * 0.7) return 'warning';
  return 'ok';
}

const STATUS_STYLES: Record<SLAStatus, { label: string; className: string }> = {
  ok: { label: 'Dentro do SLA', className: 'bg-success/15 text-success border-success/30' },
  warning: { label: 'Em risco', className: 'bg-warning/15 text-warning border-warning/30' },
  breached: { label: 'Violado', className: 'bg-destructive/15 text-destructive border-destructive/30' },
  na: { label: '—', className: 'bg-muted/40 text-muted-foreground border-border/40' },
};

function formatDurationMs(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}min`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h`;
  return `${Math.round(ms / 86_400_000)}d`;
}

function formatTs(d: Date | null): string {
  return d ? format(d, "dd/MM HH:mm", { locale: ptBR }) : '—';
}

interface MilestoneProps {
  index: number;
  icon: typeof MessageCircle;
  label: string;
  timestamp: Date | null;
  durationLabel?: string | null;
  status?: SLAStatus;
  pulse?: boolean;
  iconColor?: string;
}

function Milestone({ index, icon: Icon, label, timestamp, durationLabel, status, pulse, iconColor }: MilestoneProps) {
  const statusStyle = status ? STATUS_STYLES[status] : null;
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      role="listitem"
      className="relative flex gap-3 py-2"
    >
      <div
        className={cn(
          'relative z-10 mt-0.5 w-[22px] h-[22px] rounded-full bg-background border-2 border-border flex items-center justify-center shrink-0',
          pulse && 'animate-pulse border-warning/60'
        )}
      >
        <Icon className={cn('w-3 h-3', iconColor || 'text-muted-foreground')} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-medium text-foreground">{label}</span>
          {statusStyle && (
            <Badge variant="outline" className={cn('text-[9px] h-4 px-1.5 font-medium border', statusStyle.className)}>
              {statusStyle.label}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
          <span>{formatTs(timestamp)}</span>
          {durationLabel && <span className="text-foreground/60">· {durationLabel}</span>}
        </div>
      </div>
    </motion.div>
  );
}

interface SLATimelineSectionProps {
  conversation: Conversation;
}

export function SLATimelineSection({ conversation }: SLATimelineSectionProps) {
  const { contact, queue, assignedTo } = conversation;
  const remoteJid = useMemo(
    () => (contact.phone ? `${contact.phone}@s.whatsapp.net` : null),
    [contact.phone]
  );

  const { data: timeline, isLoading } = useConversationSLATimeline(remoteJid, contact.id);
  const { data: sla } = useApplicableSLA({
    contactId: contact.id,
    company: contact.company ?? null,
    jobTitle: contact.job_title ?? null,
    contactType: contact.contact_type ?? null,
    queueId: queue?.id ?? null,
    agentId: assignedTo?.id ?? null,
  });

  if (isLoading) {
    return (
      <div className="space-y-3 py-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-[22px] h-[22px] rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-2.5 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!timeline || (!timeline.firstContactAt && timeline.totalMessages === 0)) {
    return (
      <GenericEmptyState
        icon={Activity}
        title="Sem marcos ainda"
        description="A linha do tempo aparecerá assim que houver mensagens."
        className="py-6"
      />
    );
  }

  const firstResponseLimit = sla?.firstResponseMinutes ?? 5;
  const resolutionLimit = sla?.resolutionMinutes ?? 60;

  const firstResponseStatus = timeline.isAwaitingFirstResponse
    ? getSLAStatus(timeline.awaitingMs, firstResponseLimit)
    : getSLAStatus(timeline.firstResponseDurationMs, firstResponseLimit);

  const resolutionStatus = timeline.resolutionDurationMs !== null
    ? getSLAStatus(timeline.resolutionDurationMs, resolutionLimit)
    : 'na';

  const firstResponseDurationLabel = timeline.isAwaitingFirstResponse
    ? `Aguardando há ${formatDurationMs(timeline.awaitingMs)}`
    : timeline.firstResponseDurationMs !== null
      ? `Respondido em ${formatDurationMs(timeline.firstResponseDurationMs)} (limite ${firstResponseLimit}min)`
      : null;

  return (
    <div role="list" aria-label="Marcos de SLA da conversa" className="relative">
      <div className="absolute left-[11px] top-3 bottom-3 w-px bg-border/50" />

      {timeline.firstContactAt && (
        <Milestone
          index={0}
          icon={MessageCircle}
          label="Primeira mensagem do contato"
          timestamp={timeline.firstContactAt}
          iconColor="text-primary"
        />
      )}

      {(timeline.firstResponseAt || timeline.isAwaitingFirstResponse) && (
        <Milestone
          index={1}
          icon={timeline.isAwaitingFirstResponse ? AlertTriangle : Reply}
          label={timeline.isAwaitingFirstResponse ? 'Aguardando primeira resposta' : 'Primeira resposta do agente'}
          timestamp={timeline.firstResponseAt}
          durationLabel={firstResponseDurationLabel}
          status={firstResponseStatus}
          pulse={timeline.isAwaitingFirstResponse}
          iconColor={timeline.isAwaitingFirstResponse ? 'text-warning' : 'text-success'}
        />
      )}

      {timeline.lastMessageAt && (
        <Milestone
          index={2}
          icon={Clock}
          label="Última mensagem"
          timestamp={timeline.lastMessageAt}
          durationLabel={`há ${formatDistanceStrict(timeline.lastMessageAt, new Date(), { locale: ptBR })}`}
          iconColor="text-muted-foreground"
        />
      )}

      {timeline.closedAt && (
        <Milestone
          index={3}
          icon={CheckCircle2}
          label="Conversa encerrada"
          timestamp={timeline.closedAt}
          durationLabel={
            timeline.resolutionDurationMs !== null
              ? `Resolvido em ${formatDurationMs(timeline.resolutionDurationMs)} (limite ${resolutionLimit}min)`
              : null
          }
          status={resolutionStatus}
          iconColor="text-success"
        />
      )}

      {timeline.reopenedAt && (
        <Milestone
          index={4}
          icon={RotateCcw}
          label="Conversa reaberta"
          timestamp={timeline.reopenedAt}
          iconColor="text-warning"
        />
      )}

      {sla && (
        <p className="mt-3 pl-8 text-[10px] text-muted-foreground/80 leading-relaxed">
          Regra aplicada: <span className="text-foreground/80 font-medium">{sla.ruleName}</span>
          {' · '}1ª resposta {sla.firstResponseMinutes}min · Resolução {sla.resolutionMinutes}min
        </p>
      )}
    </div>
  );
}
