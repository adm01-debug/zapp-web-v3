import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type SLAStatus = 'ok' | 'warning' | 'breached' | 'na';
type SLAScope = 'current' | 'queue' | 'agent' | 'none';
type AlertKind = 'first_response' | 'resolution';
type AlertSeverity = 'warning' | 'breached';

interface SLAAlertParams {
  contactId: string | null;
  contactName: string;
  scope: SLAScope;
  firstResponseStatus: SLAStatus;
  resolutionStatus: SLAStatus;
  ruleName: string | null;
  awaitingMs: number | null;
  resolutionDurationMs: number | null;
}

function formatDurationMs(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}min`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h`;
  return `${Math.round(ms / 86_400_000)}d`;
}

/**
 * Dispara notificações in-app + auditoria quando o SLA da conversa atual entra
 * em risco ou é violado. Anti-spam: 1 alerta por (contato, tipo, severidade) por sessão.
 * Respeita escopo `'none'` — não dispara.
 */
export function useSLAAlerts(params: SLAAlertParams) {
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (params.scope === 'none' || !params.contactId) return;

    const fire = (kind: AlertKind, severity: AlertSeverity, durationMs: number | null) => {
      const key = `${params.contactId}:${kind}:${severity}`;
      if (firedRef.current.has(key)) return;
      firedRef.current.add(key);

      const isBreach = severity === 'breached';
      const kindLabel = kind === 'first_response' ? '1ª resposta' : 'Resolução';
      const title = `SLA ${isBreach ? 'violado' : 'em risco'} — ${params.contactName}`;
      const description = `${kindLabel} · ${formatDurationMs(durationMs)} · ${params.ruleName ?? 'regra padrão'}`;

      if (isBreach) {
        toast.error(title, { description, duration: 10_000 });
      } else {
        toast.warning(title, { description, duration: 6_000 });
      }

      // Audit (best-effort, fire-and-forget)
      void supabase
        .from('conversation_events')
        .insert({
          contact_id: params.contactId!,
          event_type: 'sla_alert',
          metadata: {
            kind,
            severity,
            scope: params.scope,
            rule_name: params.ruleName,
            duration_ms: durationMs,
          },
        })
        .then(() => undefined, () => undefined);
    };

    if (params.firstResponseStatus === 'warning' || params.firstResponseStatus === 'breached') {
      fire('first_response', params.firstResponseStatus, params.awaitingMs);
    }
    if (params.resolutionStatus === 'warning' || params.resolutionStatus === 'breached') {
      fire('resolution', params.resolutionStatus, params.resolutionDurationMs);
    }
  }, [
    params.contactId,
    params.scope,
    params.firstResponseStatus,
    params.resolutionStatus,
    params.awaitingMs,
    params.resolutionDurationMs,
    params.ruleName,
    params.contactName,
  ]);
}
