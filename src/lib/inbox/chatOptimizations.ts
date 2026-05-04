import { Message } from '@/hooks/useMessages';

/**
 * Chat performance optimization utilities.
 * Includes incremental loading logic and windowing helpers.
 */

export const BATCH_SIZE = 50;

/**
 * Checks if the scroll is near the top to trigger historical load.
 */
export const isNearTop = (scrollTop: number, threshold = 100) => {
  return scrollTop <= threshold;
};

/**
 * Checks if the scroll is at the bottom to maintain auto-scroll.
 */
export const isAtBottom = (scrollHeight: number, scrollTop: number, clientHeight: number, threshold = 100) => {
  return scrollHeight - scrollTop <= clientHeight + threshold;
};

/**
 * Simple message deduplication by message_id or ID.
 */
export const deduplicateMessages = (existing: Message[], incoming: Message[]) => {
  const existingIds = new Set(existing.map(m => m.message_id || m.id));
  return incoming.filter(m => !existingIds.has(m.message_id || m.id));
};
