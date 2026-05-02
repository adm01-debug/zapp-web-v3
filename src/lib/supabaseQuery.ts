import { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export class SupabaseQueryError extends Error {
  constructor(
    message: string,
    public readonly code: string | undefined,
    public readonly details: string | undefined,
    public readonly hint: string | undefined
  ) {
    super(message);
    this.name = 'SupabaseQueryError';
  }

  static from(error: PostgrestError, context?: string): SupabaseQueryError {
    const prefix = context ? \`[\${context}] \` : '';
    return new SupabaseQueryError(
      \`\${prefix}\${error.message}\`,
      error.code,
      error.details,
      error.hint
    );
  }
}

/**
 * Wraps a Supabase query with proper error handling.
 * Throws SupabaseQueryError on failure instead of silently returning null.
 *
 * @example
 * const data = await safeQuery(
 *   supabase.from('profiles').select('*').eq('id', userId),
 *   'fetchProfile'
 * );
 */
export async function safeQuery<T>(
  query: PromiseLike<{ data: T | null; error: PostgrestError | null }>,
  context?: string
): Promise<T> {
  const { data, error } = await query;
  if (error) {
    console.error(\`[Supabase] \${context || 'query'} failed:\`, error);
    throw SupabaseQueryError.from(error, context);
  }
  return data as T;
}

/**
 * Same as safeQuery but returns null instead of throwing on not-found.
 */
export async function safeQueryOrNull<T>(
  query: PromiseLike<{ data: T | null; error: PostgrestError | null }>,
  context?: string
): Promise<T | null> {
  const { data, error } = await query;
  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    console.error(\`[Supabase] \${context || 'query'} failed:\`, error);
    throw SupabaseQueryError.from(error, context);
  }
  return data;
}
