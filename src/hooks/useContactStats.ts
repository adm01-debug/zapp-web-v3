import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { log } from '@/lib/logger';

export interface ContactStats {
  totalMessages: number;
  avgResponseTimeMinutes: number;
  totalConversations: number;
  csatAverage: number | null;
  csatCount: number;
}

export function useContactStats(contactId: string) {
  return useQuery({
    queryKey: ['contact-stats', contactId],
    queryFn: async (): Promise<ContactStats> => {
      try {
        // Fetch message count
        const { count: messageCount } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('contact_id', contactId);

        // Fetch conversation days count (unique days as proxy for conversations)
        const { data: messages } = await supabase
          .from('messages')
          .select('created_at')
          .eq('contact_id', contactId)
          .order('created_at', { ascending: false })
          .limit(500);

        // Count unique conversation days
        const uniqueDays = new Set(
          messages?.map(m => new Date(m.created_at).toDateString()) || []
        );

        // Fetch CSAT surveys
        const { data: csatData } = await supabase
          .from('csat_surveys')
          .select('rating')
          .eq('contact_id', contactId);

        const csatAvg = csatData && csatData.length > 0
          ? csatData.reduce((sum, s) => sum + s.rating, 0) / csatData.length
          : null;

        // Calculate avg response time from agent messages
        const { data: agentMessages } = await supabase
          .from('messages')
          .select('created_at, sender')
          .eq('contact_id', contactId)
          .order('created_at', { ascending: true })
          .limit(200);

        let totalResponseTime = 0;
        let responseCount = 0;
        if (agentMessages) {
          for (let i = 1; i < agentMessages.length; i++) {
            if (agentMessages[i].sender === 'agent' && agentMessages[i - 1].sender === 'contact') {
              const diff = new Date(agentMessages[i].created_at).getTime() - new Date(agentMessages[i - 1].created_at).getTime();
              totalResponseTime += diff;
              responseCount++;
            }
          }
        }

        const avgResponseMs = responseCount > 0 ? totalResponseTime / responseCount : 0;

        return {
          totalMessages: messageCount || 0,
          avgResponseTimeMinutes: Math.round(avgResponseMs / 60000),
          totalConversations: uniqueDays.size,
          csatAverage: csatAvg,
          csatCount: csatData?.length || 0,
        };
      } catch (err) {
        log.error('Error fetching contact stats:', err);
        return {
          totalMessages: 0,
          avgResponseTimeMinutes: 0,
          totalConversations: 0,
          csatAverage: null,
          csatCount: 0,
        };
      }
    },
    enabled: !!contactId,
  });
}
