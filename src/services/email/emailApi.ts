import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type EmailRevalidationJob = Database['public']['Tables']['email_revalidation_jobs']['Row'];
export type EmailHealthSummary = Database['public']['Tables']['email_health_summary']['Row'];

export const emailApi = {
  getAuditLogs: async (from: number, to: number) => {
    return await supabase
      .from('email_revalidation_jobs')
      .select('*', { count: 'exact' })
      .order('requested_at', { ascending: false })
      .range(from, to);
  },
  getHealthSummary: async () => {
    return await supabase
      .from('email_health_summary')
      .select('*')
      .eq('id', 'current')
      .maybeSingle();
  },
  markThreadRead: async (threadId: string, read: boolean) => {
    return await supabase.rpc('rpc_email_mark_thread_read', {
      p_thread_id: threadId,
      p_read: read
    });
  },
  getTokenStatus: async () => {
    return await supabase.rpc('rpc_email_token_status');
  }
};
