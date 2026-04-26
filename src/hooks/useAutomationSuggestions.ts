import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AutomationSuggestion {
  id: string;
  rule_id: string;
  rule_name?: string;
  suggestion_text: string | null;
  status: string;
  created_at: string;
}

export function useAutomationSuggestions(remoteJid: string | null) {
  const [suggestions, setSuggestions] = useState<AutomationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!remoteJid) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("automation_executions")
      .select("id, rule_id, suggestion_text, status, created_at, automation_rules(name)")
      .eq("remote_jid", remoteJid)
      .eq("status", "pending")
      .not("suggestion_text", "is", null)
      .order("created_at", { ascending: false })
      .limit(5);
    setSuggestions(
      ((data ?? []) as any[]).map((r) => ({
        id: r.id,
        rule_id: r.rule_id,
        rule_name: r.automation_rules?.name,
        suggestion_text: r.suggestion_text,
        status: r.status,
        created_at: r.created_at,
      })),
    );
    setLoading(false);
  }, [remoteJid]);

  useEffect(() => {
    refresh();
    if (!remoteJid) return;
    const ch = supabase
      .channel(`automation-exec-${remoteJid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "automation_executions" },
        (payload) => {
          const row = (payload.new ?? payload.old) as any;
          if (row?.remote_jid === remoteJid) refresh();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [remoteJid, refresh]);

  const accept = useCallback(async (id: string) => {
    await supabase
      .from("automation_executions")
      .update({ status: "accepted", acted_at: new Date().toISOString() })
      .eq("id", id);
    refresh();
  }, [refresh]);

  const dismiss = useCallback(async (id: string) => {
    await supabase
      .from("automation_executions")
      .update({ status: "dismissed", acted_at: new Date().toISOString() })
      .eq("id", id);
    refresh();
  }, [refresh]);

  return { suggestions, loading, refresh, accept, dismiss };
}
