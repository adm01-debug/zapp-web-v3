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

const dedupeKey = (contactId: string, kind: AlertKind, severity: AlertSeverity) =>
  `${contactId}:${kind}:${severity}`;

/**
 * Persistent dedupe: checks `conversation_events` (event_type='sla_alert') for a previous
 * record with same kind+severity. Returns true if already fired (so we should skip).
 *
 * Best-effort: on query error we DO NOT block the alert — fail-open keeps the operator informed.
 */
async function alreadyFiredPersistent(
  contactId: string,
  kind: AlertKind,
  severity: AlertSeverity,
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('conversation_events')
      .select('id')
      .eq('contact_id', contactId)
      .eq('event_type', 'sla_alert')
      .contains('metadata', { kind, severity })
      .limit(1)
      .maybeSingle();
    if (error) return false;
    return !!data;
  } catch {
    return false;
  }
}

/**
 * Dispara notificações in-app + auditoria quando o SLA da conversa atual entra
 * em risco ou é violado.
 *
 * Anti-spam em duas camadas:
 *  1. In-memory (sessão atual) — `firedRef` evita loops e re-disparo dentro da mesma sessão.
 *  2. Persistente — consulta `conversation_events` (já recebe nosso registro de auditoria) por
 *     (contact_id + event_type='sla_alert' + metadata{kind,severity}). Garante que mesmo após
 *     refresh ou troca de página o mesmo alerta não dispare novamente.
 *
 * Respeita escopo `'none'` — não dispara.
 */
export function useSLAAlerts(params: SLAAlertParams) {
  const firedRef = useRef<Set<string>>(new Set());
  const inflightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (params.scope === 'none' || !params.contactId) return;
    const contactId = params.contactId;

    const fire = async (kind: AlertKind, severity: AlertSeverity, durationMs: number | null) => {
      const key = dedupeKey(contactId, kind, severity);

      // Layer 1: in-memory (sync) — prevents re-entry from rapid effect runs.
      if (firedRef.current.has(key) || inflightRef.current.has(key)) return;
      inflightRef.current.add(key);

      try {
        // Layer 2: persistent — check audit history for prior alert with same key.
        const already = await alreadyFiredPersistent(contactId, kind, severity);
        if (already) {
          // Mark as fired locally so subsequent renders skip the round-trip.
          firedRef.current.add(key);
          return;
        }

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

        // Audit (best-effort, fire-and-forget). Also serves as the persistent dedupe record.
        void supabase
          .from('conversation_events')
          .insert({
            contact_id: contactId,
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

        // External webhook forwarding (best-effort, fire-and-forget).
        void supabase.functions
          .invoke('sla-alert-forward', {
            body: {
              contact_id: contactId,
              contact_name: params.contactName,
              kind,
              severity,
              scope: params.scope,
              rule_name: params.ruleName,
              duration_ms: durationMs,
              occurred_at: new Date().toISOString(),
            },
          })
          .then(() => undefined, () => undefined);
      } finally {
        inflightRef.current.delete(key);
      }
    };

    if (params.firstResponseStatus === 'warning' || params.firstResponseStatus === 'breached') {
      void fire('first_response', params.firstResponseStatus, params.awaitingMs);
    }
    if (params.resolutionStatus === 'warning' || params.resolutionStatus === 'breached') {
      void fire('resolution', params.resolutionStatus, params.resolutionDurationMs);
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
