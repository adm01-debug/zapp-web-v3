/**
 * Typed Supabase query helpers to reduce `as any` usage.
 *
 * Provides type-safe wrappers for common Supabase operations
 * that would otherwise require `as any` casts due to the
 * generated types not covering all edge cases.
 */

import { supabase } from '@/integrations/supabase/client';
import { log } from '@/lib/logger';

type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

/**
 * Safely fetches a single row by ID with error handling.
 * Eliminates the need for `as any` when the caller knows the expected type.
 */
export async function fetchById<T extends Record<string, unknown>>(
  table: string,
  id: string,
  select = '*',
): Promise<T | null> {
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    log.error(`[DB] Failed to fetch ${table}/${id}:`, error);
    return null;
  }

  return data as T | null;
}

/**
 * Safely upserts a record with conflict resolution.
 */
export async function upsertRecord<T extends Record<string, unknown>>(
  table: string,
  record: Record<string, Json>,
  conflictColumns: string[] = ['id'],
): Promise<T | null> {
  const { data, error } = await supabase
    .from(table)
    .upsert(record, { onConflict: conflictColumns.join(',') })
    .select()
    .maybeSingle();

  if (error) {
    log.error(`[DB] Failed to upsert ${table}:`, error);
    return null;
  }

  return data as T | null;
}

/**
 * Batch insert with chunking to avoid Supabase payload limits.
 * Splits large arrays into chunks of `chunkSize` (default 500).
 */
export async function batchInsert(
  table: string,
  records: Record<string, Json>[],
  chunkSize = 500,
): Promise<{ inserted: number; errors: number }> {
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).insert(chunk);

    if (error) {
      log.error(`[DB] Batch insert chunk ${Math.floor(i / chunkSize)} failed:`, error);
      errors += chunk.length;
    } else {
      inserted += chunk.length;
    }
  }

  return { inserted, errors };
}

/**
 * Count rows matching a filter without fetching data.
 * More efficient than fetching all rows and counting.
 */
export async function countRows(
  table: string,
  filters?: Record<string, string | number | boolean | null>,
): Promise<number> {
  let query = supabase.from(table).select('id', { count: 'exact', head: true });

  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (value === null) {
        query = query.is(key, null);
      } else {
        query = query.eq(key, value);
      }
    }
  }

  const { count, error } = await query;
  if (error) {
    log.error(`[DB] Count failed for ${table}:`, error);
    return 0;
  }

  return count ?? 0;
}
