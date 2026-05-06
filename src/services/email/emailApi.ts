import { supabase } from '@/integrations/supabase/client';

export type EmailRevalidationJob = {
  id: string;
  status: string;
  requested_at: string;
  completed_at: string | null;
  requested_by: string | null;
  result: any;
};

export type EmailHealthSummary = {
  id: string;
  status: string;
  last_validation: string | null;
  failure_count_60m: number;
};

export const emailApi = {
  getAuditLogs: async (from: number, to: number) => {
    return await (supabase as any)
      .from('email_revalidation_jobs')
      .select('*', { count: 'exact' })
      .order('requested_at', { ascending: false })
      .range(from, to);
  },
  getHealthSummary: async () => {
    return await (supabase as any)
      .from('email_health_summary')
      .select('*')
      .eq('id', 'current')
      .maybeSingle();
  },
  markThreadRead: async (threadId: string, read: boolean) => {
    return await (supabase as any).rpc('rpc_email_mark_thread_read', {
      p_thread_id: threadId,
      p_read: read
    });
  },
  getTokenStatus: async () => {
    return await (supabase as any).rpc('rpc_email_token_status');
  }
};
