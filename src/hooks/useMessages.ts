import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { log } from '@/lib/logger';

export interface Message {
  id: string;
  contact_id: string | null;
  agent_id: string | null;
  content: string;
  sender: string;
  message_type: string;
  media_url: string | null;
  is_read: boolean | null;
  status: 'sent' | 'delivered' | 'read' | 'failed' | null;
  status_updated_at: string | null;
  created_at: string;
  updated_at: string;
  external_id: string | null;
  whatsapp_connection_id: string | null;
  transcription: string | null;
  transcription_status: string | null;
  is_deleted: boolean | null;
}

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

      // Fetch all messages using pagination to bypass the 1000 row default limit
      type MessageRow = Omit<Message, 'isEdited'>;
      let allData: MessageRow[] = [];
      let from = 0;
      const PAGE_SIZE = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: page, error: fetchError } = await supabase
          .from('messages')
          .select('*')
          .eq('contact_id', contactId)
          .order('created_at', { ascending: true })
          .range(from, from + PAGE_SIZE - 1);

        if (fetchError) throw fetchError;

        if (page && page.length > 0) {
          allData = allData.concat(page as MessageRow[]);
          from += PAGE_SIZE;
          hasMore = page.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }

      const mappedMessages: Message[] = allData.map((m) => ({
        ...m,
        isEdited: !!(m as any).is_edited,
      }));
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

    const channel = supabase
      .channel(`messages:${contactId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `contact_id=eq.${contactId}`,
        },
        handleNewMessage
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `contact_id=eq.${contactId}`,
        },
        handleMessageUpdate
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `contact_id=eq.${contactId}`,
        },
        handleMessageDelete
      )
      .subscribe((status) => {
        log.debug(`Messages realtime subscription (${contactId}):`, status);
      });

    return () => {
      supabase.removeChannel(channel);
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
