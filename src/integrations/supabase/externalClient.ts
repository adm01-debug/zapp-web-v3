/**
 * External Supabase Client — FATOR X (Self-hosted VPS)
 *
 * Connects to the self-hosted Supabase (Self-hosted VPS)
 * which holds the full `evolution_*` domain (contacts, messages,
 * conversations, etc).
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const APP_ENV = (import.meta.env.VITE_APP_ENV || 'production') as 'development' | 'staging' | 'production';

const getEnvConfig = () => {
  switch (APP_ENV) {
    case 'development':
      return {
        url: import.meta.env.VITE_DEV_EXTERNAL_SUPABASE_URL || import.meta.env.VITE_EXTERNAL_SUPABASE_URL,
        key: import.meta.env.VITE_DEV_EXTERNAL_SUPABASE_ANON_KEY || import.meta.env.VITE_EXTERNAL_SUPABASE_ANON_KEY,
      };
    case 'staging':
      return {
        url: import.meta.env.VITE_STAGING_EXTERNAL_SUPABASE_URL || import.meta.env.VITE_EXTERNAL_SUPABASE_URL,
        key: import.meta.env.VITE_STAGING_EXTERNAL_SUPABASE_ANON_KEY || import.meta.env.VITE_EXTERNAL_SUPABASE_ANON_KEY,
      };
    default:
      return {
        url: import.meta.env.VITE_EXTERNAL_SUPABASE_URL,
        key: import.meta.env.VITE_EXTERNAL_SUPABASE_ANON_KEY,
      };
  }
};

const config = getEnvConfig();
const EXTERNAL_URL = config.url;
const EXTERNAL_ANON_KEY = config.key;

// No fallback to local keys to avoid accidental writes to internal during dev
export const isExternalConfigured = Boolean(EXTERNAL_URL && EXTERNAL_ANON_KEY);

export const externalSupabase: SupabaseClient | null = isExternalConfigured
  ? createClient(EXTERNAL_URL!, EXTERNAL_ANON_KEY!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          'x-client-info': 'zapp-web-external-client',
        },
      },
    })
  : null;

let warned = false;

export function getExternalSupabase(): SupabaseClient | null {
  if (!externalSupabase && !warned) {
    warned = true;
    console.warn(
      '[externalClient] Supabase Externo não configurado. Verifique VITE_EXTERNAL_SUPABASE_URL e VITE_EXTERNAL_SUPABASE_ANON_KEY.',
    );
  }
  return externalSupabase;
}

