import { useCallback, useRef, useState, useEffect } from 'react';
import { Message } from '@/types/chat';

/**
 * Provides optimistic message updates for the chat UI.
 */

let optimisticCounter = 0;

export interface OptimisticMessage extends Message {
  _optimistic: true;
  contact_id: string;
  isConfirmed?: boolean;
}

export function useOptimisticMessages() {
  const pendingRef = useRef<Map<string, OptimisticMessage>>(new Map());
  const [pendingCount, setPendingCount] = useState(0);

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
        is_deleted: false,
      };

      pendingRef.current.set(tempId, optimistic);
      setPendingCount(pendingRef.current.size);
      return optimistic;
    },
    [],
  );

  const confirmSent = useCallback((tempId: string, externalId?: string | null) => {
    const msg = pendingRef.current.get(tempId);
    if (msg) {
      msg.status = 'sent';
      if (externalId) msg.external_id = externalId;
      setPendingCount(pendingRef.current.size);
    }
  }, []);

  const failOptimistic = useCallback((tempId: string): OptimisticMessage | undefined => {
    const msg = pendingRef.current.get(tempId);
    if (msg) {
      msg.status = 'failed';
      setPendingCount(pendingRef.current.size);
      return { ...msg };
    }
    return undefined;
  }, []);

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

      let changed = false;
      const stillPending = pending.filter((opt) => {
        if (opt.external_id && realExternalIds.has(opt.external_id)) {
          pendingRef.current.delete(opt.id);
          changed = true;
          return false;
        }

        if (realContentSet.has(opt.content)) {
          pendingRef.current.delete(opt.id);
          changed = true;
          return false;
        }

        const age = Date.now() - opt.timestamp.getTime();
        if (age > 60000) {
          pendingRef.current.delete(opt.id);
          changed = true;
          return false;
        }

        return true;
      });

      if (changed) setPendingCount(pendingRef.current.size);
      if (stillPending.length === 0) return realMessages;

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
    pendingCount,
  };
}
