import { useQuery } from '@tanstack/react-query';
import { dbList } from '@/integrations/datasource/db';
import { RPC } from '@/integrations/datasource/rpcCatalog';
import { startOfHour, format, parseISO } from 'date-fns';

export interface ParticipantStats {
  participantJid: string;
  displayName: string;
  sent: number;
  delivered: number;
  read: number;
  lastSentAt: string | null;
  lastDeliveredAt: string | null;
  lastReadAt: string | null;
}

export interface DeliveryTimelinePoint {
  time: string;
  sent: number;
  delivered: number;
  read: number;
}

export interface DeliveryStatsResult {
  isGroup: boolean;
  totals: {
    sent: number;
    delivered: number;
    read: number;
    lastSentAt: string | null;
    lastDeliveredAt: string | null;
    lastReadAt: string | null;
  };
  participants: ParticipantStats[];
  timeline: DeliveryTimelinePoint[];
  totalMessages: number;
}

const STATUS_RANK: Record<string, number> = {
  pending: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  played: 3,
};

function maxDate(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(a) > new Date(b) ? a : b;
}

function isGroupJid(jid: string): boolean {
  return jid?.endsWith('@g.us');
}

function extractParticipant(msg: Record<string, unknown>): { jid: string; name: string } {
  const fromMe = !!msg.from_me;
  const remoteJid = String(msg.remote_jid ?? '');
  const pushName = (msg.push_name as string | null) ?? '';

  if (fromMe) {
    return { jid: 'me', name: 'Atendente' };
  }

  // For groups, participant JID lives in payload.key.participant or payload.participant
  const payload = (msg.payload ?? {}) as Record<string, unknown>;
  const key = (payload.key ?? {}) as Record<string, unknown>;
  const participant =
    (key.participant as string | undefined) ??
    (payload.participant as string | undefined) ??
    null;

  if (participant) {
    return { jid: participant, name: pushName || participant.split('@')[0] };
  }

  // 1-1 chat: participant is the remote contact
  return { jid: remoteJid, name: pushName || remoteJid.split('@')[0] };
}

export function useDeliveryStats(remoteJid: string | undefined, instance = 'wpp2') {
  return useQuery<DeliveryStatsResult>({
    queryKey: ['delivery-stats', remoteJid, instance],
    enabled: !!remoteJid,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await dbList(RPC.listMessages, {
        p_remote_jid: remoteJid!,
        p_instance: instance,
        p_limit: 500,
      });

      // Fallback para quando o retorno do Supabase vier em formato inesperado
      if (error) {
        console.error('[useDeliveryStats] Erro na query:', error);
        return { 
          isGroup: isGroupJid(remoteJid!), 
          totals: { sent: 0, delivered: 0, read: 0, lastSentAt: null, lastDeliveredAt: null, lastReadAt: null }, 
          participants: [], 
          timeline: [],
          totalMessages: 0 
        };
      }

      const messages = (data && Array.isArray(data) ? data : []) as unknown as Record<string, unknown>[];
      const isGroup = isGroupJid(remoteJid!);

      const totals = { sent: 0, delivered: 0, read: 0, lastSentAt: null as string | null, lastDeliveredAt: null as string | null, lastReadAt: null as string | null };
      const byParticipant = new Map<string, ParticipantStats>();

      const timelineMap = new Map<string, DeliveryTimelinePoint>();

      for (const msg of messages) {
        const status = String(msg.status ?? 'pending').toLowerCase();
        const rank = STATUS_RANK[status] ?? 0;
        const tsString = (msg.status_at as string | null) ?? (msg.created_at as string | null) ?? null;
        const { jid, name } = extractParticipant(msg);

        // Timeline aggregation (by hour)
        if (tsString) {
          const date = parseISO(tsString);
          const hourKey = format(startOfHour(date), 'yyyy-MM-dd HH:00');
          if (!timelineMap.has(hourKey)) {
            timelineMap.set(hourKey, { time: hourKey, sent: 0, delivered: 0, read: 0 });
          }
          const point = timelineMap.get(hourKey)!;
          if (rank >= 1) point.sent++;
          if (rank >= 2) point.delivered++;
          if (rank >= 3) point.read++;
        }

        if (!byParticipant.has(jid)) {
          byParticipant.set(jid, {
            participantJid: jid,
            displayName: name,
            sent: 0, delivered: 0, read: 0,
            lastSentAt: null, lastDeliveredAt: null, lastReadAt: null,
          });
        }
        const p = byParticipant.get(jid)!;
        if (name && name.length > p.displayName.length) p.displayName = name;

        if (rank >= 1) { p.sent++; totals.sent++; p.lastSentAt = maxDate(p.lastSentAt, tsString); totals.lastSentAt = maxDate(totals.lastSentAt, tsString); }
        if (rank >= 2) { p.delivered++; totals.delivered++; p.lastDeliveredAt = maxDate(p.lastDeliveredAt, tsString); totals.lastDeliveredAt = maxDate(totals.lastDeliveredAt, tsString); }
        if (rank >= 3) { p.read++; totals.read++; p.lastReadAt = maxDate(p.lastReadAt, tsString); totals.lastReadAt = maxDate(totals.lastReadAt, tsString); }
      }

      const participants = Array.from(byParticipant.values()).sort((a, b) => b.sent - a.sent);
      const timeline = Array.from(timelineMap.values()).sort((a, b) => a.time.localeCompare(b.time));

      return { isGroup, totals, participants, timeline, totalMessages: messages.length };
    },
  });
}
