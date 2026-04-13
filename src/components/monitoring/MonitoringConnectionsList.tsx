import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, CheckCircle2, XCircle, AlertTriangle, Clock, Settings2, PlayCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ConnectionInfo, WebhookTestResult } from './hooks/useEvolutionMonitoring';

interface Props {
  connections: ConnectionInfo[];
  webhookTest: WebhookTestResult;
  onCheckWebhook: (instanceId: string) => void;
  onTestWebhook: (instanceId: string) => void;
}

const statusIcon = (status: string | null) => {
  switch (status) {
    case 'connected': case 'healthy': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case 'disconnected': case 'error': return <XCircle className="w-4 h-4 text-destructive" />;
    case 'degraded': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    default: return <Clock className="w-4 h-4 text-muted-foreground" />;
  }
};

export function MonitoringConnectionsList({ connections, webhookTest, onCheckWebhook, onTestWebhook }: Props) {
  return (
    <div className="space-y-3">
      {connections.map(conn => (
        <Card key={conn.id} className="hover:shadow-md transition-shadow">
          <CardContent className="py-4 px-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                  conn.status === 'connected' ? 'bg-emerald-500/10' : 'bg-destructive/10'
                )}>
                  {conn.status === 'connected'
                    ? <Wifi className="w-5 h-5 text-emerald-500" />
                    : <WifiOff className="w-5 h-5 text-destructive" />
                  }
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{conn.instance_id}</span>
                    <Badge variant={conn.status === 'connected' ? 'default' : 'destructive'} className="text-xs">
                      {conn.status}
                    </Badge>
                    {conn.health_status && (
                      <Badge variant="outline" className="text-xs gap-1">
                        {statusIcon(conn.health_status)}
                        {conn.health_status}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    {conn.phone_number && <span>📱 {conn.phone_number}</span>}
                    {conn.health_response_ms != null && <span>⚡ {conn.health_response_ms}ms</span>}
                    {conn.last_health_check && (
                      <span>🕐 {formatDistanceToNow(new Date(conn.last_health_check), { addSuffix: true, locale: ptBR })}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => onCheckWebhook(conn.instance_id)}>
                  <Settings2 className="w-3.5 h-3.5 mr-1" />Ver Webhook
                </Button>
                <Button size="sm" variant="outline" onClick={() => onTestWebhook(conn.instance_id)} disabled={webhookTest.status === 'testing'}>
                  {webhookTest.status === 'testing'
                    ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Testando</>
                    : <><PlayCircle className="w-3.5 h-3.5 mr-1" />Testar</>
                  }
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
