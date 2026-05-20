/**
 * Fallback for `fetch-profile` when Evolution v2.3.7 `/profile/fetchProfile`
 * returns 404 (or empty payload). Reads the same data via
 * `/instance/fetchInstances?instanceName={X}` and maps it into the canonical
 * profile shape returned by the primary endpoint.
 *
 * The mapping mirrors the contract documented in
 * `mem://integrations/evolution-api`:
 *
 *   fetchInstances row             →  fetchProfile shape
 *   ─────────────────────────────────────────────────────
 *   instance.ownerJid              →  wuid
 *   instance.profileName           →  name
 *   instance.profilePicUrl         →  picture
 *   instance.profileStatus         →  status: { status }
 *
 * The returned object is tagged with `_source: "fetchInstances-fallback"` so
 * downstream consumers can distinguish primary vs. fallback data without
 * having to compare shapes.
 *
 * Pure function: no side effects, no network. The caller is responsible for
 * fetching the upstream `/instance/fetchInstances` payload and passing it in.
 */

export interface ProfileFallbackResult {
  wuid: string | null;
  name: string | null;
  picture: string | null;
  status: { status: string } | null;
  _source: 'fetchInstances-fallback';
}

/**
 * Map a `/instance/fetchInstances` payload to the canonical
 * `/profile/fetchProfile` shape, scoped to a specific instance.
 *
 * Accepts the upstream payload in any of the historical shapes that
 * `fetchInstances` is known to emit:
 *   - Array of `{ instance: { ... } }`   (Evolution v2.x default)
 *   - Array of bare instance objects     (some forks/proxies)
 *   - Object `{ instance: { ... } }` for single-instance queries
 *   - Object with `data: [...]` wrapper  (some proxies/CDN)
 *
 * Returns `null` when the payload is empty / no matching instance is found.
 */
export function mapFetchInstancesToProfile(
  data: unknown,
  instanceName: string,
): ProfileFallbackResult | null {
  if (!data) return null;

  // Unwrap proxy `{ data: [...] }` style.
  let candidates: unknown[];
  if (Array.isArray(data)) {
    candidates = data;
  } else if (typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.data)) candidates = d.data as unknown[];
    else if (Array.isArray(d.instance)) candidates = d.instance as unknown[];
    else candidates = [d];
  } else {
    return null;
  }

  if (candidates.length === 0) return null;

  const matchInstance = (raw: unknown): Record<string, unknown> | null => {
    if (!raw || typeof raw !== 'object') return null;
    const obj = raw as Record<string, unknown>;
    // `instance.instanceName` (Evolution v2 default) or top-level.
    const inner = (obj.instance && typeof obj.instance === 'object' && !Array.isArray(obj.instance))
      ? obj.instance as Record<string, unknown>
      : obj;
    const name = String(inner.instanceName ?? inner.name ?? '');
    return name === instanceName ? inner : null;
  };

  // Prefer exact instanceName match; fall back to first candidate when only
  // one instance was returned (single-instance query).
  let target: Record<string, unknown> | null = null;
  for (const c of candidates) {
    const m = matchInstance(c);
    if (m) { target = m; break; }
  }
  if (!target && candidates.length === 1) {
    const only = candidates[0];
    if (only && typeof only === 'object') {
      const obj = only as Record<string, unknown>;
      target = (obj.instance && typeof obj.instance === 'object' && !Array.isArray(obj.instance))
        ? obj.instance as Record<string, unknown>
        : obj;
    }
  }
  if (!target) return null;

  const ownerJid = typeof target.ownerJid === 'string' ? target.ownerJid : null;
  const profileName = typeof target.profileName === 'string' ? target.profileName : null;
  const profilePicUrl = typeof target.profilePicUrl === 'string' ? target.profilePicUrl : null;
  const profileStatus = typeof target.profileStatus === 'string' ? target.profileStatus : null;

  // If literally every field is null, the instance exists but has no profile
  // info populated — treat as "no profile".
  if (!ownerJid && !profileName && !profilePicUrl && !profileStatus) return null;

  return {
    wuid: ownerJid,
    name: profileName,
    picture: profilePicUrl,
    status: profileStatus ? { status: profileStatus } : null,
    _source: 'fetchInstances-fallback',
  };
}

/**
 * Decide if the primary `/profile/fetchProfile` response should trigger the
 * fallback. Centralizes the decision so the handler stays small.
 *
 * Returns true when the proxy envelope reports an upstream 404/410/501,
 * payload-level "not found", or an empty payload that the primary endpoint
 * is known to emit on v2.3.7 when the route is missing.
 */
export function shouldFallbackForProfile(envelope: unknown): boolean {
  if (!envelope || typeof envelope !== 'object') return false;
  const env = envelope as Record<string, unknown>;
  if (env.error === true) {
    const status = Number(env.status);
    if (status === 404 || status === 405 || status === 410 || status === 501) return true;
    const msg = String(env.message ?? '').toLowerCase();
    if (msg.includes('not found') || msg.includes('cannot get') || msg.includes('cannot post')) return true;
    if (msg.includes('not implemented') || msg.includes('method not allowed')) return true;
  }
  // Empty-object envelope (just `{ version: N }`) — primary returned nothing
  // useful. Trigger the fallback as a recovery attempt.
  const meaningfulKeys = Object.keys(env).filter((k) => k !== 'version');
  if (meaningfulKeys.length === 0) return true;
  return false;
}
