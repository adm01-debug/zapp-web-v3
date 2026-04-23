import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GenericEmptyState } from '@/components/ui/GenericEmptyState';
import { Activity, RefreshCw, Copy, TrendingUp, TrendingDown, ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, XCircle, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useRetryMetrics, type RetryMetricsFilters } from '@/hooks/monitoring/useRetryMetrics';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, Legend } from 'recharts';
import { RetryAlertsConfig } from './RetryAlertsConfig';
import { RetryAlertsBanner } from './RetryAlertsBanner';
import { evaluateAllInstances, loadThresholds, type RetryThresholds } from '@/lib/retryAlerts';

const HOURS_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 1, label: '1h' },
  { value: 6, label: '6h' },
  { value: 24, label: '24h' },
  { value: 168, label: '7d' },
];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s atrás`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

function statusVariant(status: string): 'default' | 'destructive' | 'secondary' | 'outline' {
  switch (status) {
    case 'success': return 'default';
    case 'failed': return 'destructive';
    case 'exhausted': return 'destructive';
    default: return 'outline';
  }
}

function statusIcon(status: string) {
  switch (status) {
    case 'success': return <CheckCircle2 className="w-3 h-3 mr-1" />;
    case 'failed': return <XCircle className="w-3 h-3 mr-1" />;
    case 'exhausted': return <AlertTriangle className="w-3 h-3 mr-1" />;
    default: return null;
  }
}

export function RetryMetricsPanel() {
  const [hours, setHours] = useState<number>(24);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [thresholds, setThresholds] = useState<RetryThresholds>(() => loadThresholds());

  const filters: RetryMetricsFilters = {
    hours,
    action: actionFilter === 'all' ? null : actionFilter,
    status: statusFilter === 'all' ? null : (statusFilter as RetryMetricsFilters['status']),
  };

  const { data, isLoading, refetch, isFetching, byInstance } = useRetryMetrics(filters);

  const rows = data?.rows ?? [];
  const agg = data?.aggregates;

  const breaches = useMemo(
    () => evaluateAllInstances(byInstance, thresholds),
    [byInstance, thresholds],
  );

  // Toast quando aparece nova violação (dedupe por instance dentro da janela atual).
  const notifiedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    notifiedRef.current = new Set();
  }, [hours, thresholds]);

  useEffect(() => {
    for (const b of breaches) {
      if (notifiedRef.current.has(b.instance)) continue;
      notifiedRef.current.add(b.instance);
      toast.error(`Retry degradado em ${b.instance}`, {
        description: b.reasons.join(' · '),
        duration: 6000,
      });
    }
  }, [breaches]);

  const actionOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => set.add(r.action));
    if (agg) agg.topActions.forEach(a => set.add(a.action));
    return Array.from(set).sort();
  }, [rows, agg]);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  const deltaPct = data?.deltaPct;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Métricas de Retry — Evolution API
            </CardTitle>
            <CardDescription>
              Tentativas, motivos e duração de chamadas com retry no proxy server-side.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={String(hours)} onValueChange={(v) => setHours(parseInt(v, 10))}>
              <SelectTrigger className="h-8 w-[80px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {HOURS_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
                <SelectItem value="failed">Falha</SelectItem>
                <SelectItem value="exhausted">Esgotado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue placeholder="Ação" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas ações</SelectItem>
                {actionOptions.map(a => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <RetryAlertsConfig
              value={thresholds}
              onChange={setThresholds}
              hasBreaches={breaches.length > 0}
            />
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label={`Total (${hours}h)`} value={agg?.total ?? 0} delta={deltaPct} />
          <KpiCard label="Sucesso após retry" value={`${agg?.successRate ?? 0}%`} subtitle={`${agg?.successAfterRetry ?? 0} runs`} />
          <KpiCard label="p95 tentativas" value={agg?.p95Attempts ?? 0} subtitle={`p50: ${agg?.p50Attempts ?? 0}`} />
          <KpiCard label="Duração média" value={`${agg?.avgDurationMs ?? 0}ms`} />
        </div>

        {/* Banner de alertas por instância */}
        <RetryAlertsBanner breaches={breaches} />

        {/* Top reasons — bar chart (top 10) */}
        {agg && agg.topReasons.length > 0 && (
          <TopReasonsChart reasons={agg.topReasons} />
        )}

        {/* Tabela */}
        {isLoading ? (
          <div className="text-xs text-muted-foreground py-6 text-center">Carregando…</div>
        ) : rows.length === 0 ? (
          <GenericEmptyState
            icon={Activity}
            title="Sem retries registrados"
            description="Nenhum retry no período selecionado. Envios de primeira-tentativa não geram registros."
            className="py-8"
          />
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[110px]">Quando</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead className="hidden md:table-cell">Instância</TableHead>
                  <TableHead className="text-center">Tentativas</TableHead>
                  <TableHead>Status final</TableHead>
                  <TableHead className="hidden lg:table-cell">HTTP</TableHead>
                  <TableHead>Motivos</TableHead>
                  <TableHead className="hidden xl:table-cell">Idempotency Key</TableHead>
                  <TableHead className="text-right">Duração</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const isOpen = expanded.has(row.id);
                  return (
                    <>
                      <TableRow key={row.id} className="cursor-pointer" onClick={() => toggle(row.id)}>
                        <TableCell className="text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            {timeAgo(row.created_at)}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{row.action}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs">{row.instance_name ?? '—'}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-[10px]">{row.attempt_count}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(row.final_status)} className="text-[10px]">
                            {statusIcon(row.final_status)}
                            {row.final_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs font-mono">{row.final_http_status ?? '—'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(row.retry_reasons ?? []).slice(0, 2).map((rr, i) => (
                              <Badge key={i} variant="secondary" className="text-[9px] font-mono">{rr.reason}</Badge>
                            ))}
                            {(row.retry_reasons ?? []).length > 2 && (
                              <Badge variant="outline" className="text-[9px]">+{row.retry_reasons.length - 2}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          {row.idempotency_key ? (
                            <span className="inline-flex items-center gap-1">
                              <code className="text-[10px] text-muted-foreground">{row.idempotency_key.slice(0, 10)}…</code>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0"
                                onClick={(e) => { e.stopPropagation(); copy(row.idempotency_key!); }}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono">
                          {row.total_duration_ms ? `${row.total_duration_ms}ms` : '—'}
                        </TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow key={`${row.id}-details`} className="bg-muted/20 hover:bg-muted/20">
                          <TableCell colSpan={9}>
                            <div className="space-y-2 py-2">
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Detalhes do retry</p>
                              <pre className="text-[10px] font-mono bg-background rounded p-2 overflow-x-auto border max-h-40">
{JSON.stringify({
  method: row.method,
  retry_reasons: row.retry_reasons,
  idempotency_key: row.idempotency_key,
  created_at: row.created_at,
}, null, 2)}
                              </pre>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface KpiCardProps {
  label: string;
  value: number | string;
  subtitle?: string;
  delta?: number | null;
}

function KpiCard({ label, value, subtitle, delta }: KpiCardProps) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-xl font-semibold">{value}</span>
        {typeof delta === 'number' && (
          <span className={cn(
            'text-[10px] font-medium inline-flex items-center gap-0.5',
            delta > 0 ? 'text-amber-500' : 'text-emerald-500'
          )}>
            {delta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}

interface TopReasonsChartProps {
  reasons: Array<{ reason: string; count: number }>;
}

function TopReasonsChart({ reasons }: TopReasonsChartProps) {
  const data = useMemo(
    () => reasons.slice(0, 10).map(r => ({ reason: r.reason, count: r.count })),
    [reasons],
  );
  const total = useMemo(() => data.reduce((s, d) => s + d.count, 0), [data]);
  // Dynamic height: ~28px per bar, min 180px
  const chartHeight = Math.max(180, data.length * 32);

  return (
    <div className="rounded-lg bg-muted/30 p-3">
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Top {data.length} motivos de retry
        </p>
        <span className="text-[10px] text-muted-foreground">{total} ocorrências</span>
      </div>
      <div style={{ width: '100%', height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
            barCategoryGap={6}
          >
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="reason"
              width={140}
              tick={{ fontSize: 10, fill: 'hsl(var(--foreground))', fontFamily: 'ui-monospace, monospace' }}
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
              contentStyle={{
                background: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 6,
                fontSize: 11,
                color: 'hsl(var(--popover-foreground))',
              }}
              formatter={(value: number) => [`${value} retries`, 'Total']}
              labelFormatter={(label: string) => label}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} fill="hsl(var(--primary))">
              {data.map((_, i) => (
                <Cell key={i} fill={`hsl(var(--primary) / ${1 - i * 0.06})`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
