import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle, Send, Shield, PlayCircle, Loader2, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConnectionInfo, WebhookTestResult, WebhookConfig } from './hooks/useEvolutionMonitoring';

interface Props {
  connections: ConnectionInfo[];
  webhookTest: WebhookTestResult;
  webhookConfig: WebhookConfig | null;
  reconfiguring: boolean;
  onTest: (instanceId: string) => void;
  onReconfigure: (instanceId: string) => void;
}

const CRITICAL_EVENTS = ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED', 'CONTACTS_UPSERT'];

export function MonitoringWebhookPanel({ connections, webhookTest, webhookConfig, reconfiguring, onTest, onReconfigure }: Props) {
  const missingEvents = webhookConfig?.events
    ? CRITICAL_EVENTS.filter(e => !webhookConfig.events?.includes(e))
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Test Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="w-4 h-4" />Teste de Entrega
          </CardTitle>
          <CardDescription>Envia payload de teste e verifica persistência</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {connections.map(conn => (
            <div key={conn.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="font-medium text-sm">{conn.instance_id}</span>
              <Button size="sm" onClick={() => onTest(conn.instance_id)} disabled={webhookTest.status === 'testing'}>
                {webhookTest.status === 'testing'
                  ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Testando...</>
                  : <><PlayCircle className="w-3.5 h-3.5 mr-1" />Testar</>
                }
              </Button>
            </div>
          ))}
          {webhookTest.status !== 'idle' && webhookTest.status !== 'testing' && (
            <div className={cn(
              'p-4 rounded-lg border',
              webhookTest.status === 'success' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-destructive/5 border-destructive/20'
            )}>
              <div className="flex items-center gap-2">
                {webhookTest.status === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-destructive" />}
                <span className="font-medium text-sm">{webhookTest.status === 'success' ? 'Sucesso' : 'Falha'}</span>
                {webhookTest.latencyMs && <Badge variant="outline" className="text-xs">{webhookTest.latencyMs}ms</Badge>}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{webhookTest.message}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Config Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" />Configuração do Webhook
          </CardTitle>
          <CardDescription>Verifique e reconfigure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {webhookConfig ? (
            <>
              <div className="flex items-center gap-2">
                {webhookConfig.configured ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-destructive" />}
                <span className="font-medium text-sm">{webhookConfig.configured ? 'Configurado' : 'NÃO Configurado'}</span>
              </div>
              {webhookConfig.url && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wide">URL</p>
                  <p className="text-xs font-mono break-all">{webhookConfig.url}</p>
                </div>
              )}
              {webhookConfig.events && webhookConfig.events.length > 0 && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wide">Eventos ({webhookConfig.events.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {webhookConfig.events.map(e => (
                      <Badge key={e} variant="outline" className="text-[10px]">{e}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {missingEvents.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium text-xs">Eventos críticos ausentes!</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {missingEvents.map(e => <Badge key={e} variant="destructive" className="text-[10px]">{e}</Badge>)}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Clique "Ver Webhook" em uma conexão.</p>
          )}

          {connections.map(conn => (
            <Button key={conn.id} className="w-full" onClick={() => onReconfigure(conn.instance_id)} disabled={reconfiguring}>
              {reconfiguring
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Reconfigurando...</>
                : <><Radio className="w-4 h-4 mr-2" />Reconfigurar ({conn.instance_id})</>
              }
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
