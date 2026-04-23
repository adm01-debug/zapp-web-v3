import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type FailedMessageStatus = 'pending' | 'retrying' | 'succeeded' | 'abandoned';

export interface FailedMessageRow {
  id: string;
  instance_name: string;
  remote_jid: string | null;
  payload: Record<string, unknown>;
  error_code: string | null;
  error_message: string | null;
  http_status: number | null;
  retry_count: number;
  max_retries: number;
  status: FailedMessageStatus;
  last_attempt_at: string | null;
  next_attempt_at: string | null;
  succeeded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FailedMessagesFilters {
  hours?: number;                       // default 24
  status?: FailedMessageStatus | null;
  instance?: string | null;
}

export interface FailedMessagesAggregates {
  pending: number;
  retrying: number;
  abandoned24h: number;
  successAfterRetryRate: number; // 0..100
}

export function useFailedMessages(filters: FailedMessagesFilters = {}) {
  const queryClient = useQueryClient();
  const { hours = 24, status = null, instance = null } = filters;
  const queryKey = ['failed-messages', { hours, status, instance }];

  const query = useQuery<FailedMessageRow[]>({
    queryKey,
    queryFn: async () => {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      let q = supabase
        .from('failed_messages')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(50);
      if (status) q = q.eq('status', status);
      if (instance) q = q.eq('instance_name', instance);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as FailedMessageRow[];
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const aggregates = useMemo<FailedMessagesAggregates>(() => {
    const rows = query.data ?? [];
    const pending = rows.filter(r => r.status === 'pending').length;
    const retrying = rows.filter(r => r.status === 'retrying').length;
    const abandoned24h = rows.filter(r => r.status === 'abandoned').length;
    const retried = rows.filter(r => r.retry_count > 0);
    const succeededRetried = retried.filter(r => r.status === 'succeeded').length;
    const successAfterRetryRate = retried.length === 0
      ? 0
      : Math.round((succeededRetried / retried.length) * 1000) / 10;
    return { pending, retrying, abandoned24h, successAfterRetryRate };
  }, [query.data]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('failed_messages_realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'failed_messages' },
        () => { queryClient.invalidateQueries({ queryKey: ['failed-messages'] }); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const retryNow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('failed_messages')
        .update({
          status: 'retrying',
          next_attempt_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Item marcado para reprocesso imediato.');
      queryClient.invalidateQueries({ queryKey: ['failed-messages'] });
    },
    onError: (e: unknown) => {
      toast.error(`Falha: ${e instanceof Error ? e.message : 'erro'}`);
    },
  });

  const abandon = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('failed_messages')
        .update({
          status: 'abandoned',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Item abandonado.');
      queryClient.invalidateQueries({ queryKey: ['failed-messages'] });
    },
    onError: (e: unknown) => {
      toast.error(`Falha: ${e instanceof Error ? e.message : 'erro'}`);
    },
  });

  const triggerReprocess = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('reprocess-failed-messages', { method: 'POST' });
      if (error) throw error;
      return data as { processed?: number; succeeded?: number; failed?: number; abandoned?: number; message?: string };
    },
    onSuccess: (data) => {
      const processed = data?.processed ?? 0;
      toast.success(processed === 0
        ? (data?.message ?? 'Nenhum item pendente.')
        : `Reprocessamento concluído — ${processed} item(s): ✓${data.succeeded ?? 0} ✗${data.failed ?? 0} ⚠${data.abandoned ?? 0}`
      );
      queryClient.invalidateQueries({ queryKey: ['failed-messages'] });
    },
    onError: (e: unknown) => {
      toast.error(`Falha ao reprocessar: ${e instanceof Error ? e.message : 'erro'}`);
    },
  });

  return { ...query, aggregates, retryNow, abandon, triggerReprocess };
}
