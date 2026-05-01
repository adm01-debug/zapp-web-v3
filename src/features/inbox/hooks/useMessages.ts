import { useState, useEffect, useCallback, useRef } from 'react';
import { log } from '@/lib/logger';
import { logMessagesSubscribe, wrapMessagesHandler } from '@/lib/devRealtimeLogger';
import { messageService } from '@/features/inbox/services/messageService';
import { messageRepository, Message } from '@/features/inbox/data-access/messageRepository';

import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export type { Message };

interface UseMessagesOptions {
  contactId: string | null;
  enabled?: boolean;
}

export function useMessages({ contactId, enabled = true }: UseMessagesOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const previousContactIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  // Track mount state to prevent setState after unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Fetch messages for contact
  const fetchMessages = useCallback(async () => {
    if (!contactId || !mountedRef.current) {
      if (mountedRef.current) { setMessages([]); setLoading(false); }
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const mappedMessages = await messageService.getAllMessagesForContact(contactId);
      
      if (mountedRef.current) setMessages(mappedMessages);
    } catch (err) {
      log.error('Error fetching messages:', err);
      if (mountedRef.current) setError(err instanceof Error ? err.message : 'Failed to fetch messages');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [contactId]);

  // Handle new message from realtime
  const handleNewMessage = useCallback(
    (payload: RealtimePostgresChangesPayload<Message>) => {
      const newMessage = payload.new as Message;
      
      // Only add if it's for the current contact
      if (newMessage.contact_id === contactId) {
        setMessages((prev) => {
          // Check if message already exists
          if (prev.some((m) => m.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });
      }
    },
    [contactId]
  );

  // Handle message update from realtime
  const handleMessageUpdate = useCallback(
    (payload: RealtimePostgresChangesPayload<Message>) => {
      const updatedMessage = payload.new as Message;

      if (updatedMessage.contact_id === contactId) {
        setMessages((prev) =>
          prev.map((m) => (m.id === updatedMessage.id ? updatedMessage : m))
        );
      }
    },
    [contactId]
  );

  // Handle message delete from realtime
  const handleMessageDelete = useCallback(
    (payload: RealtimePostgresChangesPayload<Message>) => {
      const deletedMessage = payload.old as Message;

      if (deletedMessage.contact_id === contactId) {
        setMessages((prev) => prev.filter((m) => m.id !== deletedMessage.id));
      }
    },
    [contactId]
  );

  // Fetch on contact change
  useEffect(() => {
    if (enabled && contactId !== previousContactIdRef.current) {
      previousContactIdRef.current = contactId;
      fetchMessages();
    }
  }, [contactId, enabled, fetchMessages]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!enabled || !contactId) return;

    logMessagesSubscribe('useMessages', { event: 'INSERT', table: 'messages', filter: `contact_id=eq.${contactId}` });
    logMessagesSubscribe('useMessages', { event: 'UPDATE', table: 'messages', filter: `contact_id=eq.${contactId}` });
    logMessagesSubscribe('useMessages', { event: 'DELETE', table: 'messages', filter: `contact_id=eq.${contactId}` });

    const channel = messageRepository.subscribeToMessages(contactId, {
      onInsert: wrapMessagesHandler('useMessages', handleNewMessage),
      onUpdate: wrapMessagesHandler('useMessages', handleMessageUpdate),
      onDelete: wrapMessagesHandler('useMessages', handleMessageDelete),
    });

    return () => {
      messageRepository.unsubscribe(channel);
    };
  }, [contactId, enabled, handleNewMessage, handleMessageUpdate, handleMessageDelete]);

  // Add a message optimistically
  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === message.id)) {
        return prev;
      }
      return [...prev, message];
    });
  }, []);

  // Update a message optimistically
  const updateMessage = useCallback((messageId: string, updates: Partial<Message>) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, ...updates } : m))
    );
  }, []);

  // Remove a message optimistically
  const removeMessage = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }, []);

  return {
    messages,
    loading,
    error,
    refetch: fetchMessages,
    addMessage,
    updateMessage,
    removeMessage,
  };
}
