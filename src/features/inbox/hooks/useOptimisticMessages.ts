import { useCallback, useRef, useState, useEffect } from 'react';
import { Message } from '@/types/chat';

/**
 * Provides optimistic message updates for the chat UI.
 */

let optimisticCounter = 0;

export interface OptimisticMessage extends Message {
  _optimistic: true;
  contact_id: string;
}

export function useOptimisticMessages() {
  const [pending, setPending] = useState<Record<string, OptimisticMessage>>({});
  
  // Use a ref to store the latest pending state for non-reactive logic if needed,
  // but we prefer state for UI reactivity.
  const pendingRef = useRef<Record<string, OptimisticMessage>>({});
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

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

      setPending(prev => ({ ...prev, [tempId]: optimistic }));
      return optimistic;
    },
    [],
  );

  const confirmSent = useCallback((tempId: string, externalId?: string | null) => {
    setPending(prev => {
      if (!prev[tempId]) return prev;
      return {
        ...prev,
        [tempId]: {
          ...prev[tempId],
          status: 'sent',
          external_id: externalId || prev[tempId].external_id
        }
      };
    });
  }, []);

  const failOptimistic = useCallback((tempId: string): OptimisticMessage | undefined => {
    let result: OptimisticMessage | undefined;
    setPending(prev => {
      if (!prev[tempId]) return prev;
      result = { ...prev[tempId], status: 'failed' };
      return { ...prev, [tempId]: result };
    });
    return result;
  }, []);

  const mergeWithReal = useCallback(
    (realMessages: Message[]): (Message | OptimisticMessage)[] => {
      const pendingList = Object.values(pending);
      if (pendingList.length === 0) return realMessages;

      const realExternalIds = new Set(realMessages.map(m => m.external_id).filter(Boolean));
      const realContentSet = new Set(
        realMessages
          .filter((m) => m.sender === 'agent')
          .slice(-20)
          .map((m) => m.content),
      );

      const stillPending: OptimisticMessage[] = [];
      const toRemove: string[] = [];

      for (const opt of pendingList) {
        let confirmed = false;
        // Verify by external_id or fuzzy match content
        if (opt.external_id && realExternalIds.has(opt.external_id)) confirmed = true;
        else if (realContentSet.has(opt.content)) confirmed = true;
        
        const age = Date.now() - opt.timestamp.getTime();
        // Remove if confirmed or timed out (2 minutes)
        if (confirmed || age > 120000) {
          toRemove.push(opt.id);
        } else {
          stillPending.push(opt);
        }
      }

      // NO SETTIMEOUT HERE - IT BREAKS TESTS
      
      if (stillPending.length === 0) return realMessages;

      return [...realMessages, ...stillPending].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      );
    },
    [pending],
  );

  const cleanup = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setPending(prev => {
      const next = { ...prev };
      let changed = false;
      ids.forEach(id => {
        if (next[id]) {
          delete next[id];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, []);

  return {
    createOptimistic,
    confirmSent,
    failOptimistic,
    mergeWithReal,
    cleanup,
    pendingCount: Object.keys(pending).length,
    pending, // exposed for testing
  };
}
