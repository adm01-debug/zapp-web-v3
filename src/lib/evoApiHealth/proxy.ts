import { supabase } from '@/integrations/supabase/client';
import { generateCorrelationId, CORRELATION_HEADER } from '@/lib/correlationId';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
const PROXY_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/external-db-proxy` : '';

interface ProxyResponse<T> {
  data: T;
  count?: number;
  cid: string;
  rid: string;
  schema_unavailable?: boolean;
}

interface ProxyErrorResponse {
  error: string;
  cid?: string;
  rid?: string;
}

/**
 * Encapsulates communication with the external DB proxy.
 */
class ExternalDbProxyClient {
  private async getAuthHeader(): Promise<string> {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      return token ? `Bearer ${token}` : `Bearer ${SUPABASE_ANON}`;
    } catch {
      return `Bearer ${SUPABASE_ANON}`;
    }
  }

  async call<T>(body: Record<string, unknown>): Promise<{ data: T | null; schema_unavailable: boolean }> {
    if (!PROXY_URL) throw new Error('VITE_SUPABASE_URL missing');

    const cid = generateCorrelationId();
    const auth = await this.getAuthHeader();

    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON,
        Authorization: auth,
        [CORRELATION_HEADER]: cid,
      },
      body: JSON.stringify({
        ...body,
        __cid: cid,
        schema: 'evo_api', // Default for this proxy client
      }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = (result as ProxyErrorResponse | null)?.error ?? `HTTP ${response.status}`;
      throw new Error(errorMsg);
    }

    const okResult = result as ProxyResponse<T> | null;
    return {
      data: (okResult?.data ?? null) as T | null,
      schema_unavailable: !!okResult?.schema_unavailable,
    };
  }

  rpc<T = unknown>(name: string, params: Record<string, unknown> = {}) {
    return this.call<T>({ action: 'rpc', rpc: name, params });
  }

  select<T = unknown>(opts: {
    table: string;
    select?: string;
    filters?: { column: string; operator: string; value: unknown }[];
    order?: { column: string; ascending?: boolean };
    limit?: number;
    offset?: number;
  }) {
    return this.call<T[]>({ action: 'select', ...opts });
  }

  update<T = unknown>(opts: {
    table: string;
    data: Record<string, unknown>;
    match: Record<string, unknown>;
  }) {
    return this.call<T[]>({ action: 'update', ...opts });
  }
}

// Export a singleton instance
export const evoApi = new ExternalDbProxyClient();
