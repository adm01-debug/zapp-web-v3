import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { GenericEmptyState } from '@/components/ui/GenericEmptyState';
import { ShieldAlert, RefreshCw, ChevronDown, AlertTriangle, KeyRound, Lock, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useEvolutionIncidents, type IncidentType } from '@/hooks/monitoring/useEvolutionIncidents';

interface Props {
  instances: string[]; // ids/names disponíveis
}

type WindowHours = 1 | 6 | 24 | 168;

const INCIDENT_LABEL: Record<IncidentType, string> = {
  invalid_signature: 'Assinatura inválida',
  auth_401: '401 — Não autorizado',
  auth_403: '403 — Proibido',
};

const INCIDENT_ICON: Record<IncidentType, typeof ShieldAlert> = {
  invalid_signature: ShieldAlert,
  auth_401: KeyRound,
  auth_403: Lock,
};

export function IncidentsPanel({ instances }: Props) {
  const [instance, setInstance] = useState<string>('all');
  const [type, setType] = useState<IncidentType | 'all'>('all');
  const [hours, setHours] = useState<WindowHours>(24);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading, isFetching, refetch } = useEvolutionIncidents({
    instance: instance === 'all' ? undefined : instance,
    hours,
    type,
  });

  const kpis = useMemo(() => {
    const cur = data?.summary.current.byType ?? {};
    const prev = data?.summary.previous.byType ?? {};
    const calc = (k: IncidentType) => {
      const c = cur[k] ?? 0;
      const p = prev[k] ?? 0;
      const delta = c - p;
      return { current: c, delta };
    };
    return {
      invalid_signature: calc('invalid_signature'),
      auth_401: calc('auth_401'),
      auth_403: calc('auth_403'),
    };
  }, [data]);

  const items = data?.items ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />Incidentes recentes
            </CardTitle>
            <CardDescription>
              Falhas de assinatura HMAC e respostas 401/403 da Eco/Evolution API.
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={instance} onValueChange={(v) => setInstance(v)}>
            <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue placeholder="Instância" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as instâncias</SelectItem>
              {instances.map((i) => (
                <SelectItem key={i} value={i}>{i}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={type} onValueChange={(v) => setType(v as IncidentType | 'all')}>
            <SelectTrigger className="w-[200px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="invalid_signature">Assinatura inválida</SelectItem>
              <SelectItem value="auth_401">401 — Não autorizado</SelectItem>
              <SelectItem value="auth_403">403 — Proibido</SelectItem>
            </SelectContent>
          </Select>

          <Select value={String(hours)} onValueChange={(v) => setHours(Number(v) as WindowHours)}>
            <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Última 1h</SelectItem>
              <SelectItem value="6">Últimas 6h</SelectItem>
              <SelectItem value="24">Últimas 24h</SelectItem>
              <SelectItem value="168">Últimos 7d</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(Object.keys(kpis) as IncidentType[]).map((k) => {
            const Icon = INCIDENT_ICON[k];
            const v = kpis[k];
            const trendColor =
              v.delta > 0 ? 'text-destructive' : v.delta < 0 ? 'text-emerald-500' : 'text-muted-foreground';
            return (
              <div key={k} className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[11px] font-medium text-muted-foreground">{INCIDENT_LABEL[k]}</span>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold tabular-nums">{v.current}</span>
                  <span className={cn('text-[11px] mb-1 tabular-nums', trendColor)}>
                    {v.delta > 0 ? '+' : ''}{v.delta} vs período anterior
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tabela */}
        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />Carregando incidentes…
          </div>
        ) : items.length === 0 ? (
          <GenericEmptyState
            icon={AlertTriangle}
            title="Nenhum incidente registrado"
            description="Nenhuma falha de assinatura HMAC ou resposta 401/403 da Evolution API foi capturada na janela selecionada."
          />
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Instância</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead className="w-[140px]">Quando</TableHead>
                  <TableHead className="w-[40px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => {
                  const isOpen = expanded === it.id;
                  return (
                    <Collapsible key={it.id} open={isOpen} onOpenChange={(o) => setExpanded(o ? it.id : null)} asChild>
                      <>
                        <TableRow>
                          <TableCell className="font-mono text-xs">{it.instance_name}</TableCell>
                          <TableCell>
                            <Badge
                              variant={it.incident_type === 'invalid_signature' ? 'destructive' : 'outline'}
                              className="text-[10px]"
                            >
                              {INCIDENT_LABEL[it.incident_type]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs tabular-nums">{it.http_status ?? '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{it.source}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(it.created_at), { addSuffix: true, locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', isOpen && 'rotate-180')} />
                              </Button>
                            </CollapsibleTrigger>
                          </TableCell>
                        </TableRow>
                        <CollapsibleContent asChild>
                          <TableRow>
                            <TableCell colSpan={6} className="bg-muted/30 p-3">
                              <pre className="text-[10px] font-mono overflow-x-auto whitespace-pre-wrap break-all">
                                {JSON.stringify(it.details ?? {}, null, 2)}
                              </pre>
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      </>
                    </Collapsible>
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
