// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  ShieldAlert,
  History,
  Activity,
  Terminal,
  CheckCircle2,
  AlertCircle,
  RefreshCcw,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { runFullHealthCheck, type HealthStatus } from '@/lib/healthCheck';

interface FeatureConfig {
  enabled: boolean;
  percentage?: number;
  segments?: string[];
  killSwitch?: boolean;
}

interface Flag {
  key: string;
  value: FeatureConfig;
  description: string;
}

export function FeatureFlagsAdmin() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [healthResults, setHealthResults] = useState<HealthStatus[]>([]);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [metrics, setMetrics] = useState({ pendingRetries: 0, failedTotal: 0 });

  const fetchFlags = useCallback(async () => {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .like('key', 'feature_%');

    if (!error && data) {
      setFlags(
        data.map((f) => {
          let val: FeatureConfig = { enabled: false };
          try {
            val =
              typeof f.value === 'string'
                ? JSON.parse(f.value)
                : typeof f.value === 'boolean'
                  ? { enabled: f.value }
                  : f.value;
          } catch (_e) {
            val = { enabled: !!f.value };
          }
          return {
            key: f.key,
            value: val,
            description: f.description || '',
          };
        })
      );
    }
    setLoading(false);
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(15);

    if (!error && data) setAuditLogs(data);
  }, []);

  const fetchMetrics = useCallback(async () => {
    const { data: retries } = await supabase
      .from('message_retry_queue')
      .select('id')
      .eq('status', 'pending');
    const { data: failed } = await supabase
      .from('message_retry_queue')
      .select('id')
      .eq('status', 'failed');
    setMetrics({
      pendingRetries: retries?.length || 0,
      failedTotal: failed?.length || 0,
    });
  }, []);

  const executeHealthCheck = async () => {
    setCheckingHealth(true);
    const results = await runFullHealthCheck();
    setHealthResults(results);
    setCheckingHealth(false);
    toast({
      title: 'Health Check concluído',
      description: 'Verifique o status dos serviços ao lado.',
    });
  };

  useEffect(() => {
    fetchFlags();
    fetchAuditLogs();
    fetchMetrics();
    executeHealthCheck();
  }, [fetchFlags, fetchAuditLogs, fetchMetrics]);

  const updateFlag = async (key: string, newConfig: FeatureConfig) => {
    const { error } = await supabase
      .from('app_settings')
      .update({
        value: JSON.stringify(newConfig),
        updated_at: new Date().toISOString(),
      })
      .eq('key', key);

    if (error) {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' });
    } else {
      toast({
        title: 'Configuração salva',
        description: `${key.replace('feature_', '')} atualizado com sucesso.`,
      });
      fetchFlags();
      fetchAuditLogs();
    }
  };

  const killSwitch = async () => {
    const criticalFlags = ['feature_v2_audio_recorder', 'feature_message_queue_retry'];
    setLoading(true);

    for (const key of criticalFlags) {
      await supabase
        .from('app_settings')
        .update({
          value: JSON.stringify({ enabled: false, killSwitch: true }),
          updated_at: new Date().toISOString(),
        })
        .eq('key', key);
    }

    toast({
      title: 'EMERGÊNCIA: KILL-SWITCH ATIVADO',
      description: 'Funcionalidades críticas bloqueadas permanentemente via killSwitch: true.',
      variant: 'destructive',
    });
    fetchFlags();
    fetchAuditLogs();
    setLoading(false);
  };

  if (loading)
    return (
      <div className="animate-pulse p-8 text-center">Carregando infraestrutura de controle...</div>
    );

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="space-y-1">
          <h1 className="flex items-center gap-3 text-4xl font-black tracking-tighter">
            <Terminal className="h-10 w-10 text-primary" /> Admin Panel: Feature Management
          </h1>
          <p className="font-medium text-muted-foreground">
            Controle granular de rollout, segmentação e segurança.
          </p>
        </div>
        <Button
          variant="destructive"
          size="lg"
          onClick={killSwitch}
          className="gap-2 font-black uppercase tracking-widest shadow-2xl shadow-destructive/40 transition-transform hover:scale-105"
        >
          <ShieldAlert className="h-6 w-6 animate-pulse" /> Kill-Switch de Emergência
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {flags.map((flag) => (
            <Card
              key={flag.key}
              className={`border-2 transition-all ${flag.value.killSwitch ? 'border-destructive bg-destructive/5' : 'hover:border-primary/40'}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-xl font-bold uppercase tracking-tight">
                      {flag.key.replace('feature_', '')}
                      {flag.value.killSwitch && (
                        <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] text-foreground">
                          LOCKED
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {flag.description || 'Controle esta funcionalidade.'}
                    </CardDescription>
                  </div>
                  <Switch
                    disabled={flag.value.killSwitch}
                    checked={flag.value.enabled}
                    onCheckedChange={(val) => updateFlag(flag.key, { ...flag.value, enabled: val })}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="mt-2 grid gap-6 border-t border-border/50 pt-2 md:grid-cols-2">
                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">
                      Rollout Progressivo (%)
                    </Label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        disabled={flag.value.killSwitch || !flag.value.enabled}
                        value={flag.value.percentage || 0}
                        onChange={(e) =>
                          updateFlag(flag.key, {
                            ...flag.value,
                            percentage: parseInt(e.target.value),
                          })
                        }
                        className="flex-1 accent-primary"
                      />
                      <span className="w-8 font-bold">{flag.value.percentage || 0}%</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">
                      Segmentos (IDs separados por vírgula)
                    </Label>
                    <input
                      type="text"
                      placeholder="user-123, tenant-abc"
                      disabled={flag.value.killSwitch || !flag.value.enabled}
                      defaultValue={flag.value.segments?.join(', ') || ''}
                      onBlur={(e) => {
                        const segments = e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean);
                        updateFlag(flag.key, { ...flag.value, segments });
                      }}
                      className="w-full rounded-lg border-none bg-muted/50 px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-6">
          <Card className="border-2 border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-bold">Health & Performance</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={executeHealthCheck}
                disabled={checkingHealth}
                className={checkingHealth ? 'animate-spin' : ''}
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">
                    Queue Pending
                  </p>
                  <p className="text-2xl font-black">{metrics.pendingRetries}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">
                    Queue Failed
                  </p>
                  <p className="text-2xl font-black text-destructive">{metrics.failedTotal}</p>
                </div>
              </div>

              <div className="space-y-2">
                {healthResults.map((res, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded border border-border/30 bg-muted/20 p-2 text-xs"
                  >
                    <span className="font-medium">{res.service}</span>
                    <div className="flex items-center gap-2">
                      {res.latency && (
                        <span className="text-[9px] text-muted-foreground">{res.latency}ms</span>
                      )}
                      {res.status === 'ok' ? (
                        <CheckCircle2 className="h-4 w-4 text-success-foreground" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="sticky top-6 border-2 border-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="h-5 w-5 text-primary" /> Audit Trail
              </CardTitle>
              <CardDescription>Rastreabilidade total de alterações.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[400px] space-y-3 overflow-y-auto px-4 pb-4">
                {auditLogs.map((log, i) => (
                  <div
                    key={i}
                    className="group rounded-lg border border-border/50 bg-muted/30 p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-primary">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                      <span className="rounded bg-primary/10 px-1.5 text-[10px] font-bold uppercase text-primary">
                        {log.action}
                      </span>
                    </div>
                    <div className="line-clamp-2 break-all text-[11px]">
                      <span className="font-bold text-foreground">
                        {(log.details as any)?.new?.key?.replace('feature_', '')}
                      </span>
                      <p className="mt-1 text-muted-foreground opacity-70 transition-opacity group-hover:opacity-100">
                        {JSON.stringify((log.details as any)?.new?.value)}
                      </p>
                    </div>
                  </div>
                ))}
                {auditLogs.length === 0 && (
                  <div className="space-y-2 py-12 text-center">
                    <Activity className="mx-auto h-8 w-8 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground">Nenhuma atividade registrada.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
