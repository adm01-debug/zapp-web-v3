import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BarChart3 } from 'lucide-react';
import type { MessageStats } from './hooks/useEvolutionMonitoring';

interface Props {
  messageStats: MessageStats;
}

export function MonitoringMessageChart({ messageStats }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Volume de Mensagens (6h)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {messageStats.hourlyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={messageStats.hourlyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIncoming" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorOutgoing" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142 71% 45%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(142 71% 45%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="hour" className="text-xs" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
              <Area type="monotone" dataKey="incoming" name="Recebidas" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorIncoming)" strokeWidth={2} />
              <Area type="monotone" dataKey="outgoing" name="Enviadas" stroke="hsl(142 71% 45%)" fillOpacity={1} fill="url(#colorOutgoing)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
            Sem dados de mensagens nas últimas 6 horas
          </div>
        )}
      </CardContent>
    </Card>
  );
}
