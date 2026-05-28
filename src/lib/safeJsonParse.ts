/**
 * Parse JSON without throwing. Returns `fallback` when input is null/invalid.
 * Use for reading persisted state (localStorage etc.) where the stored value
 * may be corrupt — a thrown SyntaxError inside a lazy useState initializer
 * crashes the component render.
 */
export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
