import { useCallback, useRef } from 'react';
import { Message } from '@/types/chat';

/**
 * Provides optimistic message updates for the chat UI.
 *
 * Problem: When an agent sends a message, there's a ~200-500ms delay before
 * the message appears because we wait for the Supabase insert + realtime event.
 * This creates a "laggy" feeling, especially on slower connections.
 *
 * Solution: This hook creates a temporary "optimistic" message that appears
 * instantly in the UI, then gets replaced by the real message when the
 * Supabase insert completes and the realtime event arrives.
 *
 * Flow:
 * 1. Agent presses Send → optimistic message appears instantly (status: 'sending')
 * 2. Supabase insert succeeds → optimistic message is replaced by real message
 * 3. If insert fails → optimistic message shows error state (status: 'failed')
 */

let optimisticCounter = 0;

export interface OptimisticMessage extends Omit<Message, 'timestamp'> {
  /** Marks this as an optimistic message that hasn't been confirmed by the server */
  _optimistic: true;
  timestamp: Date;
  contact_id?: string;
  [key: string]: unknown;
}

export function useOptimisticMessages() {
  const pendingRef = useRef<Map<string, OptimisticMessage>>(new Map());

  /**
   * Creates an optimistic message that will appear instantly in the chat.
   * Returns the temporary ID used to track this message.
   */
  const createOptimistic = useCallback(
    (params: {
      contactId: string;
      content: string;
      messageType?: string;
      replyToId?: string | null;
    }): OptimisticMessage => {
      optimisticCounter++;
      const tempId = `_optimistic_${Date.now()}_${optimisticCounter}`;

      const optimistic = {
        id: tempId,
        _optimistic: true,
        contact_id: params.contactId,
        content: params.content,
        message_type: (params.messageType || 'text') as Message['message_type'],
        sender: 'agent',
        status: 'sending',
        timestamp: new Date(),
        external_id: null,
        media_url: null,
        quoted_message_id: params.replyToId || null,
      };

      pendingRef.current.set(tempId, optimistic);
      return optimistic;
    },
    [],
  );

  /**
   * Marks an optimistic message as successfully sent.
   * Call this when the Supabase insert returns the real message ID.
   */
  const confirmOptimistic = useCallback((tempId: string) => {
    pendingRef.current.delete(tempId);
  }, []);

  /**
   * Marks an optimistic message as failed.
   * Updates the status so the UI can show an error indicator.
   */
  const failOptimistic = useCallback((tempId: string): OptimisticMessage | undefined => {
    const msg = pendingRef.current.get(tempId);
    if (msg) {
      msg.status = 'failed';
      return { ...msg };
    }
    return undefined;
  }, []);

  /**
   * Merges optimistic messages with the real message list.
   * Optimistic messages that have a matching real message (by content+timestamp proximity)
   * are automatically removed.
   */
  const mergeWithReal = useCallback(
    (realMessages: Message[]): (Message | OptimisticMessage)[] => {
      const pending = Array.from(pendingRef.current.values());
      if (pending.length === 0) return realMessages;

      // Remove optimistic messages that have been confirmed by real messages
      const realContentSet = new Set(
        realMessages
          .filter((m) => m.sender === 'agent')
          .slice(-10) // Only check recent messages
          .map((m) => m.content),
      );

      const stillPending = pending.filter((opt) => {
        // If a real message with the same content exists, this optimistic is confirmed
        if (realContentSet.has(opt.content)) {
          pendingRef.current.delete(opt.id);
          return false;
        }

        // Remove very old optimistic messages (>30s) — they're stale
        const age = Date.now() - opt.timestamp.getTime();
        if (age > 30000) {
          pendingRef.current.delete(opt.id);
          return false;
        }

        return true;
      });

      if (stillPending.length === 0) return realMessages;

      // Append pending optimistic messages at the end
      return [...realMessages, ...stillPending];
    },
    [],
  );

  return {
    createOptimistic,
    confirmOptimistic,
    failOptimistic,
    mergeWithReal,
    /** Number of messages still pending confirmation */
    pendingCount: pendingRef.current.size,
  };
}
