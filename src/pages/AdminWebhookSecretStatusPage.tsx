import { useQuery } from '@tanstack/react-query';
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

interface SecretStatus {
  configured: boolean;
  length: number;
  hashPrefix: string | null;
  strictMode: boolean;
  checkedAt: string;
}

interface WebhookEvent {
  id: string;
  event_type: string;
  instance_name: string | null;
  signature_valid: boolean | null;
  processed: boolean | null;
  error_message: string | null;
  created_at: string;
}

const REFRESH_INTERVAL = 30_000;

export default function AdminWebhookSecretStatusPage() {
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

  // 2. Recent webhook events (last 100, last 24h) — from FATOR X
  const eventsQuery = useQuery({
    queryKey: ['webhook-recent-events'],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const res = await queryExternalProxy<WebhookEvent>({
        table: 'evolution_webhook_events',
        select: 'id,event_type,instance_name,signature_valid,processed,error_message,created_at',
        filters: [{ column: 'created_at', operator: 'gte', value: since }],
        order: { column: 'created_at', ascending: false },
        limit: 200,
      });
      return res.data ?? [];
    },
    refetchInterval: REFRESH_INTERVAL,
  });

  const refetchAll = () => {
    secretQuery.refetch();
    eventsQuery.refetch();
  };

  const events = eventsQuery.data ?? [];
  const lastEvent = events[0];
  const total24h = events.length;
  const validSigned = events.filter((e) => e.signature_valid === true).length;
  const invalidSigned = events.filter((e) => e.signature_valid === false).length;
  const unsigned = events.filter((e) => e.signature_valid === null).length;
  const errored = events.filter((e) => e.error_message).length;
  const validationRate =
    total24h > 0 ? Math.round((validSigned / total24h) * 100) : 0;

  const secret = secretQuery.data;
  const enabled = (secret?.configured ?? false) || total24h > 0;

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
            Monitoramento da configuração do <code>WEBHOOK_SECRET</code> e da saúde do
            recebimento — sem expor o valor.
          </p>
        </div>
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
                <div className="text-xs text-muted-foreground mt-2">
                  Modo não-strict ativo
                </div>
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
                  {total24h} eventos / 24h
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
              Assinatura validada
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

      {/* Alerts */}
      {!secret?.configured && (
        <Alert variant="default" className="border-warning/40 bg-warning/5">
          <ShieldAlert className="h-4 w-4 text-warning" />
          <AlertTitle>Secret não configurado</AlertTitle>
          <AlertDescription>
            O <code>WEBHOOK_SECRET</code> não está definido. Webhooks são aceitos sem
            validação HMAC (modo não-strict). Configure o secret nas variáveis de
            ambiente da Lovable Cloud para ativar a validação criptográfica.
          </AlertDescription>
        </Alert>
      )}

      {invalidSigned > 0 && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Assinaturas inválidas detectadas</AlertTitle>
          <AlertDescription>
            {invalidSigned} requisições nas últimas 24h falharam na validação HMAC.
            Verifique se o secret é idêntico na Evolution API.
          </AlertDescription>
        </Alert>
      )}

      {/* Detail card — verification metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Metadados da validação</CardTitle>
          <CardDescription>
            Informações coletadas sem exposição do segredo.
          </CardDescription>
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
              <span className="font-mono">
                {secret?.hashPrefix ? `${secret.hashPrefix}…` : '—'}
              </span>
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
          <CardTitle className="text-base">Últimos eventos recebidos</CardTitle>
          <CardDescription>
            Top 20 eventos das últimas 24 horas — atualiza a cada 30s.
          </CardDescription>
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
    </div>
  );
}
