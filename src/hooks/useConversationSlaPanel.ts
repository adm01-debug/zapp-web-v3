import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SlaStatus = "on_track" | "at_risk" | "breached";
export type SlaPriority = "low" | "medium" | "high" | "critical";

export interface ConversationSlaRow {
  contact_id: string;
  contact_name: string | null;
  contact_phone: string | null;
  channel_type: string | null;
  queue_id: string | null;
  queue_name: string | null;
  queue_color: string | null;
  assigned_to: string | null;
  agent_name: string | null;
  priority: SlaPriority;
  first_response_minutes: number;
  resolution_minutes: number;
  entered_queue_at: string | null;
  assigned_at: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  wait_seconds: number;
  handle_seconds: number;
  first_response_seconds: number | null;
  first_response_breached: boolean;
  resolution_breached: boolean;
  sla_status: SlaStatus;
  sla_progress_pct: number;
}

export interface ConversationSlaFilters {
  status?: SlaStatus | null;
  priority?: SlaPriority | null;
  queue_id?: string | null;
  search?: string | null;
}

export function useConversationSlaPanel(filters: ConversationSlaFilters) {
  const [rows, setRows] = useState<ConversationSlaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc("rpc_conversation_sla_panel" as any, {
      p_status: filters.status ?? null,
      p_priority: filters.priority ?? null,
      p_queue_id: filters.queue_id ?? null,
      p_assigned_to: null,
      p_search: filters.search?.trim() ? filters.search.trim() : null,
      p_limit: 200,
    });
    if (error) {
      setError(error.message);
      setRows([]);
    } else {
      setRows((data as ConversationSlaRow[]) ?? []);
    }
    setLoading(false);
  }, [filters.status, filters.priority, filters.queue_id, filters.search]);

  useEffect(() => {
    fetchRows();
    const id = setInterval(fetchRows, 20_000);
    return () => clearInterval(id);
  }, [fetchRows]);

  return { rows, loading, error, refetch: fetchRows };
}
