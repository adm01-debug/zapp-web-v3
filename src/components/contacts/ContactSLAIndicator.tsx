/**
 * ContactSLAIndicator.tsx
 * SLA status badge for the contact panel in chat sidebar.
 * Solves Gap #9: No SLA indicator in the contact detail panel.
 */
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, CheckCircle2, Timer, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SLAStatus = 'within' | 'warning' | 'breached' | 'paused' | 'none';

interface ContactSLAIndicatorProps {
  status: SLAStatus;
  remainingMinutes?: number;
  targetMinutes?: number;
  className?: string;
}

const SLA_CONFIG: Record<SLAStatus, { label: string; icon: React.ReactNode; colorClass: string }> =
  {
    within: {
      label: 'Dentro do SLA',
      icon: <CheckCircle2 className="h-3 w-3" />,
      colorClass: 'text-primary border-primary bg-primary/10 dark:bg-primary/30 dark:text-primary',
    },
    warning: {
      label: 'SLA próximo',
      icon: <Timer className="h-3 w-3" />,
      colorClass:
        'text-warning-foreground border-warning bg-warning dark:bg-warning/30 dark:text-warning-foreground animate-pulse',
    },
    breached: {
      label: 'SLA estourado',
      icon: <AlertTriangle className="h-3 w-3" />,
      colorClass:
        'text-destructive-foreground border-destructive bg-destructive dark:bg-destructive/30 dark:text-destructive-foreground',
    },
    paused: {
      label: 'SLA pausado',
      icon: <Pause className="h-3 w-3" />,
      colorClass: 'text-muted-foreground border-border bg-muted dark:bg-muted/10',
    },
    none: {
      label: 'Sem SLA',
      icon: <Clock className="h-3 w-3" />,
      colorClass: 'text-muted-foreground border-muted',
    },
  };

function formatRemaining(minutes: number): string {
  if (minutes < 0) return `${Math.abs(minutes)}min atrás`;
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m}min` : `${h}h`;
}

export const ContactSLAIndicator: React.FC<ContactSLAIndicatorProps> = ({
  status,
  remainingMinutes,
  targetMinutes: _targetMinutes,
  className,
}) => {
  const config = SLA_CONFIG[status];
  if (status === 'none') return null;

  return (
    <Badge
      variant="outline"
      className={cn('gap-1 text-xs font-medium', config.colorClass, className)}
      aria-label={`SLA: ${config.label}${remainingMinutes !== undefined ? ` - ${formatRemaining(remainingMinutes)} restantes` : ''}`}
    >
      {config.icon}
      <span>{config.label}</span>
      {remainingMinutes !== undefined && (
        <span className="text-[10px]">({formatRemaining(remainingMinutes)})</span>
      )}
    </Badge>
  );
};

export default ContactSLAIndicator;
