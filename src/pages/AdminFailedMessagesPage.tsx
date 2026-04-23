import { useEffect, useMemo, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertTriangle, RefreshCw, Inbox, CheckCircle2, XCircle,
  Clock, RotateCw, Ban, Eye, PlayCircle, Server, BarChart3,
  Search, ChevronLeft, ChevronRight, Copy, Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  useFailedMessages,
  useFailedMessagesStats,
  type FailedMessageRow,
  type FailedMessageStatus,
} from '@/hooks/monitoring/useFailedMessages';
import { useUserRole } from '@/hooks/useUserRole';
import { cn } from '@/lib/utils';
import { RetryConfigPanel } from '@/components/admin/RetryConfigPanel';
import { toast } from 'sonner';

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
  const { isAdmin, isSupervisor } = useUserRole();
  const readOnly = !isAdmin;
  const [hours, setHours] = useState(24);
  const [statusFilter, setStatusFilter] = useState<FailedMessageStatus | 'all'>('all');
  const [errorCodeFilter, setErrorCodeFilter] = useState<string>('all');
  const [instanceFilter, setInstanceFilter] = useState<string>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState<string | null>(null);
  const [customFrom, setCustomFrom] = useState<string>(''); // datetime-local
  const [customTo, setCustomTo] = useState<string>('');
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const [selected, setSelected] = useState<FailedMessageRow | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmBulkAbandon, setConfirmBulkAbandon] = useState(false);
  const [bulkReason, setBulkReason] = useState('');

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim() || null);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [hours, statusFilter, errorCodeFilter, instanceFilter, customFrom, customTo]);

  const fromIso = customFrom ? new Date(customFrom).toISOString() : null;
  const toIso = customTo ? new Date(customTo).toISOString() : null;
  const useCustomRange = !!(fromIso && toIso);

  const { data: stats } = useFailedMessagesStats();

  const {
    rows,
    total,
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
    hours: useCustomRange ? undefined : hours,
    status: statusFilter === 'all' ? null : statusFilter,
    errorCode: errorCodeFilter === 'all' ? null : errorCodeFilter,
    instance: instanceFilter === 'all' ? null : instanceFilter,
    search,
    from: useCustomRange ? fromIso : null,
    to: useCustomRange ? toIso : null,
    page,
    pageSize,
  });

  const sorted = useMemo(
    () => [...rows].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)),
    [rows],
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

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
          {isAdmin && (
            <Button
              size="sm"
              onClick={() => triggerReprocess.mutate()}
              disabled={triggerReprocess.isPending}
            >
              <PlayCircle className={cn('h-4 w-4 mr-2', triggerReprocess.isPending && 'animate-spin')} />
              Reprocessar agora
            </Button>
          )}
        </div>
      </header>

      {readOnly && isSupervisor && (
        <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-foreground flex items-center gap-2">
          <Lock className="h-3.5 w-3.5" />
          <span>Modo somente leitura — ações de reprocesso e abandono são restritas a administradores.</span>
        </div>
      )}

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
          <div className="flex flex-col gap-1 min-w-[220px] flex-1">
            <label className="text-xs text-muted-foreground">Buscar (JID, código, mensagem)</label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="ex.: 5511..., ETIMEDOUT, 503"
                className="pl-8"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">
              Janela {useCustomRange && <span className="text-warning">(ignorada)</span>}
            </label>
            <Select
              value={String(hours)}
              onValueChange={(v) => setHours(Number(v))}
              disabled={useCustomRange}
            >
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
            <label className="text-xs text-muted-foreground">De</label>
            <Input
              type="datetime-local"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="w-[200px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Até</label>
            <Input
              type="datetime-local"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="w-[200px]"
            />
          </div>
          {(customFrom || customTo) && (
            <div className="flex flex-col gap-1 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setCustomFrom(''); setCustomTo(''); }}
              >
                Limpar datas
              </Button>
            </div>
          )}
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
            <label className="text-xs text-muted-foreground">Instância</label>
            <Select value={instanceFilter} onValueChange={setInstanceFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {(stats?.by_instance ?? []).map((i) => (
                  <SelectItem key={i.instance} value={i.instance}>
                    {i.instance} ({i.count})
                  </SelectItem>
                ))}
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

      {/* Bulk action bar (admin only) */}
      {isAdmin && selectedIds.size > 0 && (
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
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            {total} item{total === 1 ? '' : 's'}
            {total > pageSize && (
              <span className="text-xs text-muted-foreground font-normal">
                · página {page + 1} de {totalPages}
              </span>
            )}
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
                  {isAdmin && (
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
                  )}
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
                  <TableRow
                    key={row.id}
                    data-state={selectedIds.has(row.id) ? 'selected' : undefined}
                    className="cursor-pointer"
                    onClick={() => setSelected(row)}
                  >
                    {isAdmin && (
                      <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(row.id)}
                          onCheckedChange={() => toggleOne(row.id)}
                          aria-label="Selecionar item"
                        />
                      </TableCell>
                    )}
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
                    <TableCell className="text-xs" title={row.next_attempt_at ?? undefined}>
                      {row.next_attempt_at
                        ? formatDistanceToNow(new Date(row.next_attempt_at), { addSuffix: true, locale: ptBR })
                        : '—'}
                    </TableCell>
                    <TableCell className="text-xs">{formatDate(row.created_at)}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setSelected(row)}
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {isAdmin && (row.status === 'pending' || row.status === 'retrying' || row.status === 'abandoned') && (
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
                        {isAdmin && (row.status === 'pending' || row.status === 'retrying') && (
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
          {/* Pagination */}
          {total > pageSize && (
            <div className="flex items-center justify-between gap-2 p-3 border-t">
              <span className="text-xs text-muted-foreground">
                Mostrando {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} de {total}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk abandon confirm */}
      <AlertDialog open={confirmBulkAbandon} onOpenChange={(o) => {
        setConfirmBulkAbandon(o);
        if (!o) setBulkReason('');
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abandonar {selectedIds.size} item(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação marca as mensagens selecionadas como abandonadas e elas não serão mais reprocessadas
              automaticamente. Você ainda pode forçar reprocesso manual depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Motivo (opcional, fica registrado no log)
            </label>
            <Textarea
              value={bulkReason}
              onChange={(e) => setBulkReason(e.target.value)}
              placeholder="ex.: limpeza de exhausted antigos, instância descontinuada..."
              rows={3}
              maxLength={500}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                bulkAbandon.mutate(
                  { ids: Array.from(selectedIds), reason: bulkReason },
                  {
                    onSuccess: () => {
                      setSelectedIds(new Set());
                      setConfirmBulkAbandon(false);
                      setBulkReason('');
                    },
                  },
                );
              }}
            >
              Confirmar abandono
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Details drawer (Sheet right) */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalhes da falha</SheetTitle>
            <SheetDescription>
              {selected && (
                <span className="font-mono text-xs">
                  {selected.instance_name} → {shortJid(selected.remote_jid)}
                </span>
              )}
            </SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_VARIANT[selected.status]}>
                  {STATUS_LABEL[selected.status]}
                </Badge>
                {selected.remote_jid && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          navigator.clipboard.writeText(selected.remote_jid ?? '');
                          toast.success('JID copiado');
                        }}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copiar JID
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{selected.remote_jid}</TooltipContent>
                  </Tooltip>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <Field label="HTTP" value={selected.http_status?.toString() ?? '—'} />
                <Field label="Código de erro" value={selected.error_code ?? '—'} />
                <Field label="Tentativas" value={`${selected.retry_count}/${selected.max_retries}`} />
                <Field label="Próximo retry" value={formatDate(selected.next_attempt_at)} />
                <Field label="Criado" value={formatDate(selected.created_at)} />
                <Field label="Última tentativa" value={formatDate(selected.last_attempt_at)} />
                <Field label="Concluído em" value={formatDate(selected.succeeded_at)} />
                <Field label="Atualizado" value={formatDate(selected.updated_at)} />
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

              <div className="flex justify-end gap-2 pt-2 border-t">
                {isAdmin && (selected.status === 'pending' || selected.status === 'retrying' || selected.status === 'abandoned') && (
                  <Button
                    variant="outline"
                    onClick={() => { retryNow.mutate(selected.id); setSelected(null); }}
                    disabled={retryNow.isPending}
                  >
                    <RotateCw className="h-4 w-4 mr-2" />
                    Reprocessar agora
                  </Button>
                )}
                {isAdmin && (selected.status === 'pending' || selected.status === 'retrying') && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      const reason = window.prompt('Motivo do abandono (opcional):') ?? '';
                      abandon.mutate({ id: selected.id, reason });
                      setSelected(null);
                    }}
                    disabled={abandon.isPending}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Abandonar
                  </Button>
                )}
                {readOnly && (
                  <span className="text-xs text-muted-foreground self-center">
                    Apenas leitura
                  </span>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
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
