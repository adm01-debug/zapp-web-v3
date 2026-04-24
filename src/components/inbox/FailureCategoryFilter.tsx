/**
 * Dropdown compacto para escolher a categoria de falha exibida quando o
 * filtro "apenas com retry/falha" está ativo no sidebar do inbox.
 *
 * Aparece somente quando `showOnlyRetrying` está ligado. Cada opção
 * mostra o label e a contagem de conversas afetadas naquela categoria.
 */
import { memo } from 'react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ShieldAlert, AlertOctagon, ServerCrash, WifiOff, HelpCircle, Filter } from 'lucide-react';
import type { FailureCategory } from '@/hooks/inbox/useFailureMetricsBatch';

interface Option {
  value: FailureCategory | 'all';
  label: string;
  Icon: typeof Filter;
  iconClass: string;
}

const OPTIONS: Option[] = [
  { value: 'all', label: 'Todas as falhas', Icon: Filter, iconClass: 'text-muted-foreground' },
  { value: 'auth', label: 'Auth (401/403)', Icon: ShieldAlert, iconClass: 'text-warning' },
  { value: 'http_4xx', label: 'HTTP 4xx', Icon: AlertOctagon, iconClass: 'text-warning' },
  { value: 'http_5xx', label: 'HTTP 5xx', Icon: ServerCrash, iconClass: 'text-destructive' },
  { value: 'network', label: 'Timeout / rede', Icon: WifiOff, iconClass: 'text-info' },
  { value: 'unknown', label: 'Outras', Icon: HelpCircle, iconClass: 'text-muted-foreground' },
];

interface Props {
  value: FailureCategory | 'all';
  onChange: (value: FailureCategory | 'all') => void;
  counts: Record<FailureCategory | 'all', number>;
}

export const FailureCategoryFilter = memo(function FailureCategoryFilter({ value, onChange, counts }: Props) {
  const active = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0];
  const ActiveIcon = active.Icon;

  return (
    <Select value={value} onValueChange={(v) => onChange(v as FailureCategory | 'all')}>
      <SelectTrigger
        className="h-7 text-[11px] bg-destructive/10 border border-destructive/30 rounded-md focus:ring-1 focus:ring-destructive/40 px-2 gap-1 w-[110px]"
        aria-label="Filtrar por categoria de falha"
      >
        <div className="flex items-center gap-1 truncate">
          <ActiveIcon className={cn('w-3 h-3 shrink-0', active.iconClass)} />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((opt) => {
          const Icon = opt.Icon;
          const count = counts[opt.value] ?? 0;
          return (
            <SelectItem key={opt.value} value={opt.value}>
              <span className="flex items-center gap-2 min-w-[160px]">
                <Icon className={cn('w-3.5 h-3.5 shrink-0', opt.iconClass)} />
                <span className="flex-1 truncate text-[11px]">{opt.label}</span>
                {count > 0 && (
                  <span className="ml-auto text-[9px] text-muted-foreground font-medium tabular-nums">
                    {count}
                  </span>
                )}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
});
