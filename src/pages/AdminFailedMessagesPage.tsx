import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertTriangle, RefreshCw, Inbox, CheckCircle2, XCircle,
  Clock, RotateCw, Ban, Eye, PlayCircle, Server, BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useFailedMessages,
  type FailedMessageRow,
  type FailedMessageStatus,
} from '@/hooks/monitoring/useFailedMessages';
import { cn } from '@/lib/utils';
import { RetryConfigPanel } from '@/components/admin/RetryConfigPanel';

const STATUS_LABEL: Record<FailedMessageStatus, string> = {
  pending: 'Pendente',
  retrying: 'Reprocessando',
  succeeded: 'Sucesso',
  abandoned: 'Abandonado',
};

const STATUS_VARIANT: Record<FailedMessageStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  retrying: 'default',
  succeeded: 'outline',
  abandoned: 'destructive',
};

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

export default function AdminFailedMessagesPage() {
  const [hours, setHours] = useState(24);
  const [statusFilter, setStatusFilter] = useState<FailedMessageStatus | 'all'>('all');
  const [errorCodeFilter, setErrorCodeFilter] = useState<string>('all');
  const [selected, setSelected] = useState<FailedMessageRow | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmBulkAbandon, setConfirmBulkAbandon] = useState(false);

  const {
    data: rows = [],
    isLoading,
    isRefetching,
    refetch,
    aggregates,
    retryNow,
    abandon,
    bulkRetry,
    bulkAbandon,
    triggerReprocess,
  } = useFailedMessages({
    hours,
    status: statusFilter === 'all' ? null : statusFilter,
    errorCode: errorCodeFilter === 'all' ? null : errorCodeFilter,
  });

  const sorted = useMemo(
    () => [...rows].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)),
    [rows],
  );

  const topReasons = aggregates.byErrorCode.slice(0, 8);
  const maxReasonCount = topReasons[0]?.count ?? 1;

  const allVisibleSelected = sorted.length > 0 && sorted.every((r) => selectedIds.has(r.id));
  const someVisibleSelected = sorted.some((r) => selectedIds.has(r.id));

  function toggleAll() {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sorted.map((r) => r.id)));
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-warning" />
            Dead-Letter Queue — Mensagens com Falha
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Mensagens da Evolution API que falharam por erros transitórios e estão na fila de reprocesso automático.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isRefetching && 'animate-spin')} />
            Atualizar
          </Button>
          <Button
            size="sm"
            onClick={() => triggerReprocess.mutate()}
            disabled={triggerReprocess.isPending}
          >
            <PlayCircle className={cn('h-4 w-4 mr-2', triggerReprocess.isPending && 'animate-spin')} />
            Reprocessar agora
          </Button>
        </div>
      </header>

      {/* Retry config (sem deploy) */}
      <RetryConfigPanel />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard icon={Clock} label="Pendentes" value={aggregates.pending} tone="warning" />
        <KpiCard icon={RotateCw} label="Reprocessando" value={aggregates.retrying} tone="info" />
        <KpiCard icon={XCircle} label="Abandonados" value={aggregates.abandoned24h} tone="destructive" />
        <KpiCard
          icon={CheckCircle2}
          label="Sucesso após retry"
          value={`${aggregates.successAfterRetryRate}%`}
          tone="success"
        />
        <KpiCard
          icon={Server}
          label="Top instância"
          value={aggregates.topInstance ? `${aggregates.topInstance.instance} (${aggregates.topInstance.count})` : '—'}
          tone="info"
        />
      </div>

      {/* Top reasons chart */}
      {topReasons.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Top motivos de falha
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topReasons.map((r) => {
              const pct = Math.round((r.count / maxReasonCount) * 100);
              const isActive = errorCodeFilter === r.code;
              return (
                <button
                  key={r.code}
                  type="button"
                  onClick={() => setErrorCodeFilter(isActive ? 'all' : r.code)}
                  className={cn(
                    'w-full flex items-center gap-3 text-left rounded-md p-1.5 transition-colors',
                    isActive ? 'bg-primary/10' : 'hover:bg-muted/50',
                  )}
                  title={isActive ? 'Limpar filtro' : `Filtrar por ${r.code}`}
                >
                  <span className="text-xs font-mono w-32 truncate shrink-0">{r.code}</span>
                  <div className="flex-1 h-5 bg-muted/40 rounded overflow-hidden">
                    <div
                      className={cn(
                        'h-full transition-all',
                        isActive ? 'bg-primary' : 'bg-warning/70',
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs tabular-nums w-10 text-right shrink-0">{r.count}</span>
                </button>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Janela</label>
            <Select value={String(hours)} onValueChange={(v) => setHours(Number(v))}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Última hora</SelectItem>
                <SelectItem value="6">Últimas 6h</SelectItem>
                <SelectItem value="24">Últimas 24h</SelectItem>
                <SelectItem value="168">Últimos 7 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Status</label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="retrying">Reprocessando</SelectItem>
                <SelectItem value="succeeded">Sucesso</SelectItem>
                <SelectItem value="abandoned">Abandonado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Motivo</label>
            <Select value={errorCodeFilter} onValueChange={setErrorCodeFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {aggregates.byErrorCode.map((r) => (
                  <SelectItem key={r.code} value={r.code}>
                    {r.code} ({r.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="p-3 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-sm">
              <strong>{selectedIds.size}</strong> item(s) selecionado(s)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                Limpar seleção
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  bulkRetry.mutate(Array.from(selectedIds), {
                    onSuccess: () => setSelectedIds(new Set()),
                  });
                }}
                disabled={bulkRetry.isPending}
              >
                <RotateCw className={cn('h-4 w-4 mr-2', bulkRetry.isPending && 'animate-spin')} />
                Reprocessar selecionados
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmBulkAbandon(true)}
                disabled={bulkAbandon.isPending}
              >
                <Ban className="h-4 w-4 mr-2" />
                Abandonar selecionados
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            {sorted.length} item{sorted.length === 1 ? '' : 's'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Carregando…</div>
          ) : sorted.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-success/60" />
              <p className="text-sm text-muted-foreground">Nenhuma mensagem na fila — tudo certo.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allVisibleSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Selecionar tudo"
                      data-state={
                        allVisibleSelected ? 'checked'
                        : someVisibleSelected ? 'indeterminate'
                        : 'unchecked'
                      }
                    />
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Instância</TableHead>
                  <TableHead>Destinatário</TableHead>
                  <TableHead>Erro</TableHead>
                  <TableHead className="text-center">Tentativas</TableHead>
                  <TableHead>Próximo retry</TableHead>
                  <TableHead>Criado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((row) => (
                  <TableRow key={row.id} data-state={selectedIds.has(row.id) ? 'selected' : undefined}>
                    <TableCell className="w-10">
                      <Checkbox
                        checked={selectedIds.has(row.id)}
                        onCheckedChange={() => toggleOne(row.id)}
                        aria-label="Selecionar item"
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[row.status]}>
                        {STATUS_LABEL[row.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.instance_name}</TableCell>
                    <TableCell className="font-mono text-xs">{shortJid(row.remote_jid)}</TableCell>
                    <TableCell className="max-w-[280px]">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium">
                          {row.error_code ?? (row.http_status ? `HTTP ${row.http_status}` : '—')}
                        </span>
                        {row.error_message && (
                          <span className="text-xs text-muted-foreground truncate" title={row.error_message}>
                            {row.error_message}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-xs">
                      {row.retry_count}/{row.max_retries}
                    </TableCell>
                    <TableCell className="text-xs">{formatDate(row.next_attempt_at)}</TableCell>
                    <TableCell className="text-xs">{formatDate(row.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setSelected(row)}
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(row.status === 'pending' || row.status === 'retrying' || row.status === 'abandoned') && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => retryNow.mutate(row.id)}
                            disabled={retryNow.isPending}
                            title="Reprocessar agora"
                          >
                            <RotateCw className="h-4 w-4" />
                          </Button>
                        )}
                        {(row.status === 'pending' || row.status === 'retrying') && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => abandon.mutate(row.id)}
                            disabled={abandon.isPending}
                            title="Abandonar"
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Bulk abandon confirm */}
      <AlertDialog open={confirmBulkAbandon} onOpenChange={setConfirmBulkAbandon}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abandonar {selectedIds.size} item(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação marca as mensagens selecionadas como abandonadas e elas não serão mais reprocessadas
              automaticamente. Você ainda pode forçar reprocesso manual depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                bulkAbandon.mutate(Array.from(selectedIds), {
                  onSuccess: () => {
                    setSelectedIds(new Set());
                    setConfirmBulkAbandon(false);
                  },
                });
              }}
            >
              Confirmar abandono
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Details dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da falha</DialogTitle>
            <DialogDescription>
              {selected && `${selected.instance_name} → ${shortJid(selected.remote_jid)}`}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Field label="Status" value={STATUS_LABEL[selected.status]} />
                <Field label="HTTP" value={selected.http_status?.toString() ?? '—'} />
                <Field label="Código de erro" value={selected.error_code ?? '—'} />
                <Field label="Tentativas" value={`${selected.retry_count}/${selected.max_retries}`} />
                <Field label="Criado" value={formatDate(selected.created_at)} />
                <Field label="Última tentativa" value={formatDate(selected.last_attempt_at)} />
                <Field label="Próximo retry" value={formatDate(selected.next_attempt_at)} />
                <Field label="Concluído em" value={formatDate(selected.succeeded_at)} />
              </div>

              {selected.error_message && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Mensagem de erro</p>
                  <ScrollArea className="max-h-32 rounded border bg-muted/40 p-2">
                    <pre className="text-xs whitespace-pre-wrap break-all">{selected.error_message}</pre>
                  </ScrollArea>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Payload original</p>
                <ScrollArea className="max-h-64 rounded border bg-muted/40 p-2">
                  <pre className="text-xs whitespace-pre-wrap break-all">
                    {JSON.stringify(selected.payload, null, 2)}
                  </pre>
                </ScrollArea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                {(selected.status === 'pending' || selected.status === 'retrying' || selected.status === 'abandoned') && (
                  <Button
                    variant="outline"
                    onClick={() => { retryNow.mutate(selected.id); setSelected(null); }}
                    disabled={retryNow.isPending}
                  >
                    <RotateCw className="h-4 w-4 mr-2" />
                    Reprocessar agora
                  </Button>
                )}
                {(selected.status === 'pending' || selected.status === 'retrying') && (
                  <Button
                    variant="destructive"
                    onClick={() => { abandon.mutate(selected.id); setSelected(null); }}
                    disabled={abandon.isPending}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Abandonar
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
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
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1 truncate">{value}</p>
        </div>
        <Icon className={cn('h-8 w-8 opacity-70 shrink-0', toneClasses)} />
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
