import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { evoApi } from './proxy';
import type {
  DashboardResponse, ActiveAlert, AlertChannel,
  HealthHistoryRow, DrRunbookStep, TestSuiteResult,
} from './types';

const KEY = ['evo-api-health'] as const;

export function useEvoApiDashboard(refetchMs = 30_000) {
  return useQuery({
    queryKey: [...KEY, 'dashboard'],
    queryFn: () => evoApi.rpc<DashboardResponse>('rpc_pipeline_dashboard'),
    refetchInterval: refetchMs,
    staleTime: 10_000,
  });
}

export function useActiveAlerts(refetchMs = 15_000) {
  return useQuery({
    queryKey: [...KEY, 'alerts-active'],
    queryFn: () => evoApi.select<ActiveAlert>({
      table: 'v_alerts_active',
      select: '*',
      order: { column: 'created_at', ascending: false },
      limit: 100,
    }),
    refetchInterval: refetchMs,
  });
}

export function useAcknowledgeAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (alertId: number) => {
      await evoApi.update({
        table: 'alert_log',
        data: { acknowledged: true, acknowledged_at: new Date().toISOString() },
        match: { id: alertId },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useHealthHistory() {
  return useQuery({
    queryKey: [...KEY, 'history'],
    queryFn: () => evoApi.select<HealthHistoryRow>({
      table: 'v_health_history',
      select: '*',
      limit: 288,
    }),
    refetchInterval: 60_000,
  });
}

export function useAlertChannels() {
  return useQuery({
    queryKey: [...KEY, 'channels'],
    queryFn: () => evoApi.select<AlertChannel>({
      table: 'v_alert_channels_health',
      select: '*',
      limit: 50,
    }),
  });
}

export function useTestAlertChannel() {
  return useMutation({
    mutationFn: (channelId: number) =>
      evoApi.rpc('fn_test_alert_channel', { p_channel_id: channelId }),
  });
}

export function useDrRunbook() {
  return useQuery({
    queryKey: [...KEY, 'dr-runbook'],
    queryFn: () => evoApi.select<DrRunbookStep>({
      table: 'v_dr_runbook',
      select: '*',
      order: { column: 'step_number', ascending: true },
      limit: 50,
    }),
  });
}

export function useDrHealth() {
  return useQuery({
    queryKey: [...KEY, 'dr-health'],
    queryFn: () => evoApi.rpc<Record<string, unknown>>('rpc_dr_health_check'),
    refetchInterval: 60_000,
  });
}

export function useRunTestSuite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => evoApi.rpc<TestSuiteResult>('rpc_run_full_test_suite'),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
