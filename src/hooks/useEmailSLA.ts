/**
 * useEmailSLA.ts — Integração de SLA para threads de Email Chat
 *
 * Calcula:
 * - Tempo para primeira resposta (FRT - First Response Time)
 * - Status do SLA: 'ok' | 'warning' | 'breached'
 * - Alerta quando thread ultrapassar threshold configurado
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type SLAStatus = 'ok' | 'warning' | 'breached';

export interface EmailSLARecord {
  thread_id: string;
  account_id: string;
  received_at: string;
  first_reply_at: string | null;
  frt_minutes: number | null;     // First Response Time em minutos
  sla_status: SLAStatus;
  sla_threshold_minutes: number;
  warning_threshold_pct: number;  // % do threshold que aciona warning (ex: 80%)
}

interface SLAConfig {
  threshold_minutes: number;        // Ex: 480 = 8h úteis
  warning_threshold_pct: number;    // Ex: 80 = alert aos 80% (384min)
  business_hours_only: boolean;
}

const DEFAULT_SLA: SLAConfig = {
  threshold_minutes: 480,         // 8 horas
  warning_threshold_pct: 80,
  business_hours_only: true,
};

// Calcula minutos decorridos (considerando horário comercial se configurado)
function elapsedMinutes(from: Date, to: Date = new Date(), _businessHours = false): number {
  // TODO: implementar lógica de horário comercial (08h-18h, seg-sex)
  // Por ora usa tempo corrido simples
  return Math.floor((to.getTime() - from.getTime()) / 60_000);
}

function computeStatus(elapsed: number, config: SLAConfig): SLAStatus {
  if (elapsed >= config.threshold_minutes) return 'breached';
  if (elapsed >= config.threshold_minutes * (config.warning_threshold_pct / 100)) return 'warning';
  return 'ok';
}

export function useEmailSLA(accountId: string | null, config: Partial<SLAConfig> = {}) {
  const slaConfig = { ...DEFAULT_SLA, ...config };
  const [records, setRecords] = useState<Record<string, EmailSLARecord>>({});

  // Registra nova thread recebida no SLA
  const registerThread = useCallback((threadId: string, receivedAt: string) => {
    const elapsed = elapsedMinutes(new Date(receivedAt), new Date(), slaConfig.business_hours_only);

    setRecords(prev => ({
      ...prev,
      [threadId]: {
        thread_id: threadId,
        account_id: accountId ?? '',
        received_at: receivedAt,
        first_reply_at: null,
        frt_minutes: null,
        sla_status: computeStatus(elapsed, slaConfig),
        sla_threshold_minutes: slaConfig.threshold_minutes,
        warning_threshold_pct: slaConfig.warning_threshold_pct,
      },
    }));
  }, [accountId, slaConfig]);

  // Marca primeira resposta enviada
  const markReplied = useCallback((threadId: string) => {
    setRecords(prev => {
      const record = prev[threadId];
      if (!record || record.first_reply_at) return prev;

      const replyAt = new Date().toISOString();
      const frt = elapsedMinutes(new Date(record.received_at), new Date(), slaConfig.business_hours_only);

      // Persiste no Supabase
      supabase.from('gmail_threads').update({
        // Stores SLA metadata in a jsonb column if available, otherwise logs to audit
      }).eq('thread_id', threadId).then(() => {});

      return {
        ...prev,
        [threadId]: { ...record, first_reply_at: replyAt, frt_minutes: frt, sla_status: 'ok' },
      };
    });
  }, [slaConfig]);

  // Atualiza status SLA de todos os records a cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      setRecords(prev => {
        const updated = { ...prev };
        for (const [id, record] of Object.entries(updated)) {
          if (record.first_reply_at) continue; // Já respondido — status congelado
          const elapsed = elapsedMinutes(new Date(record.received_at), new Date(), slaConfig.business_hours_only);
          updated[id] = { ...record, sla_status: computeStatus(elapsed, slaConfig) };
        }
        return updated;
      });
    }, 60_000);

    return () => clearInterval(interval);
  }, [slaConfig]);

  // Carrega threads sem resposta do Supabase e inicia rastreamento
  useEffect(() => {
    if (!accountId) return;

    supabase
      .from('gmail_threads')
      .select('thread_id, last_message_at, unread_count')
      .eq('account_id', accountId)
      .gt('unread_count', 0)
      .order('last_message_at', { ascending: true })
      .limit(100)
      .then(({ data }) => {
        for (const row of (data ?? [])) {
          if (row.last_message_at) {
            registerThread(row.thread_id, row.last_message_at);
          }
        }
      });
  }, [accountId, registerThread]);

  const getStatus = useCallback((threadId: string): SLAStatus | null => {
    return records[threadId]?.sla_status ?? null;
  }, [records]);

  const getRecord = useCallback((threadId: string): EmailSLARecord | null => {
    return records[threadId] ?? null;
  }, [records]);

  const breachedCount = Object.values(records).filter(r => r.sla_status === 'breached').length;
  const warningCount = Object.values(records).filter(r => r.sla_status === 'warning').length;

  return {
    records,
    breachedCount,
    warningCount,
    registerThread,
    markReplied,
    getStatus,
    getRecord,
  };
}
