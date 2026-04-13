import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { HealthLog } from './hooks/useEvolutionMonitoring';

interface Props {
  healthLogs: HealthLog[];
}

const statusIcon = (status: string) => {
  switch (status) {
    case 'connected': case 'healthy': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case 'disconnected': case 'error': return <XCircle className="w-4 h-4 text-destructive" />;
    case 'degraded': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    default: return <Clock className="w-4 h-4 text-muted-foreground" />;
  }
};

const statusColor = (status: string) => {
  switch (status) {
    case 'connected': case 'healthy': return 'text-emerald-500';
    case 'disconnected': case 'error': return 'text-destructive';
    case 'degraded': return 'text-amber-500';
    default: return 'text-muted-foreground';
  }
};

export function MonitoringHealthLogs({ healthLogs }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Histórico de Health Checks</CardTitle>
        <CardDescription>Últimas 100 verificações</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-1.5">
            {healthLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum health check registrado.</p>
            ) : healthLogs.map(log => (
              <div key={log.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  {statusIcon(log.status)}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{log.instance_id}</span>
                      <Badge variant="outline" className={cn('text-[10px]', statusColor(log.status))}>
                        {log.status}
                      </Badge>
                    </div>
                    {log.error_message && (
                      <p className="text-[11px] text-destructive mt-0.5 truncate max-w-sm">{log.error_message}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                  {log.response_time_ms != null && <span>⚡ {log.response_time_ms}ms</span>}
                  <span>{format(new Date(log.checked_at), 'dd/MM HH:mm:ss', { locale: ptBR })}</span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
