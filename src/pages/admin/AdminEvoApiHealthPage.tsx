import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Activity, AlertCircle, Bell, CheckCircle2, Database,
  PlayCircle, RefreshCw, Server, Shield, Zap,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  useEvoApiDashboard, useActiveAlerts, useAcknowledgeAlert,
  useHealthHistory, useAlertChannels, useTestAlertChannel,
  useDrRunbook, useDrHealth, useRunTestSuite,
} from '@/lib/evoApiHealth/hooks';
import type {
  Severity, ActiveAlert, AlertChannel, HealthHistoryRow, DrRunbookStep,
} from '@/lib/evoApiHealth/types';

const SEVERITY_VARIANT: Record<Severity, 'destructive' | 'warning' | 'info'> = {
  critical: 'destructive',
  warning: 'warning',
  info: 'info',
};

export default function AdminEvoApiHealthPage() {
  const dash = useEvoApiDashboard();
  const alerts = useActiveAlerts();
  const ack = useAcknowledgeAlert();
  const history = useHealthHistory();
  const channels = useAlertChannels();
  const testChan = useTestAlertChannel();
  const runbook = useDrRunbook();
  const drHealth = useDrHealth();
  const runTests = useRunTestSuite();

  const health = dash.data?.health;
  const readiness = dash.data?.readiness;

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Server className="h-7 w-7 text-primary" />
            Evolution API · FATOR X
          </h1>
          <p className="text-muted-foreground mt-1">
            Saúde, alertas e integridade do schema <code className="text-xs bg-muted px-1.5 py-0.5 rounded">evo_api</code>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => dash.refetch()} disabled={dash.isFetching}>
            <RefreshCw className={`h-4 w-4 ${dash.isFetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button onClick={() => runTests.mutate()} disabled={runTests.isPending} isLoading={runTests.isPending}>
            <PlayCircle className="h-4 w-4" />
            {runTests.isPending ? 'Rodando 50 testes…' : 'Run test suite'}
          </Button>
        </div>
      </div>

      {/* Readiness banner */}
      {readiness && (
        <Alert variant={readiness.overall?.includes('🟢') ? 'default' : 'destructive'}>
          <Shield className="h-4 w-4" />
          <AlertTitle>{readiness.overall}</AlertTitle>
          <AlertDescription>
            {readiness.tables_count} tabelas · {readiness.fk_count} FKs ·{' '}
            {readiness.realtime_count} Realtime · {readiness.cron_jobs} cron jobs
          </AlertDescription>
        </Alert>
      )}

      {/* Test suite result */}
      {runTests.data && (
        <Alert variant={runTests.data.overall?.includes('🟢') ? 'default' : 'destructive'}>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>{runTests.data.overall}</AlertTitle>
          <AlertDescription>
            {runTests.data.passed}/{runTests.data.total_tests} testes passando
            {' '}({runTests.data.pass_rate_pct}%)
          </AlertDescription>
        </Alert>
      )}

      {/* Loading / error states */}
      {dash.isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Falha ao carregar dashboard</AlertTitle>
          <AlertDescription>{(dash.error as Error)?.message}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="health">
        <TabsList>
          <TabsTrigger value="health">Saúde</TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            Alertas
            {alerts.data?.length ? (
              <Badge variant="destructive">{alerts.data.length}</Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="channels">Canais</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="dr">DR</TabsTrigger>
        </TabsList>

        {/* === SAÚDE === */}
        <TabsContent value="health" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Instâncias abertas"
              value={health?.instances_open ?? '—'}
              total={health?.instances_total}
              icon={Server}
            />
            <KpiCard
              title="Mensagens (5m)"
              value={health?.messages_last_5m?.toLocaleString('pt-BR') ?? '—'}
              icon={Activity}
            />
            <KpiCard
              title="Mensagens (24h)"
              value={health?.messages_last_24h?.toLocaleString('pt-BR') ?? '—'}
              icon={Database}
            />
            <KpiCard
              title="Lag (s)"
              value={health?.lag_seconds ?? '—'}
              icon={Zap}
              warning={(health?.lag_seconds ?? 0) > 60}
            />
          </div>

          {readiness && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detalhes de prontidão</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Stat label="Tabelas" value={readiness.tables_count} status={readiness.tables_status} />
                <Stat label="Enums" value={readiness.enums_count} status={readiness.enums_status} />
                <Stat label="Foreign Keys" value={readiness.fk_count} status={readiness.fk_status} />
                <Stat label="Realtime" value={readiness.realtime_count} status={readiness.realtime_status} />
                <Stat label="Replica Full" value={readiness.replica_full_count} status={readiness.replica_full_status} />
                <Stat label="Índices" value={readiness.index_count} />
                <Stat label="Triggers" value={readiness.trigger_count} />
                <Stat label="Cron Jobs" value={readiness.cron_jobs} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* === ALERTAS === */}
        <TabsContent value="alerts" className="space-y-4">
          {alerts.data?.length === 0 && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Nenhum alerta ativo</AlertTitle>
              <AlertDescription>
                Os detectores rodam a cada 5 min e nada está fora do esperado.
              </AlertDescription>
            </Alert>
          )}
          <ScrollArea className="max-h-[600px]">
            <div className="space-y-3">
              {alerts.data?.map((a: ActiveAlert) => (
                <Card key={a.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={SEVERITY_VARIANT[a.severity] ?? 'secondary'}>
                            {a.severity}
                          </Badge>
                          <CardTitle className="text-base">{a.title}</CardTitle>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {a.alert_type} · há{' '}
                          {formatDistanceToNow(new Date(a.created_at), { locale: ptBR })}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => ack.mutate(a.id)}
                        disabled={ack.isPending}
                      >
                        Ack
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                      {JSON.stringify(a.details, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* === CANAIS === */}
        <TabsContent value="channels" className="space-y-4">
          {channels.data?.length === 0 && (
            <Alert>
              <Bell className="h-4 w-4" />
              <AlertTitle>Nenhum canal configurado</AlertTitle>
              <AlertDescription>
                Adicione Slack/Discord/Webhook em <code>evo_api.alert_channels</code> para
                receber notificações externas dos alertas warning/critical.
              </AlertDescription>
            </Alert>
          )}
          <div className="grid gap-3">
            {channels.data?.map((c: AlertChannel) => (
              <Card key={c.id}>
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{c.name}</span>
                      <Badge variant="outline">{c.channel_type}</Badge>
                      <Badge variant={c.active ? 'success' : 'subtle'}>
                        {c.active ? 'ativo' : 'desativado'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Severity mín.: {c.min_severity} · Rate-limit: {c.rate_limit_min}min ·
                      Sucesso: {c.success_rate_pct ?? '—'}%
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => testChan.mutate(c.id)}
                    disabled={testChan.isPending}>
                    Testar canal
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          {testChan.data !== undefined && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Resultado do teste</AlertTitle>
              <AlertDescription>
                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto mt-2">
                  {JSON.stringify(testChan.data, null, 2)}
                </pre>
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* === HISTÓRICO === */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Últimas 24h (snapshot a cada 5min)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground border-b">
                    <tr>
                      <th className="py-2 pr-3">Bucket</th>
                      <th className="py-2 pr-3">Inst. abertas</th>
                      <th className="py-2 pr-3">Pico msgs/5m</th>
                      <th className="py-2 pr-3">Lag médio</th>
                      <th className="py-2 pr-3">Lag máx</th>
                      <th className="py-2">OK?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.data?.map((h: HealthHistoryRow, idx: number) => (
                      <tr key={idx} className="border-b border-border/50">
                        <td className="py-1.5 pr-3 whitespace-nowrap">
                          {new Date(h.bucket).toLocaleString('pt-BR')}
                        </td>
                        <td className="py-1.5 pr-3">{h.avg_instances_open}</td>
                        <td className="py-1.5 pr-3">{h.peak_messages_5m}</td>
                        <td className="py-1.5 pr-3">{h.avg_lag_sec}s</td>
                        <td className="py-1.5 pr-3">{h.max_lag_sec}s</td>
                        <td className="py-1.5">{h.all_ok ? '🟢' : '🔴'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === DR === */}
        <TabsContent value="dr" className="space-y-4">
          {drHealth.data && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>{(drHealth.data as { overall?: string }).overall ?? 'DR Health'}</AlertTitle>
              <AlertDescription>
                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto mt-2">
                  {JSON.stringify(drHealth.data, null, 2)}
                </pre>
              </AlertDescription>
            </Alert>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Runbook (11 passos)</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <ol className="space-y-3">
                  {runbook.data?.map((s: DrRunbookStep) => (
                    <li key={s.step_number} className="border-l-2 border-primary/40 pl-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{s.icon} {s.category}</Badge>
                        <span className="font-medium">Passo {s.step_number}: {s.title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{s.description}</p>
                      {s.command && (
                        <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto">{s.command}</pre>
                      )}
                      {(s.rto_minutes != null || s.rpo_minutes != null) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {s.rto_minutes != null && <>RTO: {s.rto_minutes}min · </>}
                          {s.rpo_minutes != null && <>RPO: {s.rpo_minutes}min</>}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Subcomponentes ───────────────────────────────────────────────────

interface KpiCardProps {
  title: string;
  value: number | string;
  total?: number;
  icon: React.ComponentType<{ className?: string }>;
  warning?: boolean;
}

function KpiCard({ title, value, total, icon: Icon, warning }: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm text-muted-foreground font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${warning ? 'text-warning' : 'text-muted-foreground'}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${warning ? 'text-warning' : 'text-foreground'}`}>
          {value}
          {total !== undefined && (
            <span className="text-muted-foreground text-base font-normal"> / {total}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, status }: { label: string; value: number | string; status?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold flex items-center gap-2">
        {status && <span className="text-base">{status}</span>}
        {value ?? '—'}
      </p>
    </div>
  );
}
