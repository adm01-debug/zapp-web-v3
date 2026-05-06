import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Database, CheckCircle2, XCircle, RefreshCw, Activity, Webhook } from 'lucide-react';
import { externalSupabase, isExternalConfigured } from '@/integrations/supabase/externalClient';
import { log } from '@/lib/logger';

type HealthRow = {
  window_label?: string | null;
  events_total?: number | null;
  events_ok?: number | null;
  events_failed?: number | null;
  avg_latency_ms?: number | null;
  last_event_at?: string | null;
};

type Status = 'idle' | 'checking' | 'online' | 'offline';

/**
 * Painel da ponte Supabase ↔ Evolution API (FATOR X).
 * Mostra status da conexão com o backend externo que intermedia
 * todas as mensagens com a Evolution API via webhook.
 */
export function BridgeSupabaseView() {
  const [status, setStatus] = useState<Status>('idle');
  const [health, setHealth] = useState<HealthRow | null>(null);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const externalUrl = import.meta.env.VITE_EXTERNAL_SUPABASE_URL as string | undefined;

  const runCheck = async () => {
    if (!externalSupabase) {
      setStatus('offline');
      setError('Cliente externo não configurado.');
      return;
    }
    setStatus('checking');
    setError(null);
    try {
      const { data, error: qErr } = await externalSupabase
        .from('v_webhook_health')
        .select('*')
        .limit(1);

      if (qErr) throw qErr;
      setHealth((data?.[0] as HealthRow) ?? null);
      setStatus('online');
    } catch (e) {
      log.error('[BridgeSupabase] health check failed', e);
      setError(e instanceof Error ? e.message : 'Falha ao verificar.');
      setStatus('offline');
    } finally {
      setCheckedAt(new Date());
    }
  };

  useEffect(() => {
    runCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Database className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Ponte Supabase ↔ Evolution API</CardTitle>
                <CardDescription>
                  Backend externo (FATOR X) que recebe webhooks da Evolution API e
                  persiste todas as mensagens, contatos e conversas.
                </CardDescription>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={runCheck}
              disabled={status === 'checking'}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${status === 'checking' ? 'animate-spin' : ''}`} />
              Testar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {!isExternalConfigured ? (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="w-3 h-3" /> Não configurado
              </Badge>
            ) : status === 'online' ? (
              <Badge className="gap-1 bg-emerald-500/15 text-emerald-500 border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3" /> Online
              </Badge>
            ) : status === 'offline' ? (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="w-3 h-3" /> Offline
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <Activity className="w-3 h-3" /> Verificando…
              </Badge>
            )}
            {checkedAt && (
              <span className="text-xs text-muted-foreground">
                Última verificação: {checkedAt.toLocaleTimeString()}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <InfoRow label="Endpoint" value={externalUrl ?? '—'} mono />
            <InfoRow
              label="Webhook Evolution"
              value={
                externalUrl
                  ? `${externalUrl}/functions/v1/evolution-webhook`
                  : '—'
              }
              mono
            />
            <InfoRow label="Instância" value="wpp2" />
            <InfoRow
              label="Auth"
              value={isExternalConfigured ? 'Anon key configurada' : 'Faltando'}
            />
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {health && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Webhook className="w-4 h-4" />
              Saúde do Webhook
            </CardTitle>
            <CardDescription>
              Métricas em tempo real de eventos recebidos da Evolution API.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Janela" value={health.window_label ?? '—'} />
              <Stat label="Total" value={fmt(health.events_total)} />
              <Stat label="OK" value={fmt(health.events_ok)} tone="success" />
              <Stat label="Falhas" value={fmt(health.events_failed)} tone="error" />
              <Stat
                label="Latência média"
                value={
                  health.avg_latency_ms != null
                    ? `${Math.round(health.avg_latency_ms)} ms`
                    : '—'
                }
              />
              <Stat
                label="Último evento"
                value={
                  health.last_event_at
                    ? new Date(health.last_event_at).toLocaleString()
                    : '—'
                }
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function fmt(n: number | null | undefined) {
  if (n == null) return '—';
  return new Intl.NumberFormat('pt-BR').format(n);
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md border border-border/40 bg-muted/30 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-sm text-foreground break-all ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'success' | 'error';
}) {
  const toneClass =
    tone === 'success'
      ? 'text-emerald-500'
      : tone === 'error'
        ? 'text-destructive'
        : 'text-foreground';
  return (
    <div className="rounded-md border border-border/40 bg-muted/30 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-base font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}
