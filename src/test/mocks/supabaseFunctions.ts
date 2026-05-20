/**
 * Typed mock factory for `supabase.functions.invoke`.
 *
 * Mirrors the real Supabase JS contract so tests get autocomplete/type-checking
 * on `opts.body`, `opts.method`, `opts.headers` and on the resolved
 * `{ data, error }` shape — eliminating the need for `any` casts and
 * preventing TS2339 errors when accessing properties like `result.success`
 * that don't actually exist on the response envelope.
 *
 * Usage:
 *   import { createInvokeMock, type InvokeResponse } from '@/test/mocks/supabaseFunctions';
 *
 *   const invoke = createInvokeMock<{ connections: Connection[] }>();
 *   invoke.mockResolvedValue({ data: { connections: [] }, error: null });
 *
 *   vi.mock('@/integrations/supabase/client', () => ({
 *     supabase: { functions: { invoke } },
 *   }));
 */

import { vi, type Mock } from 'vitest';

/** Options accepted by `supabase.functions.invoke(name, opts)`. */
export interface InvokeOptions<TBody = unknown> {
  body?: TBody;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
}

/** Envelope returned by `supabase.functions.invoke`. */
export interface InvokeResponse<TData = unknown> {
  data: TData | null;
  error: { message: string; name?: string; status?: number } | null;
}

/** Full signature — the function name plus the typed options object. */
export type InvokeFn<TData = unknown, TBody = unknown> = (
  functionName: string,
  opts?: InvokeOptions<TBody>,
) => Promise<InvokeResponse<TData>>;

/** Vitest `Mock` wrapping the typed signature. */
export type InvokeMock<TData = unknown, TBody = unknown> = Mock<InvokeFn<TData, TBody>>;

/**
 * Creates a fresh typed mock of `supabase.functions.invoke`. Default resolves
 * to `{ data: null, error: null }` so a test that forgets to override doesn't
 * crash on `.data` access.
 */
export function createInvokeMock<TData = unknown, TBody = unknown>(): InvokeMock<TData, TBody> {
  const fn = vi.fn() as InvokeMock<TData, TBody>;
  fn.mockResolvedValue({ data: null, error: null });
  return fn;
}

/** Convenience builder for a successful response. */
export function ok<TData>(data: TData): InvokeResponse<TData> {
  return { data, error: null };
}

/** Convenience builder for a failed response. */
export function fail<TData = unknown>(message: string, status?: number): InvokeResponse<TData> {
  return { data: null, error: { message, status } };
}
