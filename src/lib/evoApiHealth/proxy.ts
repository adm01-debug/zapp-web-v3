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

interface ProxyOk<T> { data: T; cid: string; rid: string }
interface ProxyErr { error: string; cid?: string; rid?: string }

async function call<T>(body: Record<string, unknown>): Promise<T> {
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
  let parsed: unknown = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  if (!res.ok) {
    const errObj = parsed as (ProxyErr & { code?: string }) | null;
    const msg = errObj?.error ?? `HTTP ${res.status}`;
    // PGRST106: schema not exposed via PostgREST on FATOR X.
    // Treat as "feature not provisioned" → return empty payload instead of
    // throwing, so the dashboard renders an empty state instead of blank-screening.
    if (errObj?.code === 'PGRST106' || /Invalid schema:\s*evo_api/i.test(msg)) {
      // eslint-disable-next-line no-console
      console.warn('[evoApi] schema "evo_api" not exposed on FATOR X PostgREST. Returning empty result.');
      return (null as unknown) as T;
    }
    throw new Error(msg);
  }
  return ((parsed as ProxyOk<T>)?.data ?? null) as T;
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
