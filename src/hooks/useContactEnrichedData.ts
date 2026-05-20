import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { log } from '@/lib/logger';

export interface EnrichedContactData {
  company: string | null;
  job_title: string | null;
  nickname: string | null;
  surname: string | null;
  contact_type: string | null;
  ai_sentiment: string | null;
  ai_priority: string | null;
  channel_type: string | null;
}

export interface AIConversationTag {
  id: string;
  tag_name: string;
  confidence: number | null;
  source: string | null;
}

export interface SLAInfo {
  first_response_breached: boolean | null;
  resolution_breached: boolean | null;
  first_response_at: string | null;
  resolved_at: string | null;
}

export function useContactEnrichedData(contactId: string) {
  // Fetch enriched contact fields from DB
  const { data: enrichedData } = useQuery({
    queryKey: ['contact-enriched', contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('company, job_title, nickname, surname, contact_type, ai_sentiment, ai_priority, channel_type')
        .eq('id', contactId)
        .single();

      if (error) {
        log.error('Error fetching enriched contact data:', error);
        return null;
      }
      return data as EnrichedContactData;
    },
    enabled: !!contactId,
  });

  // Fetch AI conversation tags
  const { data: aiTags = [] } = useQuery({
    queryKey: ['contact-ai-tags', contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_conversation_tags')
        .select('id, tag_name, confidence, source')
        .eq('contact_id', contactId)
        .order('confidence', { ascending: false });

      if (error) {
        log.error('Error fetching AI tags:', error);
        return [];
      }
      return data as AIConversationTag[];
    },
    enabled: !!contactId,
  });

  // Fetch SLA info
  const { data: slaInfo } = useQuery({
    queryKey: ['contact-sla', contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversation_sla')
        .select('first_response_breached, resolution_breached, first_response_at, resolved_at')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        log.error('Error fetching SLA info:', error);
        return null;
      }
      return data as SLAInfo | null;
    },
    enabled: !!contactId,
  });

  return { enrichedData, aiTags, slaInfo };
}
