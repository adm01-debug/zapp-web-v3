/**
 * Build a stable cross-tab dedupe key per request.
 *
 * Combines endpoint + HTTP method + body into a canonical hash so that two
 * tabs firing the *same* logical request collapse on `crossTabDedupe`. When
 * the caller supplies an `Idempotency-Key`, it wins outright — that key
 * already encodes the caller's intent and matches what the server uses
 * for dedupe, so we mirror it verbatim (after normalization).
 *
 * Why this exists
 * ---------------
 * `crossTabSendDedupe` is keyed by an opaque string. Today the only call
 * site uses `send:<idempotencyKey>`, which is fine for outbound WhatsApp
 * messages but doesn't generalize to other requests (telemetry posts,
 * profile updates, etc.). This util gives every call site a uniform way
 * to derive that key without re-implementing canonicalization.
 *
 * Output format
 * -------------
 *   - With idempotency key: `req:idem:<normalized-key>`
 *   - Without:              `req:h:<24-hex>` (sha256 of canonical payload)
 *
 * Both forms are short, log-safe, and fit inside any `Idempotency-Key`
 * header window.
 */
import { stableStringify, sha256Hex, normalizeIdempotencyKey } from '@/lib/idempotency';

export interface RequestDedupeInput {
  endpoint: string;
  method: string;
  body?: unknown;
  /** Raw caller/system idempotency key — normalized internally. */
  idempotencyKey?: string;
}

const METHODS_WITHOUT_BODY = new Set(['GET', 'HEAD', 'OPTIONS']);

/** True when the HTTP method semantically carries a body for dedupe purposes. */
export function shouldIncludeBody(method: string): boolean {
  return !METHODS_WITHOUT_BODY.has(method.trim().toUpperCase());
}

/**
 * Normalize an endpoint string so trivial differences don't dodge dedupe:
 *  - trim whitespace
 *  - lowercase the host (case-insensitive per RFC) but preserve path case
 *  - drop the URL fragment (#...)
 *  - sort query params alphabetically
 *  - remove a single trailing slash from the path (but keep root "/")
 *
 * Works for absolute URLs and relative paths alike.
 */
export function normalizeEndpoint(endpoint: string): string {
  const raw = (endpoint ?? '').trim();
  if (!raw) return '';

  // Try absolute URL first.
  try {
    const u = new URL(raw);
    u.hash = '';
    u.host = u.host.toLowerCase();
    u.protocol = u.protocol.toLowerCase();
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.slice(0, -1);
    }
    const params = Array.from(u.searchParams.entries()).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    );
    const search = params.length
      ? '?' + params.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
      : '';
    return `${u.protocol}//${u.host}${u.pathname}${search}`;
  } catch {
    // Relative path — handle manually.
    const noHash = raw.split('#')[0];
    const [pathPart, queryPart] = noHash.split('?', 2);
    let path = pathPart;
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    if (!queryPart) return path;
    const sorted = queryPart
      .split('&')
      .filter(Boolean)
      .map((kv) => {
        const eq = kv.indexOf('=');
        return eq === -1 ? [kv, ''] : [kv.slice(0, eq), kv.slice(eq + 1)];
      })
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .map(([k, v]) => (v === '' && !kv_hasEq(kv_for(queryPart, k)) ? k : `${k}=${v}`))
      .join('&');
    return sorted ? `${path}?${sorted}` : path;
  }
}

// Tiny helpers used only inside the relative-path branch above. Kept private.
function kv_for(query: string, key: string): string {
  const found = query.split('&').find((kv) => kv === key || kv.startsWith(key + '='));
  return found ?? key;
}
function kv_hasEq(kv: string): boolean {
  return kv.includes('=');
}

/**
 * Build the dedupe key. Async because it relies on `sha256Hex` (SubtleCrypto
 * with a deterministic fallback for SSR/jsdom).
 */
export async function buildRequestDedupeKey(input: RequestDedupeInput): Promise<string> {
  const normalizedIdem = normalizeIdempotencyKey(input.idempotencyKey);
  if (normalizedIdem) return `req:idem:${normalizedIdem}`;

  const method = (input.method ?? 'GET').trim().toUpperCase() || 'GET';
  const endpoint = normalizeEndpoint(input.endpoint);
  const includeBody = shouldIncludeBody(method);

  const payload = stableStringify({
    m: method,
    e: endpoint,
    b: includeBody ? (input.body ?? null) : null,
  });
  const hash = await sha256Hex(payload);
  return `req:h:${hash.slice(0, 24)}`;
}
