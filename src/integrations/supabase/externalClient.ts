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
let EXTERNAL_URL = config.url;
let EXTERNAL_ANON_KEY = config.key;

// No fallback to local keys to avoid accidental writes to internal during dev
export let isExternalConfigured = Boolean(EXTERNAL_URL && EXTERNAL_ANON_KEY);

export let externalSupabase: SupabaseClient | null = isExternalConfigured
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

/**
 * Updates the external client at runtime.
 * Useful when credentials are changed in the Admin Connections UI
 * without needing a full redeploy.
 */
export function updateRuntimeExternalConfig(url: string, key: string) {
  if (!url || !key) return;
  
  EXTERNAL_URL = url;
  EXTERNAL_ANON_KEY = key;
  isExternalConfigured = true;
  
  // Re-create the client instance
  (externalSupabase as any) = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        'x-client-info': 'zapp-web-external-client-runtime',
      },
    },
  });
  
  console.log('[externalClient] Runtime config updated successfully');
}

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

