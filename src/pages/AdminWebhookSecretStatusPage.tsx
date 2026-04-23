import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { recheckWebhookSignature, type RecheckResult } from '@/lib/recheckWebhookSignature';
import { RecheckResultDialog } from './admin-webhook-secret-status/RecheckResultDialog';
import { supabase } from '@/integrations/supabase/client';
import { queryExternalProxy } from '@/lib/externalProxy';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ShieldCheck,
  ShieldAlert,
  Webhook,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  KeyRound,
  Activity,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { InstanceFilterSelect } from './admin-webhook-secret-status/InstanceFilterSelect';
import { InstanceStatusCards } from './admin-webhook-secret-status/InstanceStatusCards';
import { InstanceBreakdownTable } from './admin-webhook-secret-status/InstanceBreakdownTable';
import { AlertThresholdsPanel } from './admin-webhook-secret-status/AlertThresholdsPanel';
import { useWebhookHealthAlerts } from '@/hooks/useWebhookHealthAlerts';
import {
  aggregateValidationByInstance,
  computeInstanceStatus,
  computeLatencyStats,
  deriveInstances,
  type SecretStatusEvent,
} from './admin-webhook-secret-status/instanceAggregations';

interface SecretStatus {
  configured: boolean;
  length: number;
  hashPrefix: string | null;
  strictMode: boolean;
  checkedAt: string;
}

const REFRESH_INTERVAL = 30_000;

export default function AdminWebhookSecretStatusPage() {
  const { filters, setFilters } = useUrlFilters();
  // Reuse `agentId` slot for instance — but better: use raw URL via setFilters extension.
  // We'll piggy-back on a custom param via setSearchParams below.
  const instance = (filters as unknown as { instance?: string | null }).instance ?? null;
  // useUrlFilters doesn't natively expose `instance`; we use a dedicated query param.
  const selectedInstance = useMemo<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('instance');
  }, [filters]); // refresh when other filters change too
  void instance;

  const setInstance = (next: string | null) => {
    const url = new URL(window.location.href);
    if (next) url.searchParams.set('instance', next);
    else url.searchParams.delete('instance');
    window.history.replaceState({}, '', url.toString());
    // Force re-render by touching useUrlFilters
    setFilters({ search: filters.search });
  };

  // 1. Secret status (no value exposed)
  const secretQuery = useQuery({
    queryKey: ['webhook-secret-status'],
    queryFn: async (): Promise<SecretStatus> => {
      const { data, error } = await supabase.functions.invoke('webhook-secret-status');
      if (error) throw error;
      return data as SecretStatus;
    },
    refetchInterval: REFRESH_INTERVAL,
  });

  // 2. Recent webhook events — last 24h. Server-side filter by instance when set.
  const eventsQuery = useQuery({
    queryKey: ['webhook-recent-events', selectedInstance],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const filtersArr = [
        { column: 'created_at', operator: 'gte', value: since },
      ];
      if (selectedInstance) {
        filtersArr.push({ column: 'instance_name', operator: 'eq', value: selectedInstance });
      }
      const res = await queryExternalProxy<SecretStatusEvent>({
        table: 'evolution_webhook_events',
        select:
          'id,event_type,instance_name,processed,processed_at,error_message,created_at',
        filters: filtersArr,
        order: { column: 'created_at', ascending: false },
        limit: 500,
      });
      return res.data ?? [];
    },
    refetchInterval: REFRESH_INTERVAL,
  });

  // 3. Always fetch a small global slice for the instance dropdown so the user can
  //    switch even if currently filtered to an instance with no traffic.
  const instancesQuery = useQuery({
    queryKey: ['webhook-instances-list'],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const res = await queryExternalProxy<{ instance_name: string | null }>({
        table: 'evolution_webhook_events',
        select: 'instance_name',
        filters: [{ column: 'created_at', operator: 'gte', value: since }],
        order: { column: 'created_at', ascending: false },
        limit: 500,
      });
      return res.data ?? [];
    },
    refetchInterval: REFRESH_INTERVAL * 4,
  });

  const refetchAll = () => {
    secretQuery.refetch();
    eventsQuery.refetch();
    instancesQuery.refetch();
  };

  const events = eventsQuery.data ?? [];
  const lastEvent = events[0];
  const total24h = events.length;
  const validSigned = events.filter((e) => e.signature_valid === true).length;
  const invalidSigned = events.filter((e) => e.signature_valid === false).length;
  const unsigned = events.filter((e) => e.signature_valid === null).length;
  const errored = events.filter((e) => e.error_message).length;
  const validationRate = total24h > 0 ? Math.round((validSigned / total24h) * 100) : 0;

  const instances = useMemo(() => {
    const fromList = deriveInstances(
      (instancesQuery.data ?? []).map((r) => ({
        event_type: '',
        instance_name: r.instance_name,
        signature_valid: null,
        processed: null,
        processed_at: null,
        error_message: null,
        created_at: '',
      })),
    );
    // Always include current selection so it stays selectable when filtered.
    if (selectedInstance && !fromList.includes(selectedInstance)) fromList.push(selectedInstance);
    return fromList.sort();
  }, [instancesQuery.data, selectedInstance]);

  // Live status / latency for the selected instance (or global).
  const liveStatus = useMemo(
    () => computeInstanceStatus(events, selectedInstance),
    [events, selectedInstance],
  );
  const latency = useMemo(() => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    return computeLatencyStats(events.filter((e) => new Date(e.created_at).getTime() >= oneHourAgo));
  }, [events]);

  // Per-instance breakdown only relevant when no instance selected.
  const breakdown = useMemo(() => aggregateValidationByInstance(events), [events]);

  const secret = secretQuery.data;
  const enabled = (secret?.configured ?? false) || total24h > 0;
  const scopeLabel = selectedInstance ?? 'todas';

  // Realtime alerts hook — partilha config/state com o painel.
  const {
    config: alertConfig,
    setConfig: setAlertConfig,
    activeBreaches,
    recentAlerts,
  } = useWebhookHealthAlerts();

  // Recheck dialog state
  const [recheckOpen, setRecheckOpen] = useState(false);
  const [recheckLoading, setRecheckLoading] = useState(false);
  const [recheckResult, setRecheckResult] = useState<RecheckResult | null>(null);
  const [recheckError, setRecheckError] = useState<string | null>(null);
  const [recheckingId, setRecheckingId] = useState<string | null>(null);

  const handleRecheck = async (eventId: string) => {
    setRecheckingId(eventId);
    setRecheckOpen(true);
    setRecheckLoading(true);
    setRecheckResult(null);
    setRecheckError(null);
    try {
      const res = await recheckWebhookSignature(eventId);
      setRecheckResult(res);
      if (res.signature_valid === true) toast.success('Assinatura válida');
      else if (res.signature_valid === false) toast.error('Assinatura inválida');
      else toast.message('Revalidação inconclusiva');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao revalidar';
      setRecheckError(msg);
      toast.error(msg);
    } finally {
      setRecheckLoading(false);
      setRecheckingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Webhook className="h-6 w-6 text-primary" />
            Status do Webhook & Secret
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitoramento do <code>WEBHOOK_SECRET</code> e da saúde do recebimento — sem expor o valor.
            Escopo atual: <span className="font-medium text-foreground">{scopeLabel}</span>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeBreaches.length > 0 && (
            <Badge variant="destructive" className="gap-1">
              <ShieldAlert className="h-3 w-3" />
              {activeBreaches.length} alerta{activeBreaches.length > 1 ? 's' : ''} ativo{activeBreaches.length > 1 ? 's' : ''}
            </Badge>
          )}
          <InstanceFilterSelect
            instances={instances}
            value={selectedInstance}
            onChange={setInstance}
            disabled={instancesQuery.isLoading}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={refetchAll}
            disabled={secretQuery.isFetching || eventsQuery.isFetching}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${
                secretQuery.isFetching || eventsQuery.isFetching ? 'animate-spin' : ''
              }`}
            />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Live instance status (above HMAC section) */}
      <InstanceStatusCards
        instance={selectedInstance}
        status={liveStatus}
        latency={latency}
        isLoading={eventsQuery.isLoading}
      />

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Secret card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              WEBHOOK_SECRET
            </CardTitle>
          </CardHeader>
          <CardContent>
            {secretQuery.isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : secret?.configured ? (
              <>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-success" />
                  <Badge variant="success">Configurado</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-2 font-mono">
                  {secret.length} chars · #{secret.hashPrefix}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-destructive" />
                  <Badge variant="destructive">Ausente</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-2">Modo não-strict ativo</div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Webhook enabled */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Webhook
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eventsQuery.isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="flex items-center gap-2">
                  {enabled ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <Badge variant={enabled ? 'success' : 'subtle'}>
                    {enabled ? 'Habilitado' : 'Inativo'}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {total24h} eventos / 24h ({scopeLabel})
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Last received */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Último recebimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eventsQuery.isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : lastEvent ? (
              <>
                <div className="text-lg font-semibold">
                  {formatDistanceToNow(new Date(lastEvent.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </div>
                <div className="text-xs text-muted-foreground mt-1 truncate">
                  {lastEvent.event_type}
                  {lastEvent.instance_name ? ` · ${lastEvent.instance_name}` : ''}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Nenhum evento</div>
            )}
          </CardContent>
        </Card>

        {/* Signature validation rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Assinatura validada — {scopeLabel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eventsQuery.isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {validationRate}
                  <span className="text-base text-muted-foreground">%</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {validSigned} válidas · {invalidSigned} inválidas · {unsigned} sem
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Per-instance breakdown — only when filter = "all" */}
      {!selectedInstance && (
        <InstanceBreakdownTable stats={breakdown} onSelectInstance={setInstance} />
      )}

      {/* Alerts */}
      {!secret?.configured && (
        <Alert variant="default" className="border-warning/40 bg-warning/5">
          <ShieldAlert className="h-4 w-4 text-warning" />
          <AlertTitle>Secret não configurado</AlertTitle>
          <AlertDescription>
            O <code>WEBHOOK_SECRET</code> não está definido. Webhooks são aceitos sem validação HMAC
            (modo não-strict). Configure o secret nas variáveis de ambiente da Lovable Cloud para ativar
            a validação criptográfica.
          </AlertDescription>
        </Alert>
      )}

      {invalidSigned > 0 && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Assinaturas inválidas detectadas — {scopeLabel}</AlertTitle>
          <AlertDescription>
            {invalidSigned} requisições nas últimas 24h falharam na validação HMAC. Verifique se o
            secret é idêntico na Evolution API.
          </AlertDescription>
        </Alert>
      )}

      {/* Detail card — verification metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Metadados da validação</CardTitle>
          <CardDescription>Informações coletadas sem exposição do segredo.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Modo strict</span>
              <span className="font-medium">
                {secret?.strictMode ? (
                  <Badge variant="success">Ativo</Badge>
                ) : (
                  <Badge variant="subtle">Inativo</Badge>
                )}
              </span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Tamanho do secret</span>
              <span className="font-mono">{secret?.length ?? 0} caracteres</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Hash prefix (SHA-256)</span>
              <span className="font-mono">{secret?.hashPrefix ? `${secret.hashPrefix}…` : '—'}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Último check</span>
              <span>
                {secret?.checkedAt
                  ? formatDistanceToNow(new Date(secret.checkedAt), {
                      addSuffix: true,
                      locale: ptBR,
                    })
                  : '—'}
              </span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Eventos sem assinatura</span>
              <span className="font-mono">{unsigned}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Eventos com erro</span>
              <span className="font-mono">{errored}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent events table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimos eventos recebidos — {scopeLabel}</CardTitle>
          <CardDescription>Top 20 eventos das últimas 24 horas — atualiza a cada 30s.</CardDescription>
        </CardHeader>
        <CardContent>
          {eventsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhum webhook recebido nas últimas 24h.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-4">Quando</th>
                    <th className="py-2 pr-4">Evento</th>
                    <th className="py-2 pr-4">Instância</th>
                    <th className="py-2 pr-4">Assinatura</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {events.slice(0, 20).map((e) => (
                    <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">
                        {formatDistanceToNow(new Date(e.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs">{e.event_type}</td>
                      <td className="py-2 pr-4 text-xs">{e.instance_name ?? '—'}</td>
                      <td className="py-2 pr-4">
                        {e.signature_valid === true ? (
                          <Badge variant="success">válida</Badge>
                        ) : e.signature_valid === false ? (
                          <Badge variant="destructive">inválida</Badge>
                        ) : (
                          <Badge variant="subtle">—</Badge>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {e.error_message ? (
                          <Badge variant="destructive">erro</Badge>
                        ) : e.processed ? (
                          <Badge variant="success">ok</Badge>
                        ) : (
                          <Badge variant="subtle">pendente</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Realtime alerts configuration */}
      <AlertThresholdsPanel
        config={alertConfig}
        onChange={setAlertConfig}
        recentAlerts={recentAlerts}
        activeCount={activeBreaches.length}
      />
    </div>
  );
}
