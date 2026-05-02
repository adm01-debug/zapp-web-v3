/**
 * useEmailSLA.ts — Integração de SLA para threads de Email Chat
 *
 * Calcula:
 * - Tempo para primeira resposta (FRT - First Response Time)
 * - Status do SLA: 'ok' | 'warning' | 'breached'
 * - Alerta quando thread ultrapassar threshold configurado
 * - Suporte a horário comercial (08h-18h, seg-sex, exceto feriados)
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type SLAStatus = 'ok' | 'warning' | 'breached';

export interface EmailSLARecord {
  thread_id: string;
  account_id: string;
  received_at: string;
  first_reply_at: string | null;
  frt_minutes: number | null;
  sla_status: SLAStatus;
  sla_threshold_minutes: number;
  warning_threshold_pct: number;
}

interface SLAConfig {
  threshold_minutes: number;
  warning_threshold_pct: number;
  business_hours_only: boolean;
  business_start_hour?: number;  // Default: 8
  business_end_hour?: number;    // Default: 18
}

const DEFAULT_SLA: SLAConfig = {
  threshold_minutes:    480,  // 8 horas
  warning_threshold_pct: 80,
  business_hours_only:  true,
  business_start_hour:  8,
  business_end_hour:    18,
};

// ── Cálculo de tempo em horário comercial ──────────────────────────────

/**
 * Calcula minutos decorridos em horário comercial (08h-18h, seg-sex).
 * Se business_hours = false, retorna tempo real.
 */
function elapsedBusinessMinutes(
  from: Date,
  to: Date = new Date(),
  config?: SLAConfig
): number {
  if (!config?.business_hours_only) {
    return Math.floor((to.getTime() - from.getTime()) / 60_000);
  }

  const start  = config.business_start_hour ?? 8;
  const end    = config.business_end_hour ?? 18;
  const minsPerDay = (end - start) * 60;

  let current = new Date(from);
  let elapsed = 0;

  while (current < to) {
    const dayOfWeek = current.getDay(); // 0=Sun, 6=Sat
    const isWorkday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const hour = current.getHours();
    const min  = current.getMinutes();

    if (isWorkday && hour >= start && hour < end) {
      // Estamos em horário comercial — avança 1 minuto
      const nextMinute = new Date(current.getTime() + 60_000);
      const effectiveTo = nextMinute < to ? nextMinute : to;
      elapsed += Math.floor((effectiveTo.getTime() - current.getTime()) / 60_000);
    }

    // Avança para o próximo minuto ou próximo dia útil
    const nextCheck = new Date(current);
    if (!isWorkday || hour < start) {
      // Avança para próximo dia útil às 08h
      const targetDay = isWorkday ? current : (() => {
        const d = new Date(current);
        while (d.getDay() === 0 || d.getDay() === 6) {
          d.setDate(d.getDate() + 1);
        }
        return d;
      })();
      nextCheck.setFullYear(targetDay.getFullYear(), targetDay.getMonth(), targetDay.getDate());
      nextCheck.setHours(start, 0, 0, 0);
      if (nextCheck <= current) nextCheck.setDate(nextCheck.getDate() + 1);
    } else if (hour >= end) {
      // Avança para próximo dia útil
      nextCheck.setDate(nextCheck.getDate() + 1);
      nextCheck.setHours(start, 0, 0, 0);
      // Pula fim de semana
      while (nextCheck.getDay() === 0 || nextCheck.getDay() === 6) {
        nextCheck.setDate(nextCheck.getDate() + 1);
      }
    } else {
      // Em horário comercial — avança 1 hora para não iterar minuto a minuto
      // (otimização: pula em blocos de 1h para threads antigas)
      const remaining = (end - nextCheck.getHours()) * 60 - nextCheck.getMinutes();
      const skipMins = Math.min(remaining, 60);
      nextCheck.setTime(current.getTime() + skipMins * 60_000);
    }

    if (nextCheck <= current) break; // Segurança contra loop infinito
    current = nextCheck;
    if (elapsed > minsPerDay * 30) break; // Cap: 30 dias úteis
  }

  return elapsed;
}

function computeStatus(elapsed: number, config: SLAConfig): SLAStatus {
  if (elapsed >= config.threshold_minutes) return 'breached';
  if (elapsed >= config.threshold_minutes * (config.warning_threshold_pct / 100)) return 'warning';
  return 'ok';
}

// ── Hook ───────────────────────────────────────────────────────────────

export function useEmailSLA(accountId: string | null, config: Partial<SLAConfig> = {}) {
  const slaConfig: SLAConfig = { ...DEFAULT_SLA, ...config };
  const [records, setRecords] = useState<Record<string, EmailSLARecord>>({});

  const registerThread = useCallback((threadId: string, receivedAt: string) => {
    const elapsed = elapsedBusinessMinutes(new Date(receivedAt), new Date(), slaConfig);

    setRecords(prev => {
      if (prev[threadId]) return prev; // Já registrada
      return {
        ...prev,
        [threadId]: {
          thread_id:              threadId,
          account_id:             accountId ?? '',
          received_at:            receivedAt,
          first_reply_at:         null,
          frt_minutes:            null,
          sla_status:             computeStatus(elapsed, slaConfig),
          sla_threshold_minutes:  slaConfig.threshold_minutes,
          warning_threshold_pct:  slaConfig.warning_threshold_pct,
        },
      };
    });
  }, [accountId, slaConfig]);

  const markReplied = useCallback((threadId: string) => {
    setRecords(prev => {
      const record = prev[threadId];
      if (!record || record.first_reply_at) return prev;

      const replyAt = new Date().toISOString();
      const frt = elapsedBusinessMinutes(
        new Date(record.received_at),
        new Date(),
        slaConfig
      );

      // Atualiza no Supabase em background
      (supabase as any).from('gmail_threads' as any).update({
        first_reply_at: replyAt,
        frt_minutes:    frt,
        sla_status:     'ok',
      }).eq('thread_id', threadId).then(() => {});

      return {
        ...prev,
        [threadId]: {
          ...record,
          first_reply_at: replyAt,
          frt_minutes:    frt,
          sla_status:     'ok',
        },
      };
    });
  }, [slaConfig]);

  // Update automático a cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      setRecords(prev => {
        const updated = { ...prev };
        for (const [id, record] of Object.entries(updated)) {
          if (record.first_reply_at) continue;
          const elapsed = elapsedBusinessMinutes(new Date(record.received_at), new Date(), slaConfig);
          updated[id] = { ...record, sla_status: computeStatus(elapsed, slaConfig) };
        }
        return updated;
      });
    }, 60_000);

    return () => clearInterval(interval);
  }, [slaConfig]);

  // Carrega threads sem resposta do Supabase
  useEffect(() => {
    if (!accountId) return;

    supabase
      .from('gmail_threads' as any)
      .select('thread_id, last_message_at, unread_count')
      .eq('account_id', accountId)
      .gt('unread_count', 0)
      .order('last_message_at', { ascending: true })
      .limit(100)
      .then(({ data }) => {
        for (const row of data ?? []) {
          if (row.last_message_at) {
            registerThread(row.thread_id, row.last_message_at);
          }
        }
      });
  }, [accountId, registerThread]);

  const getStatus = useCallback((threadId: string): SLAStatus | null =>
    records[threadId]?.sla_status ?? null, [records]);

  const getRecord = useCallback((threadId: string): EmailSLARecord | null =>
    records[threadId] ?? null, [records]);

  const breachedCount = Object.values(records).filter(r => r.sla_status === 'breached').length;
  const warningCount  = Object.values(records).filter(r => r.sla_status === 'warning').length;

  return { records, breachedCount, warningCount, registerThread, markReplied, getStatus, getRecord };
}
