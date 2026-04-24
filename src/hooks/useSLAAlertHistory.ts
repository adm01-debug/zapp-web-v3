import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type SLAAlertKind = 'first_response' | 'resolution';
export type SLAAlertSeverity = 'warning' | 'breached';

export interface SLAAlertHistoryEntry {
  id: string;
  contactId: string | null;
  contactName: string;
  contactPhone: string | null;
  kind: SLAAlertKind | null;
  severity: SLAAlertSeverity | null;
  ruleName: string | null;
  scope: string | null;
  durationMs: number | null;
  createdAt: string;
}

interface RawRow {
  id: string;
  contact_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  contacts: { name: string | null; phone: string | null } | null;
}

const PAGE_SIZE = 100;

async function fetchHistory(): Promise<SLAAlertHistoryEntry[]> {
  const { data, error } = await supabase
    .from('conversation_events')
    .select('id, contact_id, metadata, created_at, contacts(name, phone)')
    .eq('event_type', 'sla_alert')
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);

  if (error) throw error;

  return ((data ?? []) as unknown as RawRow[]).map((row) => {
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    return {
      id: row.id,
      contactId: row.contact_id,
      contactName: row.contacts?.name ?? row.contacts?.phone ?? 'Contato desconhecido',
      contactPhone: row.contacts?.phone ?? null,
      kind: (meta.kind as SLAAlertKind) ?? null,
      severity: (meta.severity as SLAAlertSeverity) ?? null,
      ruleName: typeof meta.rule_name === 'string' ? (meta.rule_name as string) : null,
      scope: typeof meta.scope === 'string' ? (meta.scope as string) : null,
      durationMs: typeof meta.duration_ms === 'number' ? (meta.duration_ms as number) : null,
      createdAt: row.created_at,
    };
  });
}

export function useSLAAlertHistory() {
  return useQuery({
    queryKey: ['sla-alert-history'],
    queryFn: fetchHistory,
    staleTime: 30_000,
  });
}
