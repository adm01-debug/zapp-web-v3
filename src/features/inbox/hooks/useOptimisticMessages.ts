import { useCallback, useRef } from 'react';
import { Message } from '@/types/chat';

/**
 * Provides optimistic message updates for the chat UI.
 *
 * Flow:
 * 1. Agent presses Send → optimistic message appears instantly (status: 'sending')
 * 2. Supabase/API call succeeds → real message (webhook) replaces optimistic
 * 3. If call fails → optimistic message shows error state (status: 'failed')
 */

let optimisticCounter = 0;

export interface OptimisticMessage extends Message {
  /** Marks this as an optimistic message that hasn't been confirmed by the server */
  _optimistic: true;
  contact_id: string;
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
      conversationId: string;
      content: string;
      messageType?: Message['type'];
      replyToId?: string | null;
      mediaUrl?: string | null;
      contactAvatar?: string | null;
    }): OptimisticMessage => {
      optimisticCounter++;
      const now = new Date();
      // ID starts with "optimistic:" for easy reconciliation in hooks
      const tempId = `optimistic:${now.getTime()}:${optimisticCounter}`;

      const optimistic: OptimisticMessage = {
        id: tempId,
        _optimistic: true,
        contact_id: params.contactId,
        conversationId: params.conversationId,
        content: params.content,
        type: params.messageType || 'text',
        sender: 'agent',
        status: 'sending',
        timestamp: now,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        external_id: undefined,
        mediaUrl: params.mediaUrl || undefined,
        replyTo: params.replyToId ? { messageId: params.replyToId, content: '', sender: 'contact' } : undefined,
        contactAvatar: params.contactAvatar || null,
        is_read: true,
        is_deleted: false,
      };

      pendingRef.current.set(tempId, optimistic);
      return optimistic;
    },
    [],
  );

  /**
   * Marks an optimistic message as successfully sent (sent to API).
   * It will still stay until a real message from webhook reconciles it.
   */
  const confirmSent = useCallback((tempId: string, externalId?: string | null) => {
    const msg = pendingRef.current.get(tempId);
    if (msg) {
      msg.status = 'sent';
      if (externalId) msg.external_id = externalId;
    }
  }, []);

  /**
   * Marks an optimistic message as failed.
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
   * Reconciles by external_id or content+window proximity.
   */
  const mergeWithReal = useCallback(
    (realMessages: Message[]): (Message | OptimisticMessage)[] => {
      const pending = Array.from(pendingRef.current.values());
      if (pending.length === 0) return realMessages;

      const realExternalIds = new Set(realMessages.map(m => m.external_id).filter(Boolean));
      const realContentSet = new Set(
        realMessages
          .filter((m) => m.sender === 'agent')
          .slice(-20)
          .map((m) => m.content),
      );

      const stillPending = pending.filter((opt) => {
        // Match by external_id
        if (opt.external_id && realExternalIds.has(opt.external_id)) {
          pendingRef.current.delete(opt.id);
          return false;
        }

        // Match by content (fallback)
        if (realContentSet.has(opt.content)) {
          pendingRef.current.delete(opt.id);
          return false;
        }

        // Remove very old optimistic messages (>60s)
        const age = Date.now() - opt.timestamp.getTime();
        if (age > 60000) {
          pendingRef.current.delete(opt.id);
          return false;
        }

        return true;
      });

      if (stillPending.length === 0) return realMessages;

      // Combine and sort
      return [...realMessages, ...stillPending].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      );
    },
    [],
  );

  return {
    createOptimistic,
    confirmSent,
    failOptimistic,
    mergeWithReal,
    pendingCount: pendingRef.current.size,
  };
}
