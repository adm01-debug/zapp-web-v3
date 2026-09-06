import { queryKeys } from '@/services/api/queryKeys';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Hook: Period Filter. */
export type PeriodFilter = 'today' | 'week' | 'month' | 'all';

interface SLAMetric {
  total: number;
  onTime: number;
  breached: number;
  rate: number;
}

interface AgentSLAMetric {
  agentId: string;
  agentName: string;
  avatarUrl?: string;
  firstResponse: SLAMetric;
  resolution: SLAMetric;
  overallRate: number;
}

/** Hook: SLADashboard Data. */
export interface SLADashboardData {
  overall: {
    firstResponse: SLAMetric;
    resolution: SLAMetric;
    totalConversations: number;
    overallRate: number;
  };
  byAgent: AgentSLAMetric[];
}

// Shape returned by rpc_sla_dashboard (JSONB decoded by postgrest)
interface RPCResult {
  overall: SLADashboardData['overall'];
  byAgent: AgentSLAMetric[];
  startAt: string;
  period: string;
  computedAt: string;
}

async function fetchSLAMetrics(period: PeriodFilter): Promise<SLADashboardData> {
  // Dates are computed server-side via NOW() (UTC clock) — not browser new Date().
  // This eliminates timezone drift and makes the filter reproducible regardless
  // of the client's locale/timezone. (Dim-11 fix: 2026-09-06)
  const { data, error } = await supabase.rpc('rpc_sla_dashboard', { p_period: period });

  if (error) throw error;

  const result = data as unknown as RPCResult;

  return {
    overall: result.overall,
    byAgent: result.byAgent ?? [],
  };
}

/** Hook: use SLAMetrics. */
export const useSLAMetrics = (period: PeriodFilter = 'today') => {
  const { data = null, isLoading: loading } = useQuery({
    queryKey: queryKeys.sla.metrics(period),
    queryFn: () => fetchSLAMetrics(period),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  return { data, loading };
};
