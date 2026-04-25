/**
 * useTerminalSendFailureAlerts
 *
 * Alerta global (toast) sempre que UMA mensagem outbound atinge o estado
 * terminal de falha por esgotamento de tentativas. Difere do
 * `useFailedMessageAlerts`:
 *
 *   - `useFailedMessageAlerts` reage à DLQ (`failed_messages.status='abandoned'`)
 *     — caminho do reprocessador assíncrono.
 *   - este hook reage ao caminho síncrono: o sender (ou outra aba/agente)
 *     concluiu as N tentativas e marcou `messages.status` como
 *     `failed_retries` / `failed_auth` / `failed`, OU o `sendStatusBus`
 *     emitiu o estado terminal correspondente.
 *
 * Duas fontes de verdade redundantes para máxima resiliência:
 *
 *   1. **sendStatusBus (in-memory)**: pega a falha imediatamente na aba que
 *      executou o envio, sem esperar o roundtrip de realtime.
 *   2. **postgres_changes em `messages` (UPDATE)**: pega falhas geradas em
 *      outras abas / outros usuários (multi-agente) e sobrevive a reload.
 *
 * Dedup: cada `messageId` só dispara um toast por sessão (Set in-memory) +
 * checagem de transição (old.status !== terminal) para ignorar re-syncs do
 * realtime.
 *
 * Sem persistência — o objetivo é ALERTAR, não auditar. Auditoria já mora
 * em `failed_messages` + `evolution_retry_metrics`.
 */
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { subscribeAllSendStatus, type SendUIStatus } from './sendStatusBus';
import { getLogger } from '@/lib/logger';

const log = getLogger('TerminalSendFailureAlerts');

const TERMINAL_STATUSES = new Set<SendUIStatus>([
  'failed',
  'failed_auth',
  'failed_retries',
]);

interface MessageRowMinimal {
  id: string;
  status: string | null;
  contact_id: string | null;
  retry_attempt?: number | null;
  retry_total?: number | null;
}

function describeStatus(status: string, totalRetries?: number | null, errorReason?: string | null): {
  title: string;
  description: string;
} {
  const tail = errorReason ? ` — ${errorReason}` : '';
  if (status === 'failed_auth') {
    return {
      title: `Falha de autenticação no envio${tail}`,
      description: 'A conexão WhatsApp recusou a credencial. Reconecte a instância para continuar enviando.',
    };
  }
  if (status === 'failed_retries' && totalRetries) {
    return {
      title: `Mensagem falhou após ${totalRetries} tentativas${tail}`,
      description: 'O envio esgotou as retentativas automáticas. Reenvie manualmente ou verifique o destinatário.',
    };
  }
  return {
    title: `Mensagem falhou definitivamente${tail}`,
    description: 'O envio não foi concluído após as tentativas automáticas.',
  };
}

export function useTerminalSendFailureAlerts(enabled = true): void {
  const navigate = useNavigate();
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;

    const fire = (
      messageId: string,
      status: string,
      contactId: string | null,
      totalRetries: number | null | undefined,
      errorReason: string | null | undefined,
    ) => {
      if (seenRef.current.has(messageId)) return;
      seenRef.current.add(messageId);
      // Soft cap para não vazar memória em sessões longas.
      if (seenRef.current.size > 500) {
        const first = seenRef.current.values().next().value;
        if (first) seenRef.current.delete(first);
      }

      const { title, description } = describeStatus(status, totalRetries, errorReason);
      toast.error(title, {
        description,
        duration: 12_000,
        action: contactId
          ? {
              label: 'Abrir conversa',
              onClick: () => navigate(`/chat-popup/${contactId}`),
            }
          : undefined,
      });
      log.warn('[terminal-send-fail]', { messageId, status, contactId });
    };

    // ── 1) sendStatusBus (in-memory): captura falhas na própria aba ──
    const unsubBus = subscribeAllSendStatus((messageId, detail) => {
      if (!TERMINAL_STATUSES.has(detail.status)) return;
      // O bus não carrega contact_id; recuperamos o contato no toast só se
      // veio com errorReason (suficiente para o alerta) — sem lookup extra.
      fire(messageId, detail.status, null, detail.totalRetries ?? null, detail.errorReason ?? null);
    });

    // ── 2) postgres_changes em messages (cobre outras abas/agentes) ──
    const channel = supabase
      .channel('terminal_send_failure_alerts')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const next = payload.new as MessageRowMinimal | null;
          const prev = payload.old as MessageRowMinimal | null;
          if (!next?.status) return;
          if (!TERMINAL_STATUSES.has(next.status as SendUIStatus)) return;
          // Alerta apenas na transição: ignora re-syncs onde já estava terminal.
          if (prev?.status && TERMINAL_STATUSES.has(prev.status as SendUIStatus)) return;

          fire(
            next.id,
            next.status,
            next.contact_id ?? null,
            next.retry_total ?? null,
            null,
          );
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') log.warn('[terminal-send-fail] channel error');
      });

    return () => {
      unsubBus();
      supabase.removeChannel(channel);
    };
  }, [enabled, navigate]);
}
