import { Card, CardContent } from '@/components/ui/card';
import { Search, MousePointerClick, AlertCircle, Sparkles } from 'lucide-react';
import type { SearchInsights } from '@/hooks/useSearchInsights';

interface Props { data: SearchInsights; isLoading: boolean; }

function fmtPct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

interface KpiProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}

function KpiCard({ icon, label, value, hint }: KpiProps) {
  return (
    <Card>
      <CardContent className="p-4 space-y-1">
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          {icon}
          <span>{label}</span>
        </div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

export function SearchInsightsKPICards({ data, isLoading }: Props) {
  const placeholder = isLoading ? '—' : null;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard
        icon={<Search className="h-3.5 w-3.5" />}
        label="Total de buscas"
        value={placeholder ?? data.total_searches.toLocaleString('pt-BR')}
        hint={`${data.unique_queries.toLocaleString('pt-BR')} queries únicas`}
      />
      <KpiCard
        icon={<Sparkles className="h-3.5 w-3.5" />}
        label="% busca vetorial"
        value={placeholder ?? fmtPct(data.vector_share)}
        hint={`${data.vector_searches.toLocaleString('pt-BR')} chamadas`}
      />
      <KpiCard
        icon={<MousePointerClick className="h-3.5 w-3.5" />}
        label="Click-through rate"
        value={placeholder ?? fmtPct(data.click_through_rate)}
        hint={`${data.total_clicks.toLocaleString('pt-BR')} cliques`}
      />
      <KpiCard
        icon={<AlertCircle className="h-3.5 w-3.5" />}
        label="Zero resultados"
        value={placeholder ?? fmtPct(data.zero_result_rate)}
        hint={`${data.zero_result_count.toLocaleString('pt-BR')} buscas sem retorno`}
      />
    </div>
  );
}
