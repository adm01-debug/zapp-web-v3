/**
 * useSystemHealth.ts — Monitoramento de saúde do sistema ZAPP WEB
 *
 * Chama rpc_system_health_check para obter um snapshot completo:
 * - Inbox (conversas abertas, sem resposta)
 * - Mensagens (total, fila)
 * - Contatos (total, LGPD pendente)
 * - Email (contas Gmail, threads SLA)
 * - Webhooks (DLQ, alertas)
 * - Performance (tempo de resposta DB)
 *
 * Auto-atualiza a cada 2 minutos.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type HealthScore = 'healthy' | 'warning' | 'degraded';

export interface SystemHealthData {
  timestamp: string;
  health_score: HealthScore;
  inbox: {
    total_conversations: number;
    open_conversations: number;
    unread_total: number;
    awaiting_response: number;
  };
  messages: {
    total: number;
    last_24h: number;
    queue_size: number;
  };
  contacts: {
    total: number;
    recent_7d: number;
    lgpd_pending: number;
  };
  email: {
    gmail_accounts: number;
    unread_threads: number;
    sla_breached: number;
  };
  webhooks: {
    events_1h: number;
    dlq_pending: number;
    alerts_unread: number;
  };
  performance: {
    db_response_ms: number;
    mat_views_populated: number;
    active_cron_jobs: number;
  };
}

const REFRESH_INTERVAL_MS = 2 * 60 * 1000; // 2 minutos

export function useSystemHealth(autoRefresh = true) {
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch = useCallback(async () => {
    try {
      const { data, error: rpcErr } = await (supabase as any).rpc('rpc_system_health_check');
      if (rpcErr) throw new Error(rpcErr.message);
      setHealth((data as unknown) as SystemHealthData);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();

    if (autoRefresh) {
      intervalRef.current = setInterval(fetch, REFRESH_INTERVAL_MS);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetch, autoRefresh]);

  // Métricas derivadas
  const criticalAlerts = (health?.webhooks.alerts_unread ?? 0) > 0;
  const hasDlqPending  = (health?.webhooks.dlq_pending ?? 0) > 0;
  const hasEmailSLABreach = (health?.email.sla_breached ?? 0) > 0;
  const dbResponseOk = (health?.performance.db_response_ms ?? 9999) < 3000;

  return {
    health,
    isLoading,
    error,
    lastUpdated,
    criticalAlerts,
    hasDlqPending,
    hasEmailSLABreach,
    dbResponseOk,
    refresh: fetch,
  };
}
