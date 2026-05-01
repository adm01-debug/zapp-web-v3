/**
 * Carrega o histórico completo de envio de uma mensagem para o painel
 * de debug: linha do tempo de tentativas (retry_metrics.retry_reasons),
 * métricas agregadas e entradas relacionadas em audit_logs.
 *
 * Usado pelo `MessageSendHistorySheet` quando o agente abre o painel
 * pelo menu de contexto.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RetryAttempt {
  attempt: number;
  status?: number;
  reason: string;
  /** ISO timestamp opcional — só populado se a EF gravar */
  at?: string;
  /** Latência da tentativa em ms, se disponível */
  duration_ms?: number;
}

export interface MessageSendHistory {
  metric: {
    id: string;
    action: string;
    method: string;
    finalStatus: 'success' | 'failed' | 'exhausted' | string;
    finalHttpStatus: number | null;
    attemptCount: number;
    totalDurationMs: number | null;
    instanceName: string | null;
    idempotencyKey: string | null;
    retryReasons: RetryAttempt[];
    createdAt: string;
    rawJson: unknown;
  } | null;
  auditEntries: Array<{
    id: string;
    action: string;
    createdAt: string;
    details: unknown;
  }>;
}

const STALE_MS = 15_000;

export function useMessageSendHistory(messageId: string | undefined, enabled: boolean) {
  return useQuery<MessageSendHistory>({
    queryKey: ['message-send-history', messageId],
    enabled: Boolean(messageId) && enabled,
    staleTime: STALE_MS,
    queryFn: async () => {
      if (!messageId) return { metric: null, auditEntries: [] };

      const idempotencyKey = `msg:${messageId}`;
      const [metricRes, auditRes] = await Promise.all([
        supabase
          .from('evolution_retry_metrics')
          .select('*')
          .eq('idempotency_key', idempotencyKey)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('audit_logs')
          .select('id, action, created_at, details')
          .eq('entity_type', 'message')
          .eq('entity_id', messageId)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      const row = metricRes.data;
      const auditEntries = (auditRes.data ?? []).map((e) => ({
        id: e.id,
        action: e.action,
        createdAt: e.created_at,
        details: e.details,
      }));

      if (!row) return { metric: null, auditEntries };

      const reasons = Array.isArray(row.retry_reasons)
        ? (row.retry_reasons as unknown as RetryAttempt[])
        : [];

      return {
        metric: {
          id: row.id,
          action: row.action,
          method: row.method,
          finalStatus: row.final_status as MessageSendHistory['metric']['finalStatus'],
          finalHttpStatus: row.final_http_status,
          attemptCount: row.attempt_count,
          totalDurationMs: row.total_duration_ms,
          instanceName: row.instance_name,
          idempotencyKey: row.idempotency_key,
          retryReasons: reasons,
          createdAt: row.created_at,
          rawJson: row,
        },
        auditEntries,
      };
    },
  });
}
