/**
 * External Supabase Client — FATOR X (Self-hosted VPS)
 *
 * Connects to the self-hosted Supabase on supabase.atomicabr.com.br
 * which holds the full `evolution_*` domain (contacts, messages,
 * conversations, calls, deals, BPM, AI agents).
 *
 * Priority: env vars > hardcoded self-hosted URL
 * This ensures it works both in Lovable preview and production.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Self-hosted Supabase on VPS AtomicaBR
const SELF_HOSTED_URL = 'https://supabase.atomicabr.com.br';
const SELF_HOSTED_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzE1MDUwODAwLAogICJleHAiOiAxODcyODE3MjAwCn0.rvamc0XHuSCYB1glBwOCCxgfd9yxWVYLnhFzg5-7TRk';

// Env vars override hardcoded values (for flexibility)
const EXTERNAL_SUPABASE_URL = import.meta.env.VITE_EXTERNAL_SUPABASE_URL || SELF_HOSTED_URL;
const EXTERNAL_SUPABASE_ANON_KEY = import.meta.env.VITE_EXTERNAL_SUPABASE_ANON_KEY || SELF_HOSTED_ANON_KEY;

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
 * Returns the external client or `null` if configuration is missing.
 * With hardcoded self-hosted URL, this should always return a valid client.
 * Consumers MUST still handle the null case for safety.
 */
export function getExternalSupabase(): SupabaseClient | null {
  if (!externalSupabase && !warned) {
    warned = true;
    console.warn(
      '[externalClient] FATOR X config missing — this should not happen with hardcoded fallback. ' +
      'Check SELF_HOSTED_URL and SELF_HOSTED_ANON_KEY.',
    );
  }
  return externalSupabase;
}
