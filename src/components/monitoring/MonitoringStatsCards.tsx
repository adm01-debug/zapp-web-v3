import { Card, CardContent } from '@/components/ui/card';
import { Wifi, MessageSquare, Zap, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import type { ConnectionInfo, MessageStats } from './hooks/useEvolutionMonitoring';

interface Props {
  connections: ConnectionInfo[];
  messageStats: MessageStats;
}

function PulseDot({ active }: { active: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {active && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      )}
      <span className={cn(
        'relative inline-flex rounded-full h-2.5 w-2.5',
        active ? 'bg-emerald-500' : 'bg-destructive'
      )} />
    </span>
  );
}

export function MonitoringStatsCards({ connections, messageStats }: Props) {
  const activeCount = connections.filter(c => c.status === 'connected').length;
  const connWithLatency = connections.filter(c => c.health_response_ms);
  const avgLatency = connWithLatency.length > 0
    ? Math.round(connWithLatency.reduce((s, c) => s + (c.health_response_ms || 0), 0) / connWithLatency.length)
    : null;

  const allOnline = activeCount === connections.length && connections.length > 0;
  const hasIncoming = messageStats.incoming > 0;

  const stats = [
    {
      icon: Wifi,
      iconColor: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      label: 'Conexões Ativas',
      value: `${activeCount}/${connections.length}`,
      subtitle: allOnline ? 'Todas online' : `${connections.length - activeCount} offline`,
      pulse: allOnline,
    },
    {
      icon: MessageSquare,
      iconColor: 'text-primary',
      bgColor: 'bg-primary/10',
      label: 'Msgs (12h)',
      value: messageStats.total.toLocaleString('pt-BR'),
      subtitle: `↓${messageStats.incoming} ↑${messageStats.outgoing}`,
      pulse: false,
    },
    {
      icon: Zap,
      iconColor: avgLatency && avgLatency < 500 ? 'text-emerald-500' : 'text-amber-500',
      bgColor: avgLatency && avgLatency < 500 ? 'bg-emerald-500/10' : 'bg-amber-500/10',
      label: 'Latência Média',
      value: avgLatency ? `${avgLatency}ms` : '--',
      subtitle: avgLatency && avgLatency < 300 ? 'Excelente' : avgLatency && avgLatency < 800 ? 'Boa' : avgLatency ? 'Lenta' : 'Sem dados',
      pulse: false,
    },
    {
      icon: ArrowUpDown,
      iconColor: hasIncoming ? 'text-emerald-500' : 'text-destructive',
      bgColor: hasIncoming ? 'bg-emerald-500/10' : 'bg-destructive/10',
      label: 'Webhook Status',
      value: hasIncoming ? 'Operacional' : 'Sem Incoming',
      subtitle: hasIncoming ? `${messageStats.incoming} recebidas` : 'Verificar config',
      pulse: hasIncoming,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ icon: Icon, iconColor, bgColor, label, value, subtitle, pulse }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06, duration: 0.3 }}
        >
          <Card className="hover:shadow-md transition-shadow border-border/60">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn('p-2.5 rounded-xl', bgColor)}>
                    <Icon className={cn('w-5 h-5', iconColor)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
                    <p className="text-xl font-bold truncate mt-0.5">{value}</p>
                    <p className="text-xs text-muted-foreground">{subtitle}</p>
                  </div>
                </div>
                {pulse && <PulseDot active />}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
