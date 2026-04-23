/**
 * Robustly extract the WhatsApp/Evolution message id from a send response.
 *
 * Evolution API has slightly inconsistent response shapes across endpoints
 * (`/message/sendText`, `/message/sendMedia`, `/message/sendWhatsAppAudio`,
 * `/message/sendSticker`) and across versions. This helper walks every known
 * location so that a failed retry can still correlate to the same message via
 * `external_id`, instead of inserting a duplicate row.
 *
 * Known shapes seen in the wild:
 *   { key: { id: "..." } }                        // sendText (v2)
 *   { messageId: "..." }                          // some v1 builds
 *   { id: "..." }                                 // sendSticker (rare)
 *   { keyId: "..." }                              // alt casing
 *   { message: { key: { id: "..." } } }           // sendWhatsAppAudio
 *   { response: { key: { id: "..." } } }          // proxied error/success
 *   { data: { key: { id: "..." } } }              // wrapped envelope
 *   { key: { remoteJid, id } }                    // standard Baileys key
 *
 * Returns the first non-empty string found, or `null` when nothing matches.
 */
export function extractEvolutionMessageId(response: unknown): string | null {
  if (!response || typeof response !== 'object') return null;

  const candidates: unknown[] = [];
  const r = response as Record<string, unknown>;

  // Direct top-level fields
  candidates.push(
    (r.key as Record<string, unknown> | undefined)?.id,
    r.messageId,
    r.keyId,
    r.id,
  );

  // One level of nesting commonly used by media/audio/sticker endpoints
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
      // Two levels deep: sendWhatsAppAudio sometimes returns
      // `{ message: { message: { key: { id } } } }` on retries.
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
