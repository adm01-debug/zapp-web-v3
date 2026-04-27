/**
 * Helper fino para consultar o schema `evo_api` no FATOR X via
 * `external-db-proxy` (mesmo edge function usado pelo restante do app).
 *
 * Não criamos um novo client Supabase no frontend — toda a comunicação
 * passa pelo proxy server-side, que usa service-role e respeita a
 * allowlist de schemas (`public` + `evo_api`).
 */
import { supabase } from '@/integrations/supabase/client';
import { generateCorrelationId, CORRELATION_HEADER } from '@/lib/correlationId';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
const FN_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/external-db-proxy` : '';

interface ProxyResponse<T> { data: T; cid: string; rid: string; schema_unavailable?: boolean }
interface ProxyErr { error: string; cid?: string; rid?: string }

export async function call<T>(body: Record<string, unknown>): Promise<{ data: T | null; schema_unavailable: boolean }> {
  if (!FN_URL) throw new Error('VITE_SUPABASE_URL missing');
  const cid = generateCorrelationId();
  let auth = `Bearer ${SUPABASE_ANON}`;
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) auth = `Bearer ${token}`;
  } catch { /* fallback to anon */ }

  const res = await fetch(FN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON,
      Authorization: auth,
      [CORRELATION_HEADER]: cid,
    },
    body: JSON.stringify({ ...body, __cid: cid, schema: 'evo_api' }),
  });

  const text = await res.text();
  let parsed: any = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }

  if (!res.ok) {
    const errObj = parsed as ProxyErr | null;
    throw new Error(errObj?.error ?? `HTTP ${res.status}`);
  }

  const ok = parsed as ProxyResponse<T> | null;
  return {
    data: (ok?.data ?? null) as T | null,
    schema_unavailable: !!ok?.schema_unavailable,
  };
}

export const evoApi = {
  rpc: <T = unknown>(rpc: string, params: Record<string, unknown> = {}) =>
    call<T>({ action: 'rpc', rpc, params }),

  select: <T = unknown>(opts: {
    table: string;
    select?: string;
    filters?: { column: string; operator: string; value: unknown }[];
    order?: { column: string; ascending?: boolean };
    limit?: number;
  }) => call<T[]>({ action: 'select', ...opts }),

  update: <T = unknown>(opts: {
    table: string;
    data: Record<string, unknown>;
    match: Record<string, unknown>;
  }) => call<T[]>({ action: 'update', ...opts }),
};
