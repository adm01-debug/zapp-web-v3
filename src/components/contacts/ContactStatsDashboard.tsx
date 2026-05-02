/**
 * ContactStatsDashboard.tsx
 * KPI dashboard for the contacts module header.
 * Shows: total, new this week/month, duplicates, by status.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, UserPlus, GitMerge, Star, RefreshCw, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ContactStats {
  total_active:   number;
  new_this_week:  number;
  new_this_month: number;
  with_email:     number;
  avg_lead_score: number;
  by_lead_status: Record<string, number>;
  top_tags:       Array<{ tag: string; count: number }>;
  duplicates:     number;
  in_recycle_bin: number;
  instance_name:  string;
}

interface Props {
  instanceName?: string;
  compact?:      boolean;
}

const LEAD_LABEL: Record<string, string> = {
  novo: '🆕', em_contato: '💬', qualificado: '✅',
  proposta: '📋', negociacao: '🤝', fechado: '🏆', perdido: '❌',
};

export const ContactStatsDashboard: React.FC<Props> = ({
  instanceName = 'wpp2', compact = false,
}) => {
  const [stats,   setStats]   = useState<ContactStats | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_contact_stats', { p_instance_name: instanceName });
      if (error) throw error;
      setStats(data as ContactStats);
    } catch (err) {
      console.error('[ContactStatsDashboard]', err);
    } finally {
      setLoading(false);
    }
  }, [instanceName]);

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
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {stats.total_active.toLocaleString('pt-BR')} contatos
        </span>
        {stats.new_this_week > 0 && (
          <span className="flex items-center gap-1 text-green-600">
            <TrendingUp className="h-3.5 w-3.5" />
            +{stats.new_this_week} esta semana
          </span>
        )}
        {stats.duplicates > 0 && (
          <Badge variant="outline" className="text-xs text-amber-700 border-amber-400 gap-1">
            <GitMerge className="h-3 w-3" />{stats.duplicates} dup.
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Visão Geral — Contatos</h3>
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
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total_active.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-muted-foreground">Total ativo</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <UserPlus className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">+{stats.new_this_week}</p>
                <p className="text-xs text-muted-foreground">Esta semana</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                <GitMerge className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{stats.duplicates}</p>
                <p className="text-xs text-muted-foreground">Duplicatas</p>
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
                <p className="text-2xl font-bold">{stats.avg_lead_score ?? '—'}</p>
                <p className="text-xs text-muted-foreground">Score médio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lead status breakdown */}
      {Object.keys(stats.by_lead_status).length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Por Status</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(stats.by_lead_status)
              .sort(([, a], [, b]) => b - a)
              .map(([status, count]) => (
                <div key={status} className="flex items-center gap-1 text-xs rounded-full border px-2 py-0.5 bg-muted/30">
                  <span>{LEAD_LABEL[status] ?? '•'}</span>
                  <span className="font-medium">{count.toLocaleString('pt-BR')}</span>
                  <span className="text-muted-foreground">{status}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Top tags */}
      {stats.top_tags?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Top Tags</p>
          <div className="flex flex-wrap gap-1">
            {stats.top_tags.slice(0, 8).map(({ tag, count }) => (
              <Badge key={tag} variant="secondary" className="text-xs gap-1">
                {tag}
                <span className="text-muted-foreground">({count})</span>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactStatsDashboard;
