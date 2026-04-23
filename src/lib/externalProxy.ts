/**
 * Client helper for calling the external-db-proxy edge function
 */
import { supabase } from '@/integrations/supabase/client';

interface ProxySelectParams {
  table: string;
  select?: string;
  filters?: { column: string; operator: string; value: unknown }[];
  order?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
  countMode?: 'exact' | 'planned' | 'estimated';
  /**
   * Optional cursor sugar — pushed into `filters` server-side.
   * Use for pagination by created_at (gt for forward, lt for older).
   */
  cursor?: { column: string; operator: 'gt' | 'lt' | 'gte' | 'lte'; value: string };
}

interface ProxyMutationParams {
  action: 'insert' | 'update';
  table: string;
  data?: Record<string, unknown> | Record<string, unknown>[];
  match?: Record<string, unknown>;
}

interface ProxyRPCParams {
  action: 'rpc';
  rpc: string;
  params?: Record<string, unknown>;
}

type ProxyParams = ProxySelectParams | ProxyMutationParams | ProxyRPCParams;

interface ProxyResponse<T = unknown> {
  data: T[];
  count?: number;
  error?: string;
}

export async function queryExternalProxy<T = unknown>(params: ProxyParams): Promise<ProxyResponse<T>> {
  const { data, error } = await supabase.functions.invoke('external-db-proxy', {
    body: params,
  });

  if (error) {
    throw new Error(error.message || 'External DB proxy error');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as ProxyResponse<T>;
}
