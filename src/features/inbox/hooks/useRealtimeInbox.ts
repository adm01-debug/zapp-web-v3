import { useState, useEffect, useMemo, useCallback } from 'react';
import { useOfflineCache } from '@/hooks/useOfflineCache';
import { useMessages } from '..';
import { useRealtimeMessages, ConversationWithMessages, ConversationContact } from '..';
import { useExternalConversations, useExternalMessages } from '@/hooks/useExternalEvolution';
import { useAuth } from '@/features/auth';
import { supabase } from '@/integrations/supabase/client';
import { getLogger } from '@/lib/logger';
import { Conversation, Message } from '@/types/chat';
import { toast } from 'sonner';
import type { LoadOlderCallback, CancelLoadOlderCallback } from '..';
import { validatePttBlob } from '@/lib/audio/pttLimits';
import { seedAvatarCache } from '..';
import { mapToLegacyConversation, mapToLegacyMessages } from '@/adapters/inboxLegacyMapper';

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
    // No modo externo o `selectedContactId` é um remote_jid, não um UUID,
    // então não tentamos buscar em `public.contacts` (causaria erro de tipo).
    if (USE_EXTERNAL_DB) { setSelectedContactFallback(null); return; }
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
    log.info('Selecting conversation', { contactId });
    setSelectedContactId(contactId);
    setSelectedContact(contactId);
    // No modo externo, ids são remote_jid (string) — markAsRead local
    // espera UUID e dispararia erro 22P02. Pulamos.
    if (!USE_EXTERNAL_DB) markAsRead(contactId);
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
    if (USE_EXTERNAL_DB) {
      // External path: envio via evolution-api + bolha otimista no cursor.
      // Erros são propagados (sem swallow) para o SendErrorBanner.
      const { sendExternalText } = await import('..');
      const currentAvatar = resolvedSelectedConversation?.contact.avatar_url;
      const { optimistic } = await sendExternalText(selectedContactId, content, { contactAvatar: currentAvatar });
      try { externalMsgs.addMessage(optimistic); } catch { /* noop */ }
      // Pequeno delay para o webhook materializar — depois refetch.
      setTimeout(() => { void externalMsgs.refetch(); void externalData.refetch(); }, 1500);
      return;
    }
    try {
      await sendMessage(selectedContactId, content);
    } catch (err) {
      // Propagar para o ChatPanel exibir o SendErrorBanner em vez de
      // apenas mostrar um toast genérico que se confundia com o sucesso.
      throw err;
    } finally {
      await refreshActiveConversation();
    }
  }, [selectedContactId, sendMessage, refreshActiveConversation, externalMsgs, externalData]);

  const handleSendAudio = useCallback(async (blob: Blob) => {
    if (!selectedContactId) { toast.error('Selecione uma conversa primeiro'); return; }

    // Valida tamanho/duração ANTES de qualquer upload (storage ou external).
    // Aborta cedo com mensagem amigável; lança erro para o SendErrorBanner
    // exibir o motivo e oferecer "Reenviar" caso o usuário ajuste o áudio.
    const validation = await validatePttBlob(blob);
    if (!validation.ok) {
      toast.error(validation.message ?? 'Áudio inválido.');
      throw new Error(validation.message ?? 'Áudio inválido.');
    }

    if (USE_EXTERNAL_DB) {
      // External path (FATOR X): upload + envio via evolution-api + bolha
      // otimista. O webhook reconcilia o status/ID definitivos em segundos.
      //
      // ATENÇÃO: erros (upload OU envio) são PROPAGADOS para que o
      // `SendErrorBanner` possa oferecer "Reenviar" mantendo o blob original
      // — repete o upload + envio + cria uma NOVA bolha otimista.
      const { sendExternalAudio } = await import('..');
      const currentAvatar = resolvedSelectedConversation?.contact.avatar_url;
      try {
        const { optimistic } = await sendExternalAudio(selectedContactId, blob, { contactAvatar: currentAvatar });
        try { externalMsgs.addMessage(optimistic); } catch { /* noop */ }
        setTimeout(() => { void externalMsgs.refetch(); void externalData.refetch(); }, 1500);
      } catch (err) {
        log.error('Error sending external audio:', err);
        // Re-throw para o SendErrorBanner via useChatPanelHandlers.
        throw err;
      }
      return;
    }
    try {
      const fileName = `${selectedContactId}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage.from('audio-messages').upload(fileName, blob, { contentType: 'audio/webm' });
      if (uploadError) {
        log.error('Error uploading audio:', uploadError);
        // Propaga (em vez de engolir) para alimentar o retry de áudio.
        throw new Error(uploadError.message || 'Falha no upload do áudio');
      }
      const { data: signedData, error: signError } = await supabase.storage.from('audio-messages').createSignedUrl(fileName, 3600);
      if (signError || !signedData?.signedUrl) {
        log.error('Error creating signed URL:', signError);
        throw new Error(signError?.message || 'Falha ao gerar URL do áudio');
      }
      await sendMessage(selectedContactId, '[Áudio]', 'audio', signedData.signedUrl);
    } catch (err) {
      log.error('Error in handleSendAudio:', err);
      throw err;
    } finally {
      await refreshActiveConversation();
    }
  }, [selectedContactId, sendMessage, refreshActiveConversation, externalMsgs, externalData]);

  // Convert to legacy format using the pure mapper
  const legacyConversation = useMemo(
    () => mapToLegacyConversation(resolvedSelectedConversation),
    [resolvedSelectedConversation]
  );

  const messageSource = selectedContactId ? selectedMessages : resolvedSelectedConversation?.messages || [];
  
  const legacyMessages = useMemo(
    () => mapToLegacyMessages(
      messageSource, 
      resolvedSelectedConversation?.contact.id || selectedContactId || '',
      resolvedSelectedConversation?.contact.avatar_url
    ),
    [messageSource, resolvedSelectedConversation, selectedContactId]
  );

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
    markAsRead: USE_EXTERNAL_DB ? ((_id: string) => { /* noop em modo externo */ }) : markAsRead,
    // Pagination
    loadOlderMessages,
    cancelLoadOlderMessages,
    loadingOlderMessages,
    hasMoreMessages,
    // Realtime batching diagnostics (only meaningful in local mode)
    batcherStatus: USE_EXTERNAL_DB ? null : localRealtime.batcherStatus,
  };
}
