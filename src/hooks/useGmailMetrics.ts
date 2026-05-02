/**
 * useGmailMetrics.ts — Hook para dashboard de métricas Gmail
 *
 * Consulta gmail_daily_metrics e v_gmail_sla_dashboard para:
 * - Métricas dos últimos 7/30 dias
 * - SLA compliance rate
 * - Average first reply time
 * - Threads por dia (chart data)
 * - Top remetentes
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GmailDayMetric {
  date:                    string;
  threads_received:        number;
  threads_replied:         number;
  avg_first_reply_minutes: number | null;
  sla_met_count:           number;
  sla_breached_count:      number;
}

export interface GmailMetricsSummary {
  period:              string;
  total_received:      number;
  total_replied:       number;
  reply_rate:          number;        // 0-100%
  avg_reply_minutes:   number | null;
  sla_compliance_rate: number;        // 0-100%
  total_sla_met:       number;
  total_sla_breached:  number;
  daily:               GmailDayMetric[];
}

export interface GmailSLADashboard {
  ok_count:       number;
  warning_count:  number;
  breached_count: number;
  met_count:      number;
  total:          number;
}

export function useGmailMetrics(accountId: string | null, days = 7) {
  const [summary, setSummary]     = useState<GmailMetricsSummary | null>(null);
  const [slaDash, setSlaDash]     = useState<GmailSLADashboard | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    if (!accountId) return;

    setIsLoading(true);
    setError(null);
    try {
      const sinceDate = new Date(Date.now() - days * 86400_000).toISOString().split('T')[0];

      // Buscar métricas diárias
      const { data: dailyData, error: dbErr } = await supabase
        .from('gmail_daily_metrics')
        .select('date, threads_received, threads_replied, avg_first_reply_minutes, sla_met_count, sla_breached_count')
        .eq('account_id', accountId)
        .gte('date', sinceDate)
        .order('date', { ascending: true });

      if (dbErr) throw new Error(dbErr.message);

      const daily = (dailyData ?? []) as GmailDayMetric[];

      // Calcular sumário
      const total_received   = daily.reduce((s, d) => s + (d.threads_received ?? 0), 0);
      const total_replied    = daily.reduce((s, d) => s + (d.threads_replied ?? 0), 0);
      const total_sla_met    = daily.reduce((s, d) => s + (d.sla_met_count ?? 0), 0);
      const total_sla_breach = daily.reduce((s, d) => s + (d.sla_breached_count ?? 0), 0);
      const reply_minutes    = daily
        .filter(d => d.avg_first_reply_minutes !== null)
        .map(d => d.avg_first_reply_minutes!);

      const avg_reply = reply_minutes.length > 0
        ? Math.round(reply_minutes.reduce((s, m) => s + m, 0) / reply_minutes.length)
        : null;

      const sla_total = total_sla_met + total_sla_breach;

      setSummary({
        period:              `${days} dias`,
        total_received,
        total_replied,
        reply_rate:          total_received > 0 ? Math.round((total_replied / total_received) * 100) : 0,
        avg_reply_minutes:   avg_reply,
        sla_compliance_rate: sla_total > 0 ? Math.round((total_sla_met / sla_total) * 100) : 100,
        total_sla_met,
        total_sla_breached:  total_sla_breach,
        daily,
      });

      // Buscar SLA dashboard atual (threads abertas)
      const { data: threads } = await supabase
        .from('gmail_threads')
        .select('sla_status')
        .eq('account_id', accountId)
        .not('sla_status', 'is', null);

      const allThreads = threads ?? [];
      setSlaDash({
        ok_count:       allThreads.filter(t => t.sla_status === 'ok').length,
        warning_count:  allThreads.filter(t => t.sla_status === 'warning').length,
        breached_count: allThreads.filter(t => t.sla_status === 'breached').length,
        met_count:      allThreads.filter(t => t.sla_status === 'met').length,
        total:          allThreads.length,
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [accountId, days]);

  useEffect(() => { loadMetrics(); }, [loadMetrics]);

  // Chart data formatado para Recharts
  const chartData = (summary?.daily ?? []).map(d => ({
    date:     new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
    recebidos: d.threads_received,
    respondidos: d.threads_replied,
    sla_ok:   d.sla_met_count,
    sla_falha: d.sla_breached_count,
  }));

  return {
    summary,
    slaDash,
    chartData,
    isLoading,
    error,
    refresh: loadMetrics,
  };
}
