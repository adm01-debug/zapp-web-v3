/**
 * ConversationDeliverySummary — linha agregada com contadores de status
 * para o conjunto de mensagens enviadas pelo agente na conversa atual.
 *
 *   [ 24 ✓ enviadas · 22 ✓✓ entregues · 19 ✓✓ lidas · 1 ⚠ falha ]
 *
 * - Apenas mensagens outbound (`sender === 'agent'`) entram nos contadores.
 * - Renderiza compacto (chip) no topo da área de mensagens.
 * - Esconde-se quando não há mensagens enviadas (estado vazio).
 * - Sem chamadas extras: agrega o array de mensagens já em memória.
 */
import { memo, useMemo } from 'react';
import { Check, CheckCheck, AlertCircle, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message } from '@/types/chat';

interface Props {
  messages: Message[];
  className?: string;
}

interface Counts {
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  total: number;
}

const READ_LIKE = new Set(['read', 'played']);
const DELIVERED_LIKE = new Set(['delivered', 'read', 'played']);
const SENT_LIKE = new Set(['sent', 'delivered', 'read', 'played']);
const FAILED_LIKE = new Set(['failed', 'failed_auth', 'failed_retries']);

function aggregate(messages: Message[]): Counts {
  const counts: Counts = { sent: 0, delivered: 0, read: 0, failed: 0, total: 0 };
  for (const m of messages) {
    if (m.sender !== 'agent') continue;
    if (m.is_deleted) continue;
    counts.total += 1;
    if (SENT_LIKE.has(m.status)) counts.sent += 1;
    if (DELIVERED_LIKE.has(m.status)) counts.delivered += 1;
    if (READ_LIKE.has(m.status)) counts.read += 1;
    if (FAILED_LIKE.has(m.status)) counts.failed += 1;
  }
  return counts;
}

function Chip({
  icon,
  value,
  label,
  tone,
  ariaLabel,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  tone: 'muted' | 'info' | 'destructive' | 'primary';
  ariaLabel: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[11px] font-medium tabular-nums',
        tone === 'muted' && 'text-muted-foreground',
        tone === 'primary' && 'text-foreground',
        tone === 'info' && 'text-info',
        tone === 'destructive' && 'text-destructive',
      )}
      aria-label={ariaLabel}
    >
      {icon}
      <span>{value}</span>
      <span className="text-muted-foreground/80 font-normal">{label}</span>
    </span>
  );
}

export const ConversationDeliverySummary = memo(function ConversationDeliverySummary({
  messages,
  className,
}: Props) {
  const counts = useMemo(() => aggregate(messages), [messages]);

  if (counts.total === 0) return null;

  return (
    <div
      data-testid="conversation-delivery-summary"
      className={cn(
        'flex items-center gap-3 px-3 py-1.5 rounded-full border border-border/40 bg-card/60 backdrop-blur-sm',
        'text-xs shadow-sm select-none',
        className,
      )}
      role="status"
      aria-label="Resumo de entrega da conversa"
    >
      <Chip
        icon={<Check className="h-3 w-3" aria-hidden="true" />}
        value={counts.sent}
        label="enviadas"
        tone="muted"
        ariaLabel={`${counts.sent} enviadas`}
      />
      <span className="h-3 w-px bg-border/60" aria-hidden="true" />
      <Chip
        icon={<CheckCheck className="h-3 w-3" aria-hidden="true" />}
        value={counts.delivered}
        label="entregues"
        tone="muted"
        ariaLabel={`${counts.delivered} entregues`}
      />
      <span className="h-3 w-px bg-border/60" aria-hidden="true" />
      <Chip
        icon={<Eye className="h-3 w-3" aria-hidden="true" />}
        value={counts.read}
        label="lidas"
        tone="info"
        ariaLabel={`${counts.read} lidas`}
      />
      {counts.failed > 0 && (
        <>
          <span className="h-3 w-px bg-border/60" aria-hidden="true" />
          <Chip
            icon={<AlertCircle className="h-3 w-3" aria-hidden="true" />}
            value={counts.failed}
            label="com falha"
            tone="destructive"
            ariaLabel={`${counts.failed} com falha`}
          />
        </>
      )}
    </div>
  );
});
