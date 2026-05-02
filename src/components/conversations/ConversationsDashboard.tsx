/**
 * ConversationsDashboard.tsx
 * Real-time KPI dashboard for the conversations/inbox module.
 * Uses get_conversation_stats() RPC.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MessageCircle, Clock, CheckCircle2, Star,
  RefreshCw, TrendingUp, AlertTriangle, Bot,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ConvStats {
  total_open:            number;
  total_closed_period:   number;
  avg_first_response_s:  number | null;
  avg_resolution_s:      number | null;
  avg_csat:              number | null;
  by_status:             Record<string, number>;
  by_priority:           Record<string, number>;
  new_today:             number;
  unread_total:          number;
  bot_active:            number;
  period_days:           number;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  high:   'bg-orange-100 text-orange-700',
  normal: 'bg-blue-100 text-blue-700',
  low:    'bg-gray-100 text-gray-600',
};

export const ConversationsDashboard: React.FC<{
  instanceName?: string;
  days?:         number;
  compact?:      boolean;
}> = ({ instanceName = 'wpp2', days = 7, compact = false }) => {
  const [stats,   setStats]   = useState<ConvStats | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_conversation_stats', {
        p_instance_name: instanceName,
        p_days: days,
      });
      if (error) throw error;
      setStats(data as ConvStats);
    } catch (err) {
      console.error('[ConversationsDashboard]', err);
    } finally { setLoading(false); }
  }, [instanceName, days]);

  useEffect(() => { load(); }, [load]);

  if (!stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <MessageCircle className="h-3.5 w-3.5" />
          {stats.total_open.toLocaleString('pt-BR')} abertas
        </span>
        {stats.unread_total > 0 && (
          <Badge variant="destructive" className="text-xs">{stats.unread_total} não lidas</Badge>
        )}
        {stats.new_today > 0 && (
          <span className="flex items-center gap-1 text-green-600">
            <TrendingUp className="h-3.5 w-3.5" />+{stats.new_today} hoje
          </span>
        )}
        {stats.bot_active > 0 && (
          <span className="flex items-center gap-1 text-blue-600">
            <Bot className="h-3.5 w-3.5" />{stats.bot_active} bot ativo
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Dashboard — Conversas (últimos {days} dias)</h3>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="h-7 w-7 p-0">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <MessageCircle className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total_open.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-muted-foreground">Abertas</p>
              </div>
            </div>
            {stats.unread_total > 0 && (
              <Badge variant="destructive" className="text-xs mt-1">{stats.unread_total} não lidas</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.total_closed_period.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-muted-foreground">Encerradas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatDuration(stats.avg_first_response_s)}</p>
                <p className="text-xs text-muted-foreground">TMP Resp.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                <Star className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.avg_csat?.toFixed(1) ?? '—'}</p>
                <p className="text-xs text-muted-foreground">CSAT</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-lg border p-2 text-center">
          <p className="font-bold text-lg">{stats.new_today}</p>
          <p className="text-muted-foreground">Novas hoje</p>
        </div>
        <div className="rounded-lg border p-2 text-center">
          <p className="font-bold text-lg">{formatDuration(stats.avg_resolution_s)}</p>
          <p className="text-muted-foreground">TMP Resolução</p>
        </div>
        <div className="rounded-lg border p-2 text-center">
          <p className="font-bold text-lg text-blue-600">{stats.bot_active}</p>
          <p className="text-muted-foreground">Bot ativo</p>
        </div>
      </div>

      {/* Priority breakdown */}
      {Object.keys(stats.by_priority ?? {}).length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Por Prioridade (abertas)</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(stats.by_priority ?? {})
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([priority, count]) => (
                <div key={priority} className={`flex items-center gap-1 text-xs rounded-full border px-2.5 py-0.5 ${PRIORITY_COLORS[priority] ?? 'bg-gray-100'}`}>
                  {priority === 'urgent' && <AlertTriangle className="h-3 w-3" />}
                  <span className="font-medium">{count as number}</span>
                  <span>{priority}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationsDashboard;
