import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { supabase as internalSupabase } from './client';

// O Supabase interno (Managed by Lovable)
// Re-exportamos para compatibilidade se necessário, mas preferimos usar o do client.ts
export const supabase = internalSupabase;

// O Supabase externo (Self-hosted)
// Estas variáveis devem ser configuradas no Lovable Secrets
const EXTERNAL_URL = import.meta.env.VITE_EXTERNAL_SUPABASE_URL;
const EXTERNAL_ANON_KEY = import.meta.env.VITE_EXTERNAL_SUPABASE_ANON_KEY;


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
