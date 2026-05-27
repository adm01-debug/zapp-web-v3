// @ts-nocheck
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useOfflineCache } from '@/hooks/useOfflineCache';
import { useMessages } from '@/features/inbox';
import { useRealtimeMessages, type ConversationWithMessages, type ConversationContact, type RealtimeMessage } from '@/features/inbox';
import { useExternalConversations, useExternalMessages } from '@/hooks/useExternalEvolution';
import { useAuth } from '@/features/auth';
import { supabase, externalSupabase } from '@/integrations/supabase/external';
import { getLogger } from '@/lib/logger';
import { Conversation, Message } from '@/types/chat';
import { toast } from 'sonner';
import type { LoadOlderCallback, CancelLoadOlderCallback } from '@/features/inbox';
import { validatePttBlob } from '@/lib/audio/pttLimits';
import { seedAvatarCache } from '@/features/inbox';
import { mapToLegacyConversation, mapToLegacyMessages } from '@/adapters/inboxLegacyMapper';
import { dbFrom } from '@/integrations/datasource/db';
import { useMessageQueue, QueueItem } from './useMessageQueue';

const log = getLogger('useRealtimeInbox');

// Feature flag: use external evolution DB (FATOR X) as data source.
// O projeto migrou todo o domínio WhatsApp/CRM para FATOR X. O caminho
// legado (public.messages/contacts) está desativado em produção e os envios
// caíam para `failed_retries` sem refletir entradas vindas do webhook.
const USE_EXTERNAL_DB = true;

export function useRealtimeInbox() {
  // Local DB source (original)
  const localRealtime = useRealtimeMessages();
  // External DB source (FATOR X)
  const externalData = useExternalConversations(USE_EXTERNAL_DB);
  // ... keep existing code

  // Select source based on flag
  const conversations = USE_EXTERNAL_DB ? externalData.conversations : localRealtime.conversations;
  const loading = USE_EXTERNAL_DB ? externalData.loading : localRealtime.loading;
  const error = USE_EXTERNAL_DB ? externalData.error : localRealtime.error;
  const refetch = USE_EXTERNAL_DB ? (() => { externalData.refetch(); }) : localRealtime.refetch;

  // Search and Filter controls (exposed from localRealtime)
  const { 
    search, setSearch, 
    statusFilter, setStatusFilter, 
    sortBy, setSortBy 
  } = localRealtime;


  // These features only available on local for now
  const { sendMessage, markAsRead } = localRealtime;
  const { newMessageNotification, dismissNotification, setSelectedContact, setSoundEnabled } = localRealtime;

  const [deliveryAlert, setDeliveryAlert] = useState<{ status: 'warning' | 'breached', delay: number, message?: string } | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedContactFallback, setSelectedContactFallback] = useState<ConversationContact | null>(null);
  const [showDetails, setShowDetails] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState<string>('offline');
  const [pipContact, setPipContact] = useState<{ name: string; avatar?: string; lastMessage?: string; contactId: string } | null>(null);
  const [pendingContactId, setPendingContactId] = useState<string | null>(null);
  // Mensagem que o ChatPanel deve scrollar e destacar assim que abrir a
  // conversa (ex: deep-link "Ver no chat" vindo do AdminFailedMessages
  // ou da busca global). É consumido no `RealtimeInboxView` e propagado
  // para o `ChatPanel` como `initialHighlightMessageId`.
  const [pendingMessageId, setPendingMessageId] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const { profile } = useAuth();

  const { conversations: cachedConversations, usingCache } = useOfflineCache(conversations, loading);

  // Seed avatar cache whenever conversations load/change
  useEffect(() => {
    if (conversations && conversations.length > 0) {
      conversations.forEach(c => {
        if (c.contact.avatar_url) {
          seedAvatarCache(c.contact.id, c.contact.avatar_url);
        }
      });
    }
  }, [conversations]);

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

  // Pagination (older messages) — only meaningful in external mode for now.
  // In local mode, expose `undefined` for the callbacks (per `LoadOlderProps`
  // contract) so ChatMessagesArea skips wiring its scroll-trigger effect
  // entirely (avoiding spurious re-renders from stub callback identities) and
  // the loader UI stays stable.
  const loadOlderMessages = useMemo<LoadOlderCallback | undefined>(
    () => (USE_EXTERNAL_DB ? () => { void externalMsgs.loadOlder(); } : undefined),
    [externalMsgs],
  );
  const cancelLoadOlderMessages = useMemo<CancelLoadOlderCallback | undefined>(
    () => (USE_EXTERNAL_DB ? () => { externalMsgs.cancelLoadOlder(); } : undefined),
    [externalMsgs],
  );
  const loadingOlderMessages = USE_EXTERNAL_DB ? externalMsgs.loadingOlder : false;
  const hasMoreMessages = USE_EXTERNAL_DB ? externalMsgs.hasMore : false;

  // Listen for open-contact-chat events + URL deep-link (?contact=&message=&failuresOnly=&failureCategory=)
  useEffect(() => {
    const appWindow = window as Window & {
      __pendingOpenContactId?: string;
      __pendingOpenChatTarget?: { contactId?: string; messageId?: string };
    };

    // 1) URL query string takes priority — supports refresh / shared
    // deep-links. React-Router isn't mounted around this hook, so we read
    // `window.location.search` directly.
    try {
      const params = new URLSearchParams(window.location.search);
      const urlContact = params.get('contact');
      const urlMessage = params.get('message');
      const urlFailuresOnly = params.get('failuresOnly');
      const urlFailureCategory = params.get('failureCategory');

      // Validamos e sanitizamos os parâmetros de deep-link
      if (urlContact && urlContact.trim() !== '') {
        log.info('Deep-link: found pending contact', { contactId: urlContact.trim() });
        setPendingContactId(urlContact.trim());
      }
      
      if (urlMessage && urlMessage.trim() !== '') {
        log.info('Deep-link: found pending message highlight', { messageId: urlMessage.trim() });
        setPendingMessageId(urlMessage.trim());
      }

      // Sincroniza filtros de falha vindo da URL (ex: dashboard de monitoramento)
      if (urlFailuresOnly === 'true') {
        // Marcamos que queremos ver apenas falhas. O componente InboxFilters 
        // ou o hook useInboxFilters consumirá isso via URL futuramente.
        // Por ora, garantimos que o estado do deep-link está pronto.
      }
    } catch {
      /* noop — non-browser env */
    }

    if (appWindow.__pendingOpenContactId) {
      const pending = appWindow.__pendingOpenContactId;
      // Em modo externo (FATOR X) o Inbox identifica contatos por `remote_jid`.
      // Se o caller depositou um UUID legado (sem `@`), ignoramos para evitar
      // selecionar uma conversa inexistente — preferindo deixar o usuário na
      // lista até que algum caller atualizado reentregue o JID.
      if (USE_EXTERNAL_DB && !pending.includes('@')) {
        log.warn('Ignoring legacy UUID handshake in external mode', { pending });
      } else {
        setPendingContactId(pending);
      }
      appWindow.__pendingOpenContactId = undefined;
    }
    // ... keep existing internal handlers
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { contactId?: string; messageId?: string }
        | undefined;
      const contactId = detail?.contactId;
      const messageId = detail?.messageId;
      if (contactId) {
        setPendingContactId(contactId);
      }
      if (messageId) {
        setPendingMessageId(messageId);
      }
    };
    window.addEventListener('open-contact-chat', handler);

    const deliveryHandler = (e: Event) => {
      const customEvent = e as CustomEvent<{ contactId: string; status: 'warning' | 'breached'; delay: number; message?: string }>;
      const detail = customEvent.detail;
      if (detail && detail.contactId === selectedContactId) {
        setDeliveryAlert({ status: detail.status, delay: detail.delay, message: detail.message });
      }
    };
    window.addEventListener('sla-delivery-alert', deliveryHandler);

    return () => {
      window.removeEventListener('open-contact-chat', handler);
      window.removeEventListener('sla-delivery-alert', deliveryHandler);
    };
  }, [selectedContactId]);

  // Load fallback contact
  const selectedConversation = useMemo(
    () => conversations.find((c) => (c.contact.id === selectedContactId || (c.contact as any).remote_jid === selectedContactId)) || null,
    [conversations, selectedContactId]
  );

  useEffect(() => {
    if (!selectedContactId) { setSelectedContactFallback(null); return; }
    if (selectedConversation) { setSelectedContactFallback(null); return; }
    // No modo externo o `selectedContactId` é um remote_jid, não um UUID,
    // então não tentamos buscar em `public.contacts` (causaria erro de tipo).
    if (USE_EXTERNAL_DB) { setSelectedContactFallback(null); return; }
    let cancelled = false;
    const loadSelectedContact = async () => {
      const client = externalSupabase || supabase;
      const { data, error } = await client
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

  // Online status & Routing Heartbeat
  useEffect(() => {
    if (!profile?.id) return;

    const updateStatus = async (status: string) => {
      const isVisible = document.visibilityState === 'visible';
      const effectiveStatus = isVisible ? status : 'offline';
      
      setOnlineStatus(effectiveStatus);
      setIsOnline(effectiveStatus === 'online');
      
      const now = Date.now();
      const appWindow = window as Window & { __lastStatusUpdate?: number };
      const lastUpdate = appWindow.__lastStatusUpdate || 0;
      
      // Debounce: only update DB every 60s if status didn't change to 'offline'
      if (now - lastUpdate < 60000 && effectiveStatus !== 'offline') return;
      appWindow.__lastStatusUpdate = now;

      await supabase.from('profiles')
        .update({ 
          online_status: effectiveStatus as 'online' | 'offline' | 'busy',
          last_seen: new Date().toISOString()
        })
        .eq('id', profile.id);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateStatus('online');
      } else {
        updateStatus('offline');
      }
    };

    const handleOnline = () => updateStatus('online');
    const handleOffline = () => updateStatus('offline');

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial status
    updateStatus('online');

    // Heartbeat to keep load/status fresh
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        updateStatus('online');
      }
    }, 60000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
      updateStatus('offline');
    };
  }, [profile?.id]);

  // Handlers
  const handleSelectConversation = useCallback((contactId: string) => {
    log.info('Selecting conversation', { contactId });
    setSelectedContactId(contactId);
    setSelectedContact(contactId);
    setDeliveryAlert(null); // Reset alert when changing conversation
    
    // Marcar como lido agora funciona tanto em modo local quanto externo
    if (USE_EXTERNAL_DB) {
      void supabase.functions.invoke('evolution-api', {
        body: { action: 'read-messages', instanceName: 'wpp2', remoteJid: contactId }
      });
    } else {
      markAsRead(contactId);
    }
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

  // Reconciliação automática da fila com base nas mensagens carregadas
  useEffect(() => {
    if (!selectedMessages || selectedMessages.length === 0 || !selectedContactId) return;
    
    // Pegar as últimas 10 mensagens para reconciliar (caso algum webhook tenha chegado)
    const recent = selectedMessages.slice(-10);
    recent.forEach(msg => {
      if (msg.external_id && (msg.sender === 'agent' || msg.sender === 'bot')) {
        const status = (msg.status === 'failed' || msg.status === 'failed_auth' || msg.status === 'failed_retries') 
          ? 'failed' 
          : 'confirmed';
        messageQueue.reconcileWithDelivery(selectedContactId, msg.external_id, status);
      }
      // Reconciliar por conteúdo para bot
      else if (msg.content && msg.sender === 'bot') {
        messageQueue.reconcileWithDelivery(selectedContactId, msg.content, msg.status === 'failed' ? 'failed' : 'confirmed');
      }
    });
  }, [selectedMessages, selectedContactId]);

  const messageQueue = useMessageQueue(async (item: QueueItem) => {
    const { contactId, content, attachments } = item;

    // Webhook reconciliation - remove if already delivered/confirmed externally
    const messagesToCheck = USE_EXTERNAL_DB ? externalMsgs.messages : localMsgs.messages;
    const lastMsg = messagesToCheck[messagesToCheck.length - 1];
    if (lastMsg?.external_id && (lastMsg.sender === 'agent' || lastMsg.sender === 'bot')) {
      messageQueue.reconcileWithDelivery(contactId, lastMsg.external_id, lastMsg.status === 'failed' ? 'failed' : 'confirmed');
    }
    // Fallback: reconciliar usando o conteúdo para mensagens de bot que podem vir sem external_id imediato
    else if (lastMsg?.content && lastMsg.sender === 'bot') {
      messageQueue.reconcileWithDelivery(contactId, lastMsg.content, lastMsg.status === 'failed' ? 'failed' : 'confirmed');
    }

    // Auto-assign on first reply if pending
    // Auto-assign on first reply if pending
    try {
      if (USE_EXTERNAL_DB) {
        const { data: conv } = await dbFrom('evolution_contacts')
          .select('remote_jid, routing_status')
          .eq('remote_jid', contactId)
          .maybeSingle();
          
        if (conv && conv.routing_status === 'pending') {
          await dbFrom('evolution_contacts')
            .update({ routing_status: 'assigned' })
            .eq('remote_jid', contactId);
        }
      } else {
        const { data: conv } = await dbFrom('team_conversations')
          .select('id, routing_status')
          .eq('id', contactId)
          .maybeSingle();
          
        if (conv && conv.routing_status === 'pending') {
          await dbFrom('team_conversations')
            .update({ routing_status: 'assigned' })
            .eq('id', contactId);
        }
      }
    } catch (err) {
      log.error('Error auto-assigning on reply:', err);
    }
    
    if (USE_EXTERNAL_DB) {
      const { sendExternalText, sendExternalMedia } = await import('..');
      const currentAvatar = resolvedSelectedConversation?.contact.avatar_url;
      
      try {
        if (item.type === 'audio' && attachments?.[0]) {
          const { sendExternalAudio } = await import('..');
          const { optimistic } = await sendExternalAudio(contactId, attachments[0], { 
            contactAvatar: currentAvatar,
            isPtt: !attachments[0].name.endsWith('.mp3'),
            conversationInstance: (resolvedSelectedConversation as any)?.instance_name || (resolvedSelectedConversation?.contact as any)?.instance_name,
            onProgress: (p) => { messageQueue.updateProgress(item.id, p); }
          });
          if (optimistic.external_id) item.externalId = optimistic.external_id;
          try { externalMsgs.addMessage(optimistic); } catch { /* noop */ }
        } else if (attachments && attachments.length > 0) {
          for (let i = 0; i < attachments.length; i++) {
            const file = attachments[i];
            const isLarge = file.size > 10 * 1024 * 1024; // > 10MB
            
            try {
              const { optimistic } = await sendExternalMedia(contactId, file, { 
                contactAvatar: currentAvatar,
                caption: i === 0 ? content : undefined,
                onProgress: (p) => {
                  const total = ((i / attachments.length) * 100) + (p / attachments.length);
                  messageQueue.updateProgress(item.id, total);
                }
              });
              if (optimistic.external_id) item.externalId = optimistic.external_id;
              try { externalMsgs.addMessage(optimistic); } catch { /* noop */ }
            } catch (mediaErr) {
              if (isLarge) {
                log.error('Erro em arquivo grande:', mediaErr);
                throw new Error("Arquivo muito grande ou falha na rede. Tente novamente.");
              }
              throw mediaErr;
            }
          }
        } else {
          const { optimistic } = await sendExternalText(contactId, content, { 
            contactAvatar: currentAvatar,
            onProgress: (p) => { messageQueue.updateProgress(item.id, p); }
          });
          if (optimistic.external_id) item.externalId = optimistic.external_id;
          try { externalMsgs.addMessage(optimistic); } catch { /* noop */ }
        }
      } catch (err) {
        log.error('Failed to send external message/media:', err);
        throw err;
      }
      
      setTimeout(() => { void externalMsgs.refetch(); void externalData.refetch(); }, 1500);
      return;
    }
    
    try {
      if (attachments && attachments.length > 0) {
        for (const file of attachments) {
          await sendMessage(contactId, content, 'document', URL.createObjectURL(file));
        }
      } else {
        await sendMessage(contactId, content);
      }
    } catch (err) {
      throw err;
    } finally {
      await refreshActiveConversation();
    }
  });

  const handleSendMessage = useCallback(async (content: string, attachments?: File[]) => {
    if (!selectedContactId) return;
    
    // Se o conteúdo for vazio e houver anexos, podemos dar um nome genérico
    const effectiveContent = content || (attachments?.length ? `Enviando ${attachments.length} anexo(s)` : "");
    const type = attachments?.length ? 'attachment' : 'text';
    
    messageQueue.addToQueue(selectedContactId, effectiveContent, attachments, type);
  }, [selectedContactId, messageQueue]);

  const handleSendAudio = useCallback(async (blob: Blob) => {
    if (!selectedContactId) { toast.error('Selecione uma conversa primeiro'); return; }

    const validation = await validatePttBlob(blob);
    if (!validation.ok) {
      toast.error(validation.message ?? 'Áudio inválido.');
      return;
    }

    const file = new File([blob], `audio_${Date.now()}.ogg`, { type: 'audio/ogg' });
    messageQueue.addToQueue(selectedContactId, "Mensagem de áudio", [file], 'audio');
  }, [selectedContactId, messageQueue]);

  // Convert to legacy format using the pure mapper
  const legacyConversation = useMemo(
    () => mapToLegacyConversation(resolvedSelectedConversation),
    [resolvedSelectedConversation]
  );

  const messageSource = selectedContactId ? selectedMessages : resolvedSelectedConversation?.messages || [];
  
  const legacyMessages = useMemo(
    () => mapToLegacyMessages(
      messageSource as RealtimeMessage[], 
      resolvedSelectedConversation?.contact.id || selectedContactId || '',
      resolvedSelectedConversation?.contact.avatar_url
    ),
    [messageSource, resolvedSelectedConversation, selectedContactId]
  );

  const [whisperCount, setWhisperCount] = useState(0);

  // Fetch whisper count for selected contact
  useEffect(() => {
    if (!selectedContactId || !profile?.id) {
      setWhisperCount(0);
      return;
    }

    const fetchWhisperCount = async () => {
      const { count, error } = await supabase
        .from('whisper_messages')
        .select('*', { count: 'exact', head: true })
        .eq('contact_id', selectedContactId)
        .eq('is_read', false);
      
      if (!error && count !== null) {
        setWhisperCount(count);
      }
    };

    fetchWhisperCount();

    // Subscribe to whisper changes
    const channel = supabase
      .channel(`whisper-count-${selectedContactId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'whisper_messages',
        filter: `contact_id=eq.${selectedContactId}`
      }, () => {
        fetchWhisperCount();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedContactId, profile?.id]);

  return {
    // State
    selectedContactId, setSelectedContactId,
    showDetails, setShowDetails,
    isOnline,
    pipContact, setPipContact,
    pendingContactId, setPendingContactId,
    pendingMessageId, setPendingMessageId,
    soundOn, toggleSound,
    globalSearchOpen, setGlobalSearchOpen,
    showNewConversation, setShowNewConversation,
    search, setSearch,
    statusFilter, setStatusFilter,
    sortBy, setSortBy,
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
    markAsRead: USE_EXTERNAL_DB ? (async (contactId: string) => {
      try {
        await supabase.functions.invoke('evolution-api', {
          body: { action: 'read-messages', instanceName: 'wpp2', remoteJid: contactId }
        });
      } catch (err) {
        log.error('Failed to mark external messages as read:', err);
      }
    }) : markAsRead,
    // Pagination
    loadOlderMessages,
    cancelLoadOlderMessages,
    loadingOlderMessages,
    hasMoreMessages,
    whisperCount,
    // Realtime batching diagnostics (only meaningful in local mode)
    batcherStatus: USE_EXTERNAL_DB ? null : localRealtime.batcherStatus,
    deliveryAlert,
    messageQueue,
  };
}