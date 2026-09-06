/**
 * db-client.ts — Factory centralizada de SupabaseClient para Edge Functions.
 *
 * TODAS as Edge Functions que fazem .from() ou .rpc() em tabelas do schema
 * `zapp` DEVEM usar este helper em vez de createClient direto.
 * Isso garante que o header Accept-Profile/Content-Profile seja enviado
 * ao PostgREST, que por padrão resolve apenas o schema `public` (vazio).
 *
 * Uso:
 *   import { createZappClient, createZappAdminClient } from "../_shared/db-client.ts";
 *
 *   // Com auth do caller (anon key + JWT do header Authorization)
 *   const supabase = createZappClient(req);
 *
 *   // Com service_role (sem auth do caller)
 *   const admin = createZappAdminClient();
 */
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`[db-client] env ${name} is required`);
  return v;
}

const SUPABASE_URL = () =>
  Deno.env.get("SELFHOSTED_SUPABASE_URL") ??
  requireEnv("SUPABASE_URL");

const SERVICE_ROLE_KEY = () =>
  Deno.env.get("SELFHOSTED_SUPABASE_SERVICE_ROLE_KEY") ??
  requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const ANON_KEY = () =>
  Deno.env.get("SELFHOSTED_SUPABASE_ANON_KEY") ??
  Deno.env.get("SUPABASE_ANON_KEY") ??
  requireEnv("SUPABASE_PUBLISHABLE_KEY");

/** Service-role admin client — schema zapp, sem auth do caller. */
// deno-lint-ignore no-explicit-any
export function createZappAdminClient(): SupabaseClient<any, "zapp"> {
  // deno-lint-ignore no-explicit-any
  return createClient<any, "zapp">(SUPABASE_URL(), SERVICE_ROLE_KEY(), {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "zapp" },
  });
}

/** Caller-authenticated client — schema zapp, JWT do header Authorization. */
// deno-lint-ignore no-explicit-any
export function createZappClient(req: Request): SupabaseClient<any, "zapp"> {
  const authHeader = req.headers.get("Authorization") ?? "";
  // Dim-10: propaga W3C traceparent do request de entrada para rastreabilidade distribuída
  const traceparent = req.headers.get("traceparent") ?? generateTraceparent();
  // deno-lint-ignore no-explicit-any
  return createClient<any, "zapp">(SUPABASE_URL(), ANON_KEY(), {
    global: { headers: { Authorization: authHeader, traceparent } },
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "zapp" },
  });
}

/** Gera W3C traceparent: `00-{32hex}-{16hex}-01`. */
export function generateTraceparent(): string {
  const traceId = crypto.randomUUID().replace(/-/g, '');
  const randBytes = crypto.getRandomValues(new Uint8Array(8));
  const spanId = Array.from(randBytes).map((b: number) => b.toString(16).padStart(2, '0')).join('');
  return `00-${traceId}-${spanId}-01`;
}
