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
  /** Optional AbortSignal — cancels the underlying fetch. */
  signal?: AbortSignal;
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
  // Extract signal so it isn't sent in the JSON body.
  const { signal, ...body } = params as ProxyParams & { signal?: AbortSignal };

  // supabase.functions.invoke supports an optional signal via second arg.
  const invokeOptions: { body: unknown; signal?: AbortSignal } = { body };
  if (signal) invokeOptions.signal = signal;

  const { data, error } = await supabase.functions.invoke('external-db-proxy', invokeOptions);

  if (error) {
    // Normalize abort: supabase may surface AbortError via FunctionsFetchError
    const name = (error as { name?: string }).name;
    const message = error.message || '';
    if (name === 'AbortError' || /aborted/i.test(message)) {
      const abortErr = new Error('Aborted');
      abortErr.name = 'AbortError';
      throw abortErr;
    }
    throw new Error(message || 'External DB proxy error');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as ProxyResponse<T>;
}
