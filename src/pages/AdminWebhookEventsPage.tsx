/**
 * Admin: Auditable log of evolution-webhook events.
 * Filters by event type, instance and date range. Reads from FATOR X
 * `evolution_webhook_events` via external-db-proxy.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, subHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Webhook, RefreshCw, Inbox, CheckCircle2, XCircle,
  Eye, Filter, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { queryExternalProxy } from '@/lib/externalProxy';
import { cn } from '@/lib/utils';
import type { EvolutionWebhookEvent } from '@/types/evolutionExternal';

const EVENT_TYPES = [
  'all',
  'PRESENCE_UPDATE',
  'CONTACTS_UPDATE',
  'CHATS_UPDATE',
  'CALL',
  'LABELS_ASSOCIATION',
  'MESSAGES_UPSERT',
  'MESSAGES_UPDATE',
  'MESSAGES_DELETE',
  'CONNECTION_UPDATE',
  'QRCODE_UPDATED',
] as const;

type EventTypeFilter = typeof EVENT_TYPES[number];

const RANGE_OPTIONS = [
  { value: '1', label: 'Última hora' },
  { value: '6', label: 'Últimas 6h' },
  { value: '24', label: 'Últimas 24h' },
  { value: '72', label: 'Últimos 3 dias' },
  { value: '168', label: 'Últimos 7 dias' },
  { value: '720', label: 'Últimos 30 dias' },
] as const;

function formatDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return format(new Date(iso), "dd/MM HH:mm:ss", { locale: ptBR });
  } catch {
    return iso;
  }
}

function shortJid(jid: string | null) {
  if (!jid) return '—';
  return jid.replace('@s.whatsapp.net', '').replace('@g.us', ' (grupo)');
}

export default function AdminWebhookEventsPage() {
  const [hours, setHours] = useState<string>('24');
  const [eventType, setEventType] = useState<EventTypeFilter>('all');
  const [instance, setInstance] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [selected, setSelected] = useState<EvolutionWebhookEvent | null>(null);

  const sinceISO = useMemo(
    () => subHours(new Date(), Number(hours)).toISOString(),
    [hours],
  );

  // ── Fetch events ──────────────────────────────────────────────
  const { data, isLoading, isRefetching, refetch, error } = useQuery({
    queryKey: ['admin-webhook-events', hours, eventType, instance, onlyErrors],
    queryFn: async () => {
      const filters: { column: string; operator: string; value: unknown }[] = [
        { column: 'created_at', operator: 'gte', value: sinceISO },
      ];
      if (eventType !== 'all') filters.push({ column: 'event_type', operator: 'eq', value: eventType });
      if (instance !== 'all') filters.push({ column: 'instance_name', operator: 'eq', value: instance });
      if (onlyErrors) filters.push({ column: 'error_message', operator: 'not.is', value: null });

      const res = await queryExternalProxy<EvolutionWebhookEvent>({
        table: 'evolution_webhook_events',
        select: '*',
        filters,
        order: { column: 'created_at', ascending: false },
        limit: 500,
      });
      return res.data ?? [];
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // ── Aggregates ────────────────────────────────────────────────
  const aggregates = useMemo(() => {
    const rows = data ?? [];
    const byType: Record<string, number> = {};
    const byInstance = new Set<string>();
    let processed = 0;
    let errored = 0;
    for (const r of rows) {
      byType[r.event_type] = (byType[r.event_type] ?? 0) + 1;
      byInstance.add(r.instance_name);
      if (r.processed) processed++;
      if (r.error_message) errored++;
    }
    return {
      total: rows.length,
      processed,
      errored,
      types: Object.entries(byType).sort((a, b) => b[1] - a[1]),
      instances: Array.from(byInstance).sort(),
    };
  }, [data]);

  // ── Client-side text filter ───────────────────────────────────
  const filtered = useMemo(() => {
    const rows = data ?? [];
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.remote_jid?.toLowerCase().includes(q) ||
        r.push_name?.toLowerCase().includes(q) ||
        r.event_type.toLowerCase().includes(q) ||
        r.error_message?.toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Webhook className="h-6 w-6 text-primary" />
            Auditoria — Eventos do Evolution Webhook
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Histórico auditável de todos os eventos recebidos pelo webhook (PRESENCE, CONTACTS,
            CHATS, CALL, LABELS, mensagens e conexão) por instância e período.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', isRefetching && 'animate-spin')} />
          Atualizar
        </Button>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Inbox} label="Total no período" value={aggregates.total} tone="info" />
        <KpiCard icon={CheckCircle2} label="Processados" value={aggregates.processed} tone="success" />
        <KpiCard icon={XCircle} label="Com erro" value={aggregates.errored} tone="destructive" />
        <KpiCard icon={Filter} label="Tipos distintos" value={aggregates.types.length} tone="info" />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <FilterField label="Janela">
            <Select value={hours} onValueChange={setHours}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RANGE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Tipo de evento">
            <Select value={eventType} onValueChange={(v) => setEventType(v as EventTypeFilter)}>
              <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t === 'all' ? 'Todos' : t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Instância">
            <Select value={instance} onValueChange={setInstance}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {aggregates.instances.map((i) => (
                  <SelectItem key={i} value={i}>{i}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Buscar (JID, nome, evento, erro)">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ex: 5511… ou MESSAGES…"
              className="w-[260px]"
            />
          </FilterField>

          <FilterField label="Apenas com erro">
            <Button
              variant={onlyErrors ? 'default' : 'outline'}
              size="sm"
              onClick={() => setOnlyErrors((v) => !v)}
              className="h-9"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              {onlyErrors ? 'Sim' : 'Não'}
            </Button>
          </FilterField>
        </CardContent>
      </Card>

      {/* Type breakdown (chips) */}
      {aggregates.types.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {aggregates.types.map(([type, count]) => (
            <Badge
              key={type}
              variant={eventType === type ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setEventType(eventType === type ? 'all' : (type as EventTypeFilter))}
            >
              {type} · {count}
            </Badge>
          ))}
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            {filtered.length} evento{filtered.length === 1 ? '' : 's'}
            {filtered.length !== aggregates.total && (
              <span className="text-muted-foreground font-normal">
                {' '}(de {aggregates.total} no período)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Carregando…</div>
          ) : error ? (
            <div className="p-8 text-center text-sm text-destructive">
              Erro ao carregar: {(error as Error).message}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Inbox className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Nenhum evento no período/filtros selecionados.
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[600px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Instância</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatDate(row.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {row.event_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{row.instance_name}</TableCell>
                      <TableCell className="text-xs">
                        <div className="flex flex-col">
                          <span className="font-mono">{shortJid(row.remote_jid)}</span>
                          {row.push_name && (
                            <span className="text-muted-foreground truncate max-w-[200px]">
                              {row.push_name}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {row.error_message ? (
                          <Badge variant="destructive" className="text-xs">Erro</Badge>
                        ) : row.processed ? (
                          <Badge variant="outline" className="text-xs text-success border-success/40">
                            Processado
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Pendente</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setSelected(row)}
                          title="Ver payload"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Details dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              {selected?.event_type}
            </DialogTitle>
            <DialogDescription>
              {selected && `${selected.instance_name} • ${formatDate(selected.created_at)}`}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Field label="Instância" value={selected.instance_name} />
                <Field label="Tipo de mensagem" value={selected.message_type || '—'} />
                <Field label="Remote JID" value={selected.remote_jid || '—'} mono />
                <Field label="From me" value={selected.from_me ? 'Sim' : 'Não'} />
                <Field label="Push name" value={selected.push_name || '—'} />
                <Field label="Processado" value={selected.processed ? 'Sim' : 'Não'} />
                <Field label="Processado em" value={formatDate(selected.processed_at)} />
                <Field label="Recebido em" value={formatDate(selected.created_at)} />
              </div>

              {selected.error_message && (
                <div>
                  <p className="text-xs font-semibold text-destructive mb-1">Erro</p>
                  <ScrollArea className="max-h-32 rounded border border-destructive/30 bg-destructive/5 p-2">
                    <pre className="text-xs whitespace-pre-wrap break-all">
                      {selected.error_message}
                    </pre>
                  </ScrollArea>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Payload completo</p>
                <ScrollArea className="max-h-80 rounded border bg-muted/40 p-2">
                  <pre className="text-xs whitespace-pre-wrap break-all">
                    {JSON.stringify(selected.payload, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <p className="text-xs text-muted-foreground text-center">
        Fonte: <code>evolution_webhook_events</code> (FATOR X) · Limite 500 registros por consulta ·
        Auto-refresh a cada 60s
      </p>
    </div>
  );
}

// ── Subcomponents ─────────────────────────────────────────────
function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function KpiCard({
  icon: Icon, label, value, tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  tone: 'warning' | 'info' | 'destructive' | 'success';
}) {
  const toneClasses = {
    warning: 'text-warning',
    info: 'text-primary',
    destructive: 'text-destructive',
    success: 'text-success',
  }[tone];
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <Icon className={cn('h-8 w-8 opacity-70', toneClasses)} />
      </CardContent>
    </Card>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('font-medium break-all', mono && 'font-mono text-xs')}>{value}</p>
    </div>
  );
}
