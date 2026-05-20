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
 * Collapse `//` duplicates and resolve `.` / `..` segments in a path.
 * Preserves leading slash (when present) and never produces an empty string —
 * an empty result is normalized to the matching root (`/` or `.`).
 */
function normalizePathSegments(path: string): string {
  if (!path) return '';
  const isAbsolute = path.startsWith('/');
  const segments = path.split('/');
  const out: string[] = [];
  for (const seg of segments) {
    if (seg === '' || seg === '.') continue; // collapses `//` and `./`
    if (seg === '..') {
      if (out.length > 0 && out[out.length - 1] !== '..') out.pop();
      else if (!isAbsolute) out.push('..'); // can't go above root for absolute
      continue;
    }
    out.push(seg);
  }
  const joined = out.join('/');
  if (isAbsolute) return '/' + joined;
  return joined || '.';
}

/**
 * Strip ALL trailing slashes from a path, keeping at least the root marker.
 * `/a///` → `/a`, `/` → `/`, `a/` → `a`, `` → ``.
 */
function stripTrailingSlashes(path: string): string {
  if (path.length <= 1) return path;
  let end = path.length;
  while (end > 1 && path[end - 1] === '/') end--;
  return path.slice(0, end);
}

/**
 * Canonicalize a query string. Treats every "empty-effective" query as
 * absent: `?`, `?&`, `?=`, `?&&`, `?  ` all collapse to no query at all.
 * Keys are sorted; entries with empty key are dropped; `?a=` (explicit
 * empty value) is preserved as `a=` to remain distinct from `?a` (no `=`).
 */
function canonicalizeQueryString(query: string | undefined): string {
  if (!query) return '';
  const entries: Array<[string, string, boolean]> = [];
  for (const kv of query.split('&')) {
    if (!kv) continue;
    const eq = kv.indexOf('=');
    const hasEq = eq !== -1;
    const k = (hasEq ? kv.slice(0, eq) : kv).trim();
    const v = hasEq ? kv.slice(eq + 1) : '';
    if (!k) continue; // drops `=value`, `=`, etc.
    entries.push([k, v, hasEq]);
  }
  if (!entries.length) return '';
  entries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return '?' + entries.map(([k, v, hasEq]) => (hasEq ? `${k}=${v}` : k)).join('&');
}

/**
 * Normalize an endpoint string so trivial differences don't dodge dedupe:
 *  - trim whitespace, drop the URL fragment (#...)
 *  - lowercase the host (case-insensitive per RFC) but preserve path case
 *  - collapse `//` duplicates and resolve `.` / `..` segments
 *  - remove every trailing slash from the path (root `/` preserved)
 *  - sort query params alphabetically; drop empty-effective queries (`?`, `?&`, `?=`)
 *  - preserve explicit empty value (`?a=`) as distinct from missing `=` (`?a`)
 *
 * Works for absolute URLs and relative paths (with or without leading slash)
 * alike. Two semantically equivalent endpoints always map to the same string.
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
    let pathname = normalizePathSegments(u.pathname || '/');
    pathname = stripTrailingSlashes(pathname);
    if (!pathname) pathname = '/';
    const params = Array.from(u.searchParams.entries())
      .filter(([k]) => k !== '')
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    const search = params.length
      ? '?' + params.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
      : '';
    return `${u.protocol}//${u.host}${pathname}${search}`;
  } catch {
    // Relative path — handle manually.
    const noHash = raw.split('#')[0];
    const qIdx = noHash.indexOf('?');
    const pathPart = qIdx === -1 ? noHash : noHash.slice(0, qIdx);
    const queryPart = qIdx === -1 ? '' : noHash.slice(qIdx + 1);
    let path = normalizePathSegments(pathPart);
    path = stripTrailingSlashes(path);
    const search = canonicalizeQueryString(queryPart);
    return `${path}${search}`;
  }
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
