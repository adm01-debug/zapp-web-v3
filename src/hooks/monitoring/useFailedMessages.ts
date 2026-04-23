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
  hours?: number;
  status?: FailedMessageStatus | null;
  instance?: string | null;
  errorCode?: string | null;
}

export interface ErrorCodeAggregate {
  code: string;
  count: number;
  lastAt: string;
}

export interface InstanceAggregate {
  instance: string;
  count: number;
}

export interface FailedMessagesAggregates {
  pending: number;
  retrying: number;
  abandoned24h: number;
  successAfterRetryRate: number;
  byErrorCode: ErrorCodeAggregate[];
  byInstance: InstanceAggregate[];
  topInstance: InstanceAggregate | null;
}

export function useFailedMessages(filters: FailedMessagesFilters = {}) {
  const queryClient = useQueryClient();
  const { hours = 24, status = null, instance = null, errorCode = null } = filters;
  const queryKey = ['failed-messages', { hours, status, instance, errorCode }];

  const query = useQuery<FailedMessageRow[]>({
    queryKey,
    queryFn: async () => {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      let q = supabase
        .from('failed_messages')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(200);
      if (status) q = q.eq('status', status);
      if (instance) q = q.eq('instance_name', instance);
      if (errorCode) q = q.eq('error_code', errorCode);
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

    // Agregação por error_code
    const errorMap = new Map<string, { count: number; lastAt: string }>();
    for (const r of rows) {
      const code = r.error_code ?? (r.http_status ? `http_${r.http_status}` : 'unknown');
      const cur = errorMap.get(code);
      if (cur) {
        cur.count += 1;
        if (r.created_at > cur.lastAt) cur.lastAt = r.created_at;
      } else {
        errorMap.set(code, { count: 1, lastAt: r.created_at });
      }
    }
    const byErrorCode: ErrorCodeAggregate[] = Array.from(errorMap.entries())
      .map(([code, v]) => ({ code, count: v.count, lastAt: v.lastAt }))
      .sort((a, b) => b.count - a.count);

    // Agregação por instância
    const instMap = new Map<string, number>();
    for (const r of rows) {
      instMap.set(r.instance_name, (instMap.get(r.instance_name) ?? 0) + 1);
    }
    const byInstance: InstanceAggregate[] = Array.from(instMap.entries())
      .map(([instance, count]) => ({ instance, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      pending,
      retrying,
      abandoned24h,
      successAfterRetryRate,
      byErrorCode,
      byInstance,
      topInstance: byInstance[0] ?? null,
    };
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

  const bulkRetry = useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return 0;
      const { error } = await supabase
        .from('failed_messages')
        .update({
          status: 'retrying',
          next_attempt_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in('id', ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (n) => {
      toast.success(`${n} item(s) marcado(s) para reprocesso.`);
      queryClient.invalidateQueries({ queryKey: ['failed-messages'] });
    },
    onError: (e: unknown) => {
      toast.error(`Falha em massa: ${e instanceof Error ? e.message : 'erro'}`);
    },
  });

  const bulkAbandon = useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return 0;
      const { error } = await supabase
        .from('failed_messages')
        .update({
          status: 'abandoned',
          updated_at: new Date().toISOString(),
        })
        .in('id', ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (n) => {
      toast.success(`${n} item(s) abandonado(s).`);
      queryClient.invalidateQueries({ queryKey: ['failed-messages'] });
    },
    onError: (e: unknown) => {
      toast.error(`Falha em massa: ${e instanceof Error ? e.message : 'erro'}`);
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

  return { ...query, aggregates, retryNow, abandon, bulkRetry, bulkAbandon, triggerReprocess };
}
