import { useState, useEffect, useMemo, useCallback } from 'react';
import { useOfflineCache } from '@/hooks/useOfflineCache';
import { useMessages } from '@/hooks/useMessages';
import { useRealtimeMessages, ConversationWithMessages, ConversationContact } from '@/hooks/useRealtimeMessages';
import { useExternalConversations, useExternalMessages } from '@/hooks/useExternalEvolution';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getLogger } from '@/lib/logger';
import { Conversation, Message } from '@/types/chat';
import { toast } from 'sonner';

const log = getLogger('useRealtimeInbox');

// Feature flag: use external evolution DB as data source
const USE_EXTERNAL_DB = false;

export function useRealtimeInbox() {
  // Local DB source (original)
  const localRealtime = useRealtimeMessages();
  // External DB source (FATOR X)
  const externalData = useExternalConversations(USE_EXTERNAL_DB);

  // Select source based on flag
  const conversations = USE_EXTERNAL_DB ? externalData.conversations : localRealtime.conversations;
  const loading = USE_EXTERNAL_DB ? externalData.loading : localRealtime.loading;
  const error = USE_EXTERNAL_DB ? externalData.error : localRealtime.error;
  const refetch = USE_EXTERNAL_DB ? (() => { externalData.refetch(); }) : localRealtime.refetch;

  // These features only available on local for now
  const { sendMessage, markAsRead } = localRealtime;
  const { newMessageNotification, dismissNotification, setSelectedContact, setSoundEnabled } = localRealtime;

  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedContactFallback, setSelectedContactFallback] = useState<ConversationContact | null>(null);
  const [showDetails, setShowDetails] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [pipContact, setPipContact] = useState<{ name: string; avatar?: string; lastMessage?: string; contactId: string } | null>(null);
  const [pendingContactId, setPendingContactId] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const { profile } = useAuth();

  const { conversations: cachedConversations, usingCache } = useOfflineCache(conversations, loading);

  // External messages for selected contact (by remote_jid)
  const externalMsgs = useExternalMessages(USE_EXTERNAL_DB ? selectedContactId : null);

  // Local messages (fallback)
  const localMsgs = useMessages({
    contactId: USE_EXTERNAL_DB ? null : selectedContactId,
    enabled: !USE_EXTERNAL_DB && Boolean(selectedContactId),
  });

  const selectedMessages = USE_EXTERNAL_DB ? externalMsgs.messages : localMsgs.messages;
  const selectedMessagesLoading = USE_EXTERNAL_DB ? externalMsgs.loading : localMsgs.loading;
  const refetchSelectedMessages = USE_EXTERNAL_DB ? externalMsgs.refetch : localMsgs.refetch;

  // Pagination (older messages) — only meaningful in external mode for now
  const loadOlderMessages = useCallback(async () => {
    if (USE_EXTERNAL_DB) await externalMsgs.loadOlder();
  }, [externalMsgs]);
  const cancelLoadOlderMessages = useCallback(() => {
    if (USE_EXTERNAL_DB) externalMsgs.cancelLoadOlder();
  }, [externalMsgs]);
  const loadingOlderMessages = USE_EXTERNAL_DB ? externalMsgs.loadingOlder : false;
  const hasMoreMessages = USE_EXTERNAL_DB ? externalMsgs.hasMore : false;

  // Listen for open-contact-chat events
  useEffect(() => {
    const appWindow = window as Window & { __pendingOpenContactId?: string };
    if (appWindow.__pendingOpenContactId) {
      setPendingContactId(appWindow.__pendingOpenContactId);
      appWindow.__pendingOpenContactId = undefined;
    }
    const handler = (e: Event) => {
      const contactId = (e as CustomEvent).detail?.contactId;
      if (contactId) {
        appWindow.__pendingOpenContactId = undefined;
        setPendingContactId(contactId);
      }
    };
    window.addEventListener('open-contact-chat', handler);
    return () => window.removeEventListener('open-contact-chat', handler);
  }, []);

  // Load fallback contact
  const selectedConversation = useMemo(
    () => cachedConversations.find((c) => c.contact.id === selectedContactId) || null,
    [cachedConversations, selectedContactId]
  );

  useEffect(() => {
    if (!selectedContactId) { setSelectedContactFallback(null); return; }
    if (selectedConversation) { setSelectedContactFallback(null); return; }
    let cancelled = false;
    const loadSelectedContact = async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', selectedContactId)
        .maybeSingle();
      if (cancelled) return;
      if (error) { log.error('Error loading selected fallback contact:', error); setSelectedContactFallback(null); return; }
      setSelectedContactFallback(data || null);
    };
    loadSelectedContact();
    return () => { cancelled = true; };
  }, [selectedContactId, selectedConversation]);

  const resolvedSelectedConversation = useMemo<ConversationWithMessages | null>(() => {
    if (selectedConversation) return selectedConversation;
    if (!selectedContactFallback) return null;
    return { contact: selectedContactFallback, messages: [], unreadCount: 0, lastMessage: null };
  }, [selectedConversation, selectedContactFallback]);

  // Online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  // Handlers
  const handleSelectConversation = useCallback((contactId: string) => {
    setSelectedContactId(contactId);
    setSelectedContact(contactId);
    markAsRead(contactId);
  }, [setSelectedContact, markAsRead]);

  const handleNotificationView = useCallback(() => {
    if (newMessageNotification) {
      handleSelectConversation(newMessageNotification.contactId);
      dismissNotification();
    }
  }, [newMessageNotification, handleSelectConversation, dismissNotification]);

  const toggleSound = useCallback(() => {
    const v = !soundOn;
    setSoundOn(v);
    setSoundEnabled(v);
  }, [soundOn, setSoundEnabled]);

  const refreshActiveConversation = useCallback(async () => {
    await Promise.all([refetch(), refetchSelectedMessages()]);
  }, [refetch, refetchSelectedMessages]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!selectedContactId) return;
    try {
      await sendMessage(selectedContactId, content);
    } catch {
      toast.error('Erro ao enviar mensagem');
    } finally {
      await refreshActiveConversation();
    }
  }, [selectedContactId, sendMessage, refreshActiveConversation]);

  const handleSendAudio = useCallback(async (blob: Blob) => {
    if (!selectedContactId) { toast.error('Selecione uma conversa primeiro'); return; }
    try {
      const fileName = `${selectedContactId}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage.from('audio-messages').upload(fileName, blob, { contentType: 'audio/webm' });
      if (uploadError) { log.error('Error uploading audio:', uploadError); toast.error('Erro ao fazer upload do áudio'); return; }
      const { data: signedData, error: signError } = await supabase.storage.from('audio-messages').createSignedUrl(fileName, 3600);
      if (signError || !signedData?.signedUrl) { log.error('Error creating signed URL:', signError); toast.error('Erro ao gerar URL do áudio'); return; }
      await sendMessage(selectedContactId, '[Áudio]', 'audio', signedData.signedUrl);
    } catch (err) {
      log.error('Error in handleSendAudio:', err);
      toast.error('Erro ao enviar áudio. Tente novamente.');
    } finally {
      await refreshActiveConversation();
    }
  }, [selectedContactId, sendMessage, refreshActiveConversation]);

  // Convert to legacy format
  const legacyConversation: Conversation | null = resolvedSelectedConversation
    ? {
        id: resolvedSelectedConversation.contact.id,
        contact: {
          id: resolvedSelectedConversation.contact.id,
          name: resolvedSelectedConversation.contact.name,
          phone: resolvedSelectedConversation.contact.phone,
          email: resolvedSelectedConversation.contact.email || undefined,
          avatar: resolvedSelectedConversation.contact.avatar_url || undefined,
          tags: resolvedSelectedConversation.contact.tags || [],
          createdAt: new Date(resolvedSelectedConversation.contact.created_at),
          contact_type: resolvedSelectedConversation.contact.contact_type || undefined,
          whatsapp_connection_id: resolvedSelectedConversation.contact.whatsapp_connection_id || undefined,
        },
        lastMessage: resolvedSelectedConversation.lastMessage
          ? {
              id: resolvedSelectedConversation.lastMessage.id,
              conversationId: resolvedSelectedConversation.contact.id,
              content: resolvedSelectedConversation.lastMessage.content,
              type: resolvedSelectedConversation.lastMessage.message_type as Message['type'],
              sender: resolvedSelectedConversation.lastMessage.sender as Message['sender'],
              timestamp: new Date(resolvedSelectedConversation.lastMessage.created_at),
              status: 'read' as const,
            }
          : undefined,
        unreadCount: resolvedSelectedConversation.unreadCount,
        status: 'open',
        priority: 'medium',
        tags: resolvedSelectedConversation.contact.tags || [],
        createdAt: new Date(resolvedSelectedConversation.contact.created_at),
        updatedAt: new Date(resolvedSelectedConversation.contact.updated_at),
      }
    : null;

  const messageSource = selectedContactId ? selectedMessages : resolvedSelectedConversation?.messages || [];
  const legacyMessages: Message[] = messageSource.map((m) => ({
    id: m.id,
    conversationId: resolvedSelectedConversation?.contact.id || selectedContactId || '',
    content: m.content,
    type: m.message_type as Message['type'],
    sender: m.sender as Message['sender'],
    agentId: m.agent_id || undefined,
    timestamp: new Date(m.created_at),
    status: (m.status as Message['status'] | null) || (m.is_read ? 'read' : 'delivered'),
    mediaUrl: m.media_url || undefined,
    transcription: m.transcription || null,
    transcriptionStatus: m.transcription_status as Message['transcriptionStatus'] || null,
    is_deleted: m.is_deleted ?? false,
    external_id: m.external_id || undefined,
  }));

  return {
    // State
    selectedContactId, setSelectedContactId,
    showDetails, setShowDetails,
    isOnline,
    pipContact, setPipContact,
    pendingContactId, setPendingContactId,
    soundOn, toggleSound,
    globalSearchOpen, setGlobalSearchOpen,
    showNewConversation, setShowNewConversation,
    profile,
    // Data
    conversations, cachedConversations, usingCache,
    loading, error,
    selectedMessagesLoading,
    newMessageNotification, dismissNotification,
    legacyConversation, legacyMessages,
    // Actions
    handleSelectConversation,
    handleNotificationView,
    handleSendMessage,
    handleSendAudio,
    refetch,
    setSelectedContact,
    markAsRead,
    // Pagination
    loadOlderMessages,
    cancelLoadOlderMessages,
    loadingOlderMessages,
    hasMoreMessages,
  };
}
