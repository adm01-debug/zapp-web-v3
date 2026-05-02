/**
 * ContactStatsDashboard.tsx — v2.0
 * Real-time contact KPI dashboard using get_contact_stats() + get_lgpd_compliance_stats() RPCs.
 * Shows: total contacts, lead status distribution, LGPD compliance rate, duplicates.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users, TrendingUp, Shield, GitMerge,
  RefreshCw, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ContactStats {
  total_active:         number;
  new_today:            number;
  new_this_week:        number;
  with_email:           number;
  with_phone:           number;
  by_lead_status:       Record<string, number>;
  avg_lead_score:       number;
  blacklisted:          number;
}

interface LGPDStats {
  total_active:         number;
  with_consent:         number;
  opted_out:            number;
  deletion_requested:   number;
  consent_rate_pct:     string;
}

const LEAD_STATUS_EMOJIS: Record<string, string> = {
  novo: '🆕', em_contato: '💬', qualificado: '✅',
  proposta: '📋', negociacao: '🤝', fechado: '🏆', perdido: '❌',
};

const LEAD_STATUS_COLORS: Record<string, string> = {
  novo: 'bg-blue-100 text-blue-700', em_contato: 'bg-cyan-100 text-cyan-700',
  qualificado: 'bg-green-100 text-green-700', proposta: 'bg-purple-100 text-purple-700',
  negociacao: 'bg-amber-100 text-amber-700', fechado: 'bg-emerald-100 text-emerald-700',
  perdido: 'bg-red-100 text-red-700',
};

interface Props { instanceName?: string; compact?: boolean; }

export const ContactStatsDashboard: React.FC<Props> = ({
  instanceName = 'wpp2', compact = false,
}) => {
  const [stats,    setStats]    = useState<ContactStats | null>(null);
  const [lgpd,     setLgpd]     = useState<LGPDStats | null>(null);
  const [dupes,    setDupes]    = useState(0);
  const [loading,  setLoading]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, lgpdRes, dupesRes] = await Promise.all([
        supabase.rpc('get_contact_stats', { p_instance_name: instanceName }),
        supabase.rpc('get_lgpd_compliance_stats', { p_instance_name: instanceName }),
        supabase.rpc('get_duplicate_report', { p_instance_name: instanceName }),
      ]);

      if (statsRes.data) setStats(statsRes.data as ContactStats);
      if (lgpdRes.data)  setLgpd(lgpdRes.data as LGPDStats);
      if (dupesRes.data) setDupes((dupesRes.data as Record<string, number>).total_duplicate_groups ?? 0);
    } catch (err) {
      console.error('[ContactStatsDashboard]', err);
    } finally { setLoading(false); }
  }, [instanceName]);

  useEffect(() => { load(); }, [load]);

  if (loading && !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-muted rounded-lg" />)}
      </div>
    );
  }

  if (!stats) return null;

  const consentRate = parseFloat(lgpd?.consent_rate_pct ?? '0');

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {stats.total_active.toLocaleString('pt-BR')} contatos
        </span>
        <span className="text-green-600">+{stats.new_today} hoje</span>
        {dupes > 0 && <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">{dupes} duplicatas</Badge>}
        <span className={`flex items-center gap-1 text-xs ${consentRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
          <Shield className="h-3.5 w-3.5" />LGPD {consentRate}%
        </span>
      </div>
    );
  }

  const totalByStatus = Object.values(stats.by_lead_status ?? {}).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Dashboard Contatos</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="h-7 w-7 p-0">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{stats.total_active.toLocaleString('pt-BR')}</p>
            <p className="text-xs text-muted-foreground">Ativos</p>
            {stats.new_today > 0 && <p className="text-xs text-green-600 mt-0.5">+{stats.new_today} hoje</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{Math.round(stats.avg_lead_score ?? 0)}</p>
            <p className="text-xs text-muted-foreground">Score médio</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className={`text-2xl font-bold ${consentRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
              {consentRate}%
            </p>
            <p className="text-xs text-muted-foreground">LGPD</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className={`text-2xl font-bold ${dupes > 0 ? 'text-amber-600' : 'text-green-600'}`}>{dupes}</p>
            <p className="text-xs text-muted-foreground">Duplicatas</p>
            {dupes === 0 && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mx-auto mt-0.5" />}
          </CardContent>
        </Card>
      </div>

      {/* Lead status breakdown */}
      {totalByStatus > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Por Status de Lead</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(stats.by_lead_status ?? {})
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([status, count]) => (
                <div key={status} className={`flex items-center gap-1 text-xs rounded-full px-2.5 py-0.5 ${LEAD_STATUS_COLORS[status] ?? 'bg-gray-100'}`}>
                  <span>{LEAD_STATUS_EMOJIS[status] ?? ''}</span>
                  <span className="font-medium">{count as number}</span>
                  <span className="opacity-70">{status}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* LGPD alert */}
      {consentRate < 50 && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg p-2 border border-amber-200">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>
            Apenas {consentRate}% dos contatos têm consentimento LGPD.
            {lgpd?.with_consent != null ? ` (${lgpd.with_consent} de ${lgpd.total_active})` : ''}
          </span>
        </div>
      )}
    </div>
  );
};

export default ContactStatsDashboard;
