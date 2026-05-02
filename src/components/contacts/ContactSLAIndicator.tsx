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

const SLA_CONFIG: Record<SLAStatus, { label: string; icon: React.ReactNode; colorClass: string }> = {
  within:   { label: 'Dentro do SLA', icon: <CheckCircle2 className="h-3 w-3" />, colorClass: 'text-green-700 border-green-300 bg-green-50 dark:bg-green-950/30 dark:text-green-400' },
  warning:  { label: 'SLA próximo',   icon: <Timer className="h-3 w-3" />,        colorClass: 'text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 animate-pulse' },
  breached: { label: 'SLA estourado', icon: <AlertTriangle className="h-3 w-3" />, colorClass: 'text-red-700 border-red-300 bg-red-50 dark:bg-red-950/30 dark:text-red-400' },
  paused:   { label: 'SLA pausado',   icon: <Pause className="h-3 w-3" />,         colorClass: 'text-gray-600 border-gray-300 bg-gray-50 dark:bg-gray-800' },
  none:     { label: 'Sem SLA',       icon: <Clock className="h-3 w-3" />,         colorClass: 'text-gray-400 border-gray-200' },
};

function formatRemaining(minutes: number): string {
  if (minutes < 0) return `${Math.abs(minutes)}min atrás`;
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m}min` : `${h}h`;
}

export const ContactSLAIndicator: React.FC<ContactSLAIndicatorProps> = ({
  status, remainingMinutes, targetMinutes, className,
}) => {
  const config = SLA_CONFIG[status];
  if (status === 'none') return null;

  return (
    <Badge
      variant="outline"
      className={cn('text-xs gap-1 font-medium', config.colorClass, className)}
      aria-label={`SLA: ${config.label}${remainingMinutes !== undefined ? ` - ${formatRemaining(remainingMinutes)} restantes` : ''}`}
    >
      {config.icon}
      <span>{config.label}</span>
      {remainingMinutes !== undefined && (
        <span className="font-mono text-[10px]">({formatRemaining(remainingMinutes)})</span>
      )}
    </Badge>
  );
};

export default ContactSLAIndicator;
