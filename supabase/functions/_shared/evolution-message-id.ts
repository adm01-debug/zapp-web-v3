/**
 * Robustly extract the WhatsApp/Evolution message id from a send response.
 * See `src/lib/evolutionMessageId.ts` for the rationale and the list of
 * known response shapes. Kept in sync intentionally — Deno edge functions
 * cannot import from `src/`.
 */
export function extractEvolutionMessageId(response: unknown): string | null {
  if (!response || typeof response !== 'object') return null;

  const candidates: unknown[] = [];
  const r = response as Record<string, unknown>;

  candidates.push(
    (r.key as Record<string, unknown> | undefined)?.id,
    r.messageId,
    r.keyId,
    r.id,
  );

  const nestedKeys = ['message', 'response', 'data', 'result'] as const;
  for (const k of nestedKeys) {
    const inner = r[k] as Record<string, unknown> | undefined;
    if (inner && typeof inner === 'object') {
      candidates.push(
        (inner.key as Record<string, unknown> | undefined)?.id,
        inner.messageId,
        inner.keyId,
        inner.id,
      );
      const inner2 = inner.message as Record<string, unknown> | undefined;
      if (inner2 && typeof inner2 === 'object') {
        candidates.push(
          (inner2.key as Record<string, unknown> | undefined)?.id,
          inner2.messageId,
          inner2.id,
        );
      }
    }
  }

  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().length > 0) return c.trim();
  }
  return null;
}
