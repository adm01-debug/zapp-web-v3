import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// O Supabase interno (Managed by Lovable)
const INTERNAL_URL = import.meta.env.VITE_SUPABASE_URL;
const INTERNAL_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// O Supabase externo (Self-hosted)
// Estas variáveis devem ser configuradas no Lovable Secrets
const EXTERNAL_URL = import.meta.env.VITE_EXTERNAL_SUPABASE_URL;
const EXTERNAL_ANON_KEY = import.meta.env.VITE_EXTERNAL_SUPABASE_ANON_KEY;

if (!INTERNAL_URL || !INTERNAL_ANON_KEY) {
  throw new Error('Supabase Interno não configurado corretamente.');
}

export const supabase = createClient<Database>(INTERNAL_URL, INTERNAL_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Cliente para o Supabase Externo (Self-hosted)
// Se as variáveis externas existirem, criamos o cliente
export const externalSupabase = EXTERNAL_URL && EXTERNAL_ANON_KEY 
  ? createClient<Database>(EXTERNAL_URL, EXTERNAL_ANON_KEY, {
      auth: {
        persistSession: false, // Geralmente não queremos persistir sessão do externo no mesmo local do interno
      }
    })
  : null;

/**
 * Hook ou utilitário para decidir qual cliente usar.
 * Se houver um externo configurado, ele pode ser o padrão para certas operações.
 */
export const getChatSupabase = () => {
  if (externalSupabase) {
    return externalSupabase;
  }
  return supabase;
};
