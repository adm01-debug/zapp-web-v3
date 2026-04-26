/**
 * Shared contract for the *mapped* message-status payload that the
 * `useMessageStatus` hook produces and the inbox UI consumes.
 *
 * Goals:
 *  - One single source of truth for the `MessageStatusDetail` shape used by
 *    `getMessageStatusDetail` (hook return) and by the `MessageStatus` /
 *    `MessageStatusInline` components (UI badge `detail` prop).
 *  - Keep the DB-row shape (`MessageStatusDbRow`) explicit so the realtime
 *    handler and the initial fetcher cannot drift.
 *
 * Naming:
 *  - `MessageUIStatus`            — the union of UI-visible statuses.
 *  - `MessageStatusDbRow`         — what `useMessageStatus` stores per id
 *                                   after mapping the DB row.
 *  - `MessageStatusDetail`        — the rich, merged result returned by
 *                                   `getMessageStatusDetail` (DB ⊕ bus).
 *  - `MessageStatusDetailFields`  — the same payload WITHOUT `status`,
 *                                   matching the `<MessageStatus detail>`
 *                                   prop on the badge component.
 */

import type { SendUIStatus } from '@/hooks/realtime/sendStatusBus';

/**
 * Union of statuses the UI knows how to render.
 *
 * Superset of `SendUIStatus` (in-memory bus) plus persisted-only states
 * that never originate from the bus: `pending` (queued, not yet sending),
 * `delivered`, `read`, `played`.
 */
export type MessageUIStatus =
  | SendUIStatus
  | 'pending'
  | 'delivered'
  | 'read'
  | 'played';

/**
 * Mapped DB row stored in the hook's internal `Map<id, …>` cache.
 * Mirrors the columns selected from `messages` in `useMessageStatus`.
 */
export interface MessageStatusDbRow {
  id: string;
  status: MessageUIStatus;
  status_updated_at: string;
  error_code?: string | null;
  error_reason?: string | null;
}

/**
 * Sub-payload describing *details* of a status (attempts + error info).
 *
 * Exposed separately from `MessageStatusDetail` because the badge component
 * receives `status` as its own prop and only needs the extra fields here.
 * This is what `<MessageStatus detail={…}>` accepts.
 */
export interface MessageStatusDetailFields {
  /** 1-based attempt number for transient `retrying` states. */
  attempt?: number;
  /** Configured retry budget (e.g. 3). */
  totalRetries?: number;
  /** Stable error code (`'auth_failed'`, `401`, …). */
  errorCode?: string | number;
  /** Human-readable error reason (already trimmed by the producer). */
  errorReason?: string;
}

/**
 * Full payload returned by `useMessageStatus().getMessageStatusDetail(id)`.
 * `status` is mandatory; the remaining detail fields are optional and may
 * come from the in-memory bus or the persisted DB row (bus wins on tie).
 */
export interface MessageStatusDetail extends MessageStatusDetailFields {
  status: MessageUIStatus;
}
