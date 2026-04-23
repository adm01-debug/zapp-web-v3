import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RetryMetricRow {
  id: string;
  action: string;
  method: string;
  instance_name: string | null;
  idempotency_key: string | null;
  attempt_count: number;
  final_status: 'success' | 'failed' | 'exhausted';
  final_http_status: number | null;
  retry_reasons: Array<{ attempt: number; status?: number; reason: string }>;
  total_duration_ms: number | null;
  created_at: string;
}

export interface RetryAggregates {
  total: number;
  successAfterRetry: number;
  failed: number;
  exhausted: number;
  successRate: number;
  p50Attempts: number;
  p95Attempts: number;
  avgDurationMs: number;
  topActions: Array<{ action: string; count: number }>;
  topReasons: Array<{ reason: string; count: number }>;
}

export interface RetryMetricsResponse {
  rows: RetryMetricRow[];
  aggregates: RetryAggregates;
  previousTotal: number;
  deltaPct: number | null;
  windowHours: number;
}

export interface RetryMetricsFilters {
  hours?: number;
  action?: string | null;
  instance?: string | null;
  status?: 'success' | 'failed' | 'exhausted' | null;
}

export function useRetryMetrics(filters: RetryMetricsFilters = {}) {
  const queryClient = useQueryClient();
  const { hours = 24, action = null, instance = null, status = null } = filters;
  const queryKey = ['evolution-retry-metrics', { hours, action, instance, status }];

  const query = useQuery<RetryMetricsResponse>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('hours', String(hours));
      if (action) params.set('action', action);
      if (instance) params.set('instance', instance);
      if (status) params.set('status', status);

      const { data, error } = await supabase.functions.invoke(`evolution-retry-metrics?${params.toString()}`, {
        method: 'GET',
      });
      if (error) throw error;
      return data as RetryMetricsResponse;
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  // Realtime: invalida ao receber INSERT
  useEffect(() => {
    const channel = supabase
      .channel('evolution_retry_metrics_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'evolution_retry_metrics' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['evolution-retry-metrics'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}
