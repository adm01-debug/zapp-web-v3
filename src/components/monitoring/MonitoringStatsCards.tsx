import { Card, CardContent } from '@/components/ui/card';
import { Wifi, MessageSquare, Zap, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConnectionInfo, MessageStats } from './hooks/useEvolutionMonitoring';

interface Props {
  connections: ConnectionInfo[];
  messageStats: MessageStats;
}

export function MonitoringStatsCards({ connections, messageStats }: Props) {
  const activeCount = connections.filter(c => c.status === 'connected').length;
  const avgLatency = connections.filter(c => c.health_response_ms).length > 0
    ? Math.round(connections.reduce((s, c) => s + (c.health_response_ms || 0), 0) / connections.filter(c => c.health_response_ms).length)
    : null;

  const stats = [
    {
      icon: Wifi,
      iconColor: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      label: 'Conexões Ativas',
      value: `${activeCount}/${connections.length}`,
      subtitle: activeCount === connections.length ? 'Todas online' : `${connections.length - activeCount} offline`,
    },
    {
      icon: MessageSquare,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      label: 'Msgs (6h)',
      value: messageStats.total.toString(),
      subtitle: `↓${messageStats.incoming} ↑${messageStats.outgoing}`,
    },
    {
      icon: Zap,
      iconColor: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      label: 'Latência Média',
      value: avgLatency ? `${avgLatency}ms` : '--',
      subtitle: avgLatency && avgLatency < 500 ? 'Excelente' : avgLatency ? 'Monitorar' : 'Sem dados',
    },
    {
      icon: ArrowUpDown,
      iconColor: messageStats.incoming === 0 ? 'text-destructive' : 'text-emerald-500',
      bgColor: messageStats.incoming === 0 ? 'bg-destructive/10' : 'bg-emerald-500/10',
      label: 'Webhook Status',
      value: messageStats.incoming === 0 ? '⚠️ Sem Incoming' : '✅ Recebendo',
      subtitle: messageStats.incoming > 0 ? `${messageStats.incoming} recebidas` : 'Verificar config',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ icon: Icon, iconColor, bgColor, label, value, subtitle }) => (
        <Card key={label} className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={cn('p-2.5 rounded-xl', bgColor)}>
                <Icon className={cn('w-5 h-5', iconColor)} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
                <p className="text-xl font-bold truncate">{value}</p>
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
