/**
 * External Supabase Client — FATOR X (tdprnylgyrogbbhgdoik)
 *
 * Connects to the external CRM/WhatsApp database that holds the full
 * `evolution_*` domain (contacts, messages, conversations, calls, deals).
 *
 * Uses environment variables:
 *   VITE_EXTERNAL_SUPABASE_URL
 *   VITE_EXTERNAL_SUPABASE_ANON_KEY
 *
 * IMPORTANT: When env vars are absent (e.g. in a fresh preview), the inbox
 * falls back to the server-side `external-db-proxy` edge function (which
 * uses service-role secrets). For that reason this module **never throws**
 * on import — consumers must check `isExternalConfigured` before using
 * `externalSupabase` directly, or use `getExternalSupabase()` which now
 * returns `null` instead of throwing.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const EXTERNAL_SUPABASE_URL = import.meta.env.VITE_EXTERNAL_SUPABASE_URL || '';
const EXTERNAL_SUPABASE_ANON_KEY = import.meta.env.VITE_EXTERNAL_SUPABASE_ANON_KEY || '';

export const isExternalConfigured = Boolean(EXTERNAL_SUPABASE_URL && EXTERNAL_SUPABASE_ANON_KEY);

export const externalSupabase: SupabaseClient | null = isExternalConfigured
  ? createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          'x-client-info': 'zapp-web-external-360',
        },
      },
    })
  : null;

let warned = false;

/**
 * Returns the external client or `null` if env vars are missing.
 * Consumers MUST handle the null case (typically by routing through
 * the `external-db-proxy` edge function or skipping a realtime subscribe).
 *
 * Historically this used to throw — that crashed the entire inbox at
 * module load when consumers initialized the client at import time.
 * It is now safe to call from any context.
 */
export function getExternalSupabase(): SupabaseClient | null {
  if (!externalSupabase && !warned) {
    warned = true;
    // eslint-disable-next-line no-console
    console.warn(
      '[externalClient] FATOR X env vars missing — falling back to server-side proxy. ' +
      'Set VITE_EXTERNAL_SUPABASE_URL and VITE_EXTERNAL_SUPABASE_ANON_KEY to enable direct realtime.',
    );
  }
  return externalSupabase;
}
