/**
 * External Supabase Client — FATOR X (Self-hosted VPS)
 *
 * Connects to the self-hosted Supabase on supabase.atomicabr.com.br
 * which holds the full `evolution_*` domain (contacts, messages,
 * conversations, calls, deals, BPM, AI agents).
 *
 * Uses environment variables for configuration.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const EXTERNAL_SUPABASE_URL = import.meta.env.VITE_EXTERNAL_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
const EXTERNAL_SUPABASE_ANON_KEY = import.meta.env.VITE_EXTERNAL_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isExternalConfigured = Boolean(EXTERNAL_SUPABASE_URL && EXTERNAL_SUPABASE_ANON_KEY);

export const externalSupabase: SupabaseClient | null = isExternalConfigured
  ? createClient(EXTERNAL_SUPABASE_URL!, EXTERNAL_SUPABASE_ANON_KEY!, {
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

export function getExternalSupabase(): SupabaseClient | null {
  if (!externalSupabase && !warned) {
    warned = true;
    console.warn(
      '[externalClient] External Supabase not configured. Set VITE_EXTERNAL_SUPABASE_URL and VITE_EXTERNAL_SUPABASE_ANON_KEY.',
    );
  }
  return externalSupabase;
}
