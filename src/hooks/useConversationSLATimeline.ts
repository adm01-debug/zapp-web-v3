import { useQuery } from '@tanstack/react-query';
import { externalSupabase, isExternalConfigured } from '@/integrations/supabase/externalClient';
import { supabase } from '@/integrations/supabase/client';

export interface SLAAttribution {
  agentId: string | null;
  agentName: string | null;
  queueId: string | null;
  queueName: string | null;
}

export interface SLATimelineData {
  firstContactAt: Date | null;
  firstResponseAt: Date | null;
  firstResponseDurationMs: number | null;
  lastMessageAt: Date | null;
  closedAt: Date | null;
  resolutionDurationMs: number | null;
  reopenedAt: Date | null;
  isAwaitingFirstResponse: boolean;
  awaitingMs: number | null;
  totalMessages: number;
  firstResponseBy: SLAAttribution | null;
  resolvedBy: SLAAttribution | null;
}

interface EvolutionMessageRow {
  created_at: string;
  direction: string | null;
  from_me: boolean | null;
}

interface ConversationEventRow {
  event_type: string;
  created_at: string;
  performed_by: string | null;
  from_agent_id: string | null;
  to_agent_id: string | null;
  from_queue_id: string | null;
  to_queue_id: string | null;
  performed_by_profile?: { id: string; name: string | null } | null;
  to_agent?: { id: string; name: string | null } | null;
  to_queue?: { id: string; name: string | null } | null;
}

const EMPTY: SLATimelineData = {
  firstContactAt: null,
  firstResponseAt: null,
  firstResponseDurationMs: null,
  lastMessageAt: null,
  closedAt: null,
  resolutionDurationMs: null,
  reopenedAt: null,
  isAwaitingFirstResponse: false,
  awaitingMs: null,
  totalMessages: 0,
  firstResponseBy: null,
  resolvedBy: null,
};

/**
 * Resolves the SLA milestones for a single conversation.
 * - Pulls messages from FATOR X (`rpc_list_messages`) to find first inbound/outbound + last activity.
 * - Pulls close/reopen events from Lovable Cloud `conversation_events`.
 */
export function useConversationSLATimeline(remoteJid: string | null, contactId: string | null) {
  const enabled = Boolean(remoteJid && isExternalConfigured);

  return useQuery({
    queryKey: ['sla-timeline', remoteJid, contactId],
    enabled,
    staleTime: 30_000,
    refetchInterval: (query) => {
      const data = query.state.data as SLATimelineData | undefined;
      return data?.isAwaitingFirstResponse ? 30_000 : false;
    },
    queryFn: async (): Promise<SLATimelineData> => {
      if (!remoteJid || !externalSupabase) return EMPTY;

      // 1. Messages — first inbound, first outbound, last
      const { data: msgs, error: msgErr } = await externalSupabase.rpc('rpc_list_messages', {
        p_remote_jid: remoteJid,
        p_instance: 'wpp2',
        p_limit: 500,
      });
      if (msgErr) throw msgErr;

      const rows = (msgs || []) as EvolutionMessageRow[];
      // RPC returns DESC by created_at typically; sort ASC for milestone scan.
      const sorted = [...rows].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      const firstInbound = sorted.find(
        (m) => m.from_me === false || m.direction === 'inbound'
      );
      const firstOutbound = sorted.find(
        (m) => m.from_me === true || m.direction === 'outbound'
      );
      const last = sorted[sorted.length - 1];

      const firstContactAt = firstInbound ? new Date(firstInbound.created_at) : null;
      const firstResponseAt = firstOutbound ? new Date(firstOutbound.created_at) : null;
      const lastMessageAt = last ? new Date(last.created_at) : null;

      const firstResponseDurationMs =
        firstContactAt && firstResponseAt && firstResponseAt > firstContactAt
          ? firstResponseAt.getTime() - firstContactAt.getTime()
          : null;

      const isAwaitingFirstResponse = Boolean(firstContactAt && !firstResponseAt);
      const awaitingMs =
        isAwaitingFirstResponse && firstContactAt
          ? Date.now() - firstContactAt.getTime()
          : null;

      // 2. Close / reopen / assign events from Lovable Cloud (best-effort)
      let closedAt: Date | null = null;
      let reopenedAt: Date | null = null;
      let resolvedBy: SLAAttribution | null = null;
      let firstResponseBy: SLAAttribution | null = null;

      if (contactId) {
        const { data: events } = await supabase
          .from('conversation_events')
          .select(`
            event_type, created_at, performed_by, from_agent_id, to_agent_id,
            from_queue_id, to_queue_id,
            performed_by_profile:profiles!conversation_events_performed_by_fkey(id, name),
            to_agent:profiles!conversation_events_to_agent_id_fkey(id, name),
            to_queue:queues!conversation_events_to_queue_id_fkey(id, name)
          `)
          .eq('contact_id', contactId)
          .in('event_type', ['close', 'reopen', 'assign'])
          .order('created_at', { ascending: false })
          .limit(50);

        const eventRows = (events || []) as unknown as ConversationEventRow[];
        const lastClose = eventRows.find((e) => e.event_type === 'close');
        const lastReopen = eventRows.find((e) => e.event_type === 'reopen');

        if (lastClose) {
          closedAt = new Date(lastClose.created_at);
          resolvedBy = {
            agentId: lastClose.performed_by_profile?.id ?? lastClose.performed_by ?? null,
            agentName: lastClose.performed_by_profile?.name ?? null,
            queueId: lastClose.to_queue?.id ?? lastClose.to_queue_id ?? null,
            queueName: lastClose.to_queue?.name ?? null,
          };
        }
        if (lastReopen) reopenedAt = new Date(lastReopen.created_at);

        // If reopen happened after close, conversation is open again — nullify closedAt for resolution math.
        if (closedAt && reopenedAt && reopenedAt > closedAt) {
          closedAt = null;
          resolvedBy = null;
        }

        // First response attribution: pick the latest assign event whose created_at <= firstResponseAt
        if (firstResponseAt) {
          const assignsAsc = eventRows
            .filter((e) => e.event_type === 'assign')
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          const activeAssign = [...assignsAsc]
            .reverse()
            .find((e) => new Date(e.created_at).getTime() <= firstResponseAt.getTime());
          if (activeAssign) {
            firstResponseBy = {
              agentId: activeAssign.to_agent?.id ?? activeAssign.to_agent_id ?? null,
              agentName: activeAssign.to_agent?.name ?? null,
              queueId: activeAssign.to_queue?.id ?? activeAssign.to_queue_id ?? null,
              queueName: activeAssign.to_queue?.name ?? null,
            };
          }
        }
      }

      const resolutionDurationMs =
        firstContactAt && closedAt && closedAt > firstContactAt
          ? closedAt.getTime() - firstContactAt.getTime()
          : null;

      return {
        firstContactAt,
        firstResponseAt,
        firstResponseDurationMs,
        lastMessageAt,
        closedAt,
        resolutionDurationMs,
        reopenedAt,
        isAwaitingFirstResponse,
        awaitingMs,
        totalMessages: sorted.length,
        firstResponseBy,
        resolvedBy,
      };
    },
  });
}
