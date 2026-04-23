/**
 * Stable idempotency key per outbound message.
 *
 * Used by `messageSender.ts` and the DLQ reprocessor so all retries of the
 * same logical send (network glitch, manual resend, cron-driven reprocess)
 * collapse to the same `Idempotency-Key` on the Evolution proxy.
 *
 * Format: `msg:<messageRowId>` — short, deterministic, traceable. The proxy
 * accepts any string between 8–200 chars.
 */
export function buildSendIdempotencyKey(messageRowId: string): string {
  return `msg:${messageRowId}`;
}
