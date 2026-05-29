import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { getLogger } from '@/lib/logger';
import { sendMessageToContact } from './realtime/messageSender';
import {
  normalizeMessage, buildConversation, dedupeContacts, buildConversations,
  getUniqueMessageContactIds, chunkArray,
} from './realtime/realtimeUtils';
import { useRealtimeNotifications } from './realtime/useRealtimeNotifications';
import { useMessageUpdateBatcher } from './realtime/useMessageUpdateBatcher';

const log = getLogger('RealtimeMessages');
const SEEDED_CONTACT_LIMIT = 500;
const RECENT_MESSAGES_LIMIT = 1000;
const CONTACT_FETCH_CHUNK_SIZE = 200;

export interface NewMessageNotification {
  id: string;
  contactId: string;
  contactName: string;
  contactAvatar: string | null;
  message: string;
  timestamp: Date;
}

export interface RealtimeMessage {
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

export interface ConversationContact {
  id: string;
  name: string;
  surname: string | null;
  nickname: string | null;
  phone: string;
  email: string | null;
  avatar_url: string | null;
  tags: string[] | null;
  company: string | null;
  job_title: string | null;
  assigned_to: string | null;
  queue_id: string | null;
  created_at: string;
  updated_at: string;
  whatsapp_connection_id: string | null;
  contact_type: string | null;
  group_category: string | null;
  ai_sentiment: string | null;
}

export interface ConversationWithMessages {
  contact: ConversationContact;
  messages: RealtimeMessage[];
  unreadCount: number;
  lastMessage: RealtimeMessage | null;
}

export function useRealtimeMessages() {
  const [conversations, setConversations] = useState<ConversationWithMessages[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const conversationsRef = useRef<ConversationWithMessages[]>([]);

  const {
    newMessageNotification, notifyAboutIncomingMessage,
    dismissNotification, setSelectedContact, setSoundEnabled,
  } = useRealtimeNotifications();

  const commitConversations = useCallback(
    (updater: ConversationWithMessages[] | ((prev: ConversationWithMessages[]) => ConversationWithMessages[])) => {
      setConversations((prev) => {
        const next = typeof updater === 'function'
          ? (updater as (prev: ConversationWithMessages[]) => ConversationWithMessages[])(prev)
          : updater;
        conversationsRef.current = next;
        return next;
      });
    },
    []
  );

  const fetchContactsByIds = useCallback(async (contactIds: string[]) => {
    const uniqueIds = Array.from(new Set(contactIds.filter(Boolean)));
    if (uniqueIds.length === 0) return [] as ConversationContact[];
    const fetchedContacts: ConversationContact[] = [];
    for (const idsChunk of chunkArray(uniqueIds, CONTACT_FETCH_CHUNK_SIZE)) {
      const { data, error: contactsError } = await supabase.from('contacts').select('*').in('id', idsChunk);
      if (contactsError) throw contactsError;
      fetchedContacts.push(...((data ?? []) as ConversationContact[]));
    }
    return dedupeContacts(fetchedContacts);
  }, []);

  const hydrateConversationForMessage = useCallback(
    async (message: RealtimeMessage) => {
      if (!message.contact_id) return;
      try {
        const [contact] = await fetchContactsByIds([message.contact_id]);
        if (!contact) { log.warn('Incoming message received for unknown contact', { contactId: message.contact_id }); return; }
        commitConversations((prev) => {
          const idx = prev.findIndex((c) => c.contact.id === contact.id);
          if (idx >= 0) {
            const existing = prev[idx];
            if (existing.messages.some((m) => m.id === message.id)) return prev;
            const updated = [...prev];
            updated.splice(idx, 1);
            updated.unshift(buildConversation(contact, [...existing.messages, message]));
            return updated;
          }
          return [buildConversation(contact, [message]), ...prev];
        });
        notifyAboutIncomingMessage(contact, message);
      } catch (err) { log.error('Error hydrating conversation for incoming message:', err); }
    },
    [commitConversations, fetchContactsByIds, notifyAboutIncomingMessage]
  );

  const { handleMessageUpdate } = useMessageUpdateBatcher(conversationsRef, commitConversations, hydrateConversationForMessage);

  const handleNewMessage = useCallback(
    (payload: RealtimePostgresChangesPayload<RealtimeMessage>) => {
      const newMessage = normalizeMessage(payload.new as RealtimeMessage);
      if (!newMessage.contact_id) return;

      const existingConversation = conversationsRef.current.find((c) => c.contact.id === newMessage.contact_id);
      if (!existingConversation) { void hydrateConversationForMessage(newMessage); return; }

      commitConversations((prev) => {
        const idx = prev.findIndex((c) => c.contact.id === newMessage.contact_id);
        if (idx < 0) return prev;
        const conv = prev[idx];
        if (conv.messages.some((m) => m.id === newMessage.id)) return prev;
        const updated = [...prev];
        updated.splice(idx, 1);
        updated.unshift(buildConversation(conv.contact, [...conv.messages, newMessage]));
        return updated;
      });

      notifyAboutIncomingMessage(existingConversation.contact, newMessage);
    },
    [commitConversations, hydrateConversationForMessage, notifyAboutIncomingMessage]
  );

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: seededContacts, error: contactsError } = await supabase.from('contacts').select('*').order('updated_at', { ascending: false }).limit(SEEDED_CONTACT_LIMIT);
      if (contactsError) throw contactsError;
      const { data: recentMessages, error: messagesError } = await supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(RECENT_MESSAGES_LIMIT);
      if (messagesError) throw messagesError;

      const normalizedMessages = ((recentMessages ?? []) as RealtimeMessage[]).map(normalizeMessage);
      const seededContactRows = (seededContacts ?? []) as ConversationContact[];
      const seededContactIds = new Set(seededContactRows.map((c) => c.id));
      const missingContactIds = getUniqueMessageContactIds(normalizedMessages).filter((id) => !seededContactIds.has(id));
      const messageContacts = await fetchContactsByIds(missingContactIds);
      commitConversations(buildConversations([...seededContactRows, ...messageContacts], normalizedMessages));
    } catch (err) {
      log.error('Error fetching conversations:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch conversations');
    } finally { setLoading(false); }
  }, [commitConversations, fetchContactsByIds]);

  useEffect(() => {
    fetchConversations();
    const channel = supabase.channel('messages-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, handleNewMessage)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, handleMessageUpdate)
      .subscribe((status) => { log.debug('Subscription status', { status }); });
    return () => { supabase.removeChannel(channel); };
  }, [fetchConversations, handleNewMessage, handleMessageUpdate]);

  const sendMessage = async (contactId: string, content: string, messageType: string = 'text', mediaUrl?: string, mediaPayload?: string) => {
    return sendMessageToContact(contactId, content, messageType, mediaUrl, mediaPayload);
  };

  const markAsRead = async (contactId: string) => {
    const { error } = await supabase.from('messages').update({ is_read: true }).eq('contact_id', contactId).eq('sender', 'contact').eq('is_read', false);
    if (error) log.error('Error marking messages as read:', error);
    commitConversations((prev) =>
      prev.map((c) => c.contact.id === contactId
        ? buildConversation(c.contact, c.messages.map((m) => ({ ...m, is_read: true })))
        : c
      )
    );
  };

  return {
    conversations, loading, error, sendMessage, markAsRead,
    refetch: fetchConversations, newMessageNotification,
    dismissNotification, setSelectedContact, setSoundEnabled,
  };
}
