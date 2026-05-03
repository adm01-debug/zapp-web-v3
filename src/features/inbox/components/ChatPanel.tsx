import { useState, useRef, useEffect, lazy, Suspense, useReducer, useCallback, useMemo } from 'react';
import { log } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';
import { Conversation, Message } from '@/types/chat';
import { FileUploaderRef } from './FileUploader';
import { useTypingPresence } from '@/hooks/useTypingPresence';
import { useEvolutionApi } from '@/hooks/useEvolutionApi';
import { useQuickReplies } from '@/features/inbox';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useUserSettings } from '@/hooks/useUserSettings';
import { toast } from '@/hooks/use-toast';
import { useScheduledMessages } from '@/hooks/useScheduledMessages';
import { useMessageSignature } from '@/features/inbox';
import { useChatMediaSending } from './useChatMediaSending';
import { CRMAutoSync } from './CRMAutoSync';
import { useAmbientColor } from '@/hooks/useAmbientColor';
import { ChatToolPanels } from './chat/ChatToolPanels';
import { ChatDialogs } from './chat/ChatDialogs';
import { ChatHeader } from './chat/ChatHeader';
import { ChatAssignedBar } from './chat/ChatAssignedBar';
import { TicketActionsBar } from './chat/TicketActionsBar';
import { TicketHistorySheet } from './TicketHistorySheet';
import { ChatMessagesArea, ChatMessagesAreaRef } from './chat/ChatMessagesArea';
import type { LoadOlderProps } from './chat/loadOlderTypes';
import { ChatInputArea } from './chat/ChatInputArea';
import { AutomationSuggestionsBar } from './chat/AutomationSuggestionsBar';
import { useAutomations } from '@/hooks/useAutomations';
import { SendErrorBanner } from './chat/SendErrorBanner';
import { ChatDragOverlay } from './chat/ChatDragOverlay';
import { ChatQuickRepliesPopover } from './chat/ChatQuickRepliesPopover';
import { ChatSearchBar } from './chat/ChatSearchBar';
import { useChatPanelHandlers } from './chat/useChatPanelHandlers';
import { useSearchParams } from 'react-router-dom';
import { useTransferConversation } from '@/features/inbox/hooks/useTransferConversation';
import { useScheduledMediaUpload } from '@/features/inbox/hooks/useScheduledMediaUpload';
import { useSafeInteractiveMessage } from '@/features/inbox/hooks/useSafeInteractiveMessage';
import { dbFrom } from '@/integrations/datasource/db';

const WhisperMode = lazy(() => import('./WhisperMode').then(m => ({ default: m.WhisperMode })));
const NextBestActionEngine = lazy(() => import('./NextBestActionEngine').then(m => ({ default: m.NextBestActionEngine })));

if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
  (window as Window).requestIdleCallback(() => {
    import('./TransferDialog');
    import('./AIConversationAssistant');
    import('./CloseConversationDialog');
  });
}

interface ChatPanelProps extends LoadOlderProps {
  conversation: Conversation;
  messages: Message[];
  onSendMessage: (content: string) => void;
  onSendAudio?: (blob: Blob) => Promise<void>;
  showDetails?: boolean;
  onToggleDetails?: () => void;
  onBack?: () => void;
  hideHeader?: boolean;
  /**
   * Quando definido, ao montar (ou ao mudar para esta conversa) o painel
   * dá scroll até a mensagem indicada e aplica destaque temporário (~3 s).
   * Aceita o `id` interno da mensagem (`evolution_messages.id`) ou o
   * `external_id` retornado pelo webhook — o `ChatMessagesArea` resolve
   * ambos via `data-message-id`.
   */
  initialHighlightMessageId?: string | null;
  /** Notifica o pai de que o destaque foi aplicado (limpa o pending). */
  onHighlightConsumed?: () => void;
  /**
   * Paginacao "carregar mensagens antigas" herdada de `LoadOlderProps`:
   *  - Modo local: omitir (ou passar `undefined`) ambos os callbacks.
   *  - Modo externo: fornecer ambos; loadingOlder/hasMoreOlder refletem o
   *    estado real do fetcher remoto.
   */
  whisperCount?: number;
}

type DialogKey = 'quickReplies' | 'slashCommands' | 'transferDialog' | 'scheduleDialog' | 
  'callDialog' | 'globalSearch' | 'chatSearch' | 'interactiveBuilder' | 'forwardDialog' | 
  'locationPicker' | 'aiAssistant' | 'catalogDirect' | 'whisper' | 'templatesWithVars' | 
  'realtimeTranscription' | 'closeDialog';

type DialogState = Record<DialogKey, boolean>;
type DialogAction = 
  | { type: 'TOGGLE'; key: DialogKey }
  | { type: 'OPEN'; key: DialogKey }
  | { type: 'CLOSE'; key: DialogKey }
  | { type: 'RESET'; keys: DialogKey[] };

const initialDialogState: DialogState = {
  quickReplies: false, slashCommands: false, transferDialog: false, scheduleDialog: false,
  callDialog: false, globalSearch: false, chatSearch: false, interactiveBuilder: false,
  forwardDialog: false, locationPicker: false, aiAssistant: false, catalogDirect: false,
  whisper: false, templatesWithVars: false, realtimeTranscription: false, closeDialog: false,
};

function dialogReducer(state: DialogState, action: DialogAction): DialogState {
  switch (action.type) {
    case 'TOGGLE': return { ...state, [action.key]: !state[action.key] };
    case 'OPEN': return state[action.key] ? state : { ...state, [action.key]: true };
    case 'CLOSE': return state[action.key] ? { ...state, [action.key]: false } : state;
    case 'RESET': {
      const next = { ...state };
      let changed = false;
      for (const k of action.keys) { if (next[k]) { next[k] = false; changed = true; } }
      return changed ? next : state;
    }
    default: return state;
  }
}

type ActiveTool = 'chatSearch' | 'objections' | 'university' | 'aiAssistant' | 'summary' | 'teamFiles' | null;

export function ChatPanel({ conversation, messages, onSendMessage, onSendAudio, showDetails = false, onToggleDetails, onBack, hideHeader = false, onLoadOlder, onCancelLoadOlder, loadingOlder = false, hasMoreOlder = false, initialHighlightMessageId, onHighlightConsumed, whisperCount = 0 }: ChatPanelProps) {
  const [dialogs, dispatch] = useReducer(dialogReducer, initialDialogState);
  const openDialog = useCallback((key: DialogKey) => dispatch({ type: 'OPEN', key }), []);
  const closeDialog = useCallback((key: DialogKey) => dispatch({ type: 'CLOSE', key }), []);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  const handleSetActiveTool = useCallback((tool: ActiveTool) => {
    setActiveTool(prev => prev === tool ? null : tool);
  }, []);

  useEffect(() => {
    dispatch({ type: activeTool === 'chatSearch' ? 'OPEN' : 'CLOSE', key: 'chatSearch' });
    dispatch({ type: activeTool === 'aiAssistant' ? 'OPEN' : 'CLOSE', key: 'aiAssistant' });
  }, [activeTool]);

  const [callDirection, setCallDirection] = useState<'inbound' | 'outbound'>('outbound');
  const [highlightedMessageIds, setHighlightedMessageIds] = useState<Set<string>>(new Set());
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  // Filtro: somente mensagens com falha terminal (failed/failed_auth/failed_retries).
  // Persistido em ?failuresOnly=1 (toggle global) e, opcionalmente, em
  // ?failureCategory=<failed|failed_auth|failed_retries> (subcategoria).
  // Ambos sobrevivem a recarregamento e tornam o link compartilhável.
  const [searchParams, setSearchParams] = useSearchParams();
  const failuresOnly = searchParams.get('failuresOnly') === '1';
  const FAILURE_CATEGORIES = ['failed', 'failed_auth', 'failed_retries'] as const;
  type FailureCategory = typeof FAILURE_CATEGORIES[number];
  const rawCategory = searchParams.get('failureCategory');
  const failureCategory: FailureCategory | null =
    rawCategory && (FAILURE_CATEGORIES as readonly string[]).includes(rawCategory)
      ? (rawCategory as FailureCategory)
      : null;

  const setFailuresOnly = useCallback((next: boolean | ((prev: boolean) => boolean)) => {
    setSearchParams((prev) => {
      const sp = new URLSearchParams(prev);
      const current = sp.get('failuresOnly') === '1';
      const value = typeof next === 'function' ? next(current) : next;
      if (value) {
        sp.set('failuresOnly', '1');
      } else {
        sp.delete('failuresOnly');
        // Disabling the global filter also clears the subcategory so the
        // shared link doesn't carry orphan state.
        sp.delete('failureCategory');
      }
      return sp;
    }, { replace: true });
  }, [setSearchParams]);

  const setFailureCategory = useCallback((next: FailureCategory | null) => {
    setSearchParams((prev) => {
      const sp = new URLSearchParams(prev);
      if (next) sp.set('failureCategory', next);
      else sp.delete('failureCategory');
      return sp;
    }, { replace: true });
  }, [setSearchParams]);

  const fileUploaderRef = useRef<FileUploaderRef>(null);
  const messagesAreaRef = useRef<ChatMessagesAreaRef>(null);
  const dragCounterRef = useRef(0);

  const { isContactTyping, typingUsers, handleTypingStart, handleTypingStop } = useTypingPresence({
    conversationId: conversation.id,
    remoteJid: conversation.contact.id,
    currentUserId: conversation.assignedTo?.id || 'agent',
    currentUserName: conversation.assignedTo?.name || 'Agente',
  });
  const { quickReplies: dbQuickReplies, incrementUseCount } = useQuickReplies();
  const { settings, updateSettings, saveSettings } = useUserSettings();
  const { editMessage } = useEvolutionApi();
  const { scheduleMessage } = useScheduledMessages(conversation.contact.id);
  const { signatureEnabled, agentName, toggleSignature, applySignature } = useMessageSignature();
  const { instanceName, whatsappConnectionId, initResolve, handleSendSticker, handleSendCustomEmoji, handleSendAudioMeme } = useChatMediaSending(conversation.contact.id, conversation.contact.phone);

  const handleVoiceChange = (v: string) => { updateSettings({ tts_voice_id: v }); setTimeout(() => saveSettings(), 100); };
  const handleSpeedChange = (s: number) => { updateSettings({ tts_speed: s }); setTimeout(() => saveSettings(), 100); };
  const { speak, stop, isLoading: ttsLoading, isPlaying: ttsPlaying, currentMessageId: ttsMessageId, voiceId, setVoiceId, speed, setSpeed } = useTextToSpeech({
    initialVoiceId: settings.tts_voice_id, initialSpeed: settings.tts_speed, onVoiceChange: handleVoiceChange, onSpeedChange: handleSpeedChange,
  });

  const handlers = useChatPanelHandlers({
    conversationId: conversation.id, contactId: conversation.contact.id, contactPhone: conversation.contact.phone,
    instanceName, onSendMessage, editMessageApi: editMessage, applySignature,
    handleTypingStart, handleTypingStop, openDialog: openDialog as (key: string) => void, closeDialog: closeDialog as (key: string) => void, handleSetActiveTool,
  });

  useEffect(() => { initResolve(); }, [conversation.contact.id]);

  // Avalia regras de automação para a conversa ativa
  useAutomations({
    remoteJid: conversation.contact.id,
    instanceName,
    assignedTo: conversation.assignedTo?.id ?? null,
  });
  const lastMsgIdRef = useRef<string | null>(null);
  useEffect(() => {
    const lastId = messages[messages.length - 1]?.id ?? null;
    // Only auto-scroll when a new message was appended at the end (not when older ones were prepended)
    if (lastId !== lastMsgIdRef.current) {
      lastMsgIdRef.current = lastId;
      messagesAreaRef.current?.scrollToBottom();
    } else if (isContactTyping) {
      messagesAreaRef.current?.scrollToBottom();
    }
  }, [messages, isContactTyping]);
  useEffect(() => {
    setActiveTool(null); setHighlightedMessageIds(new Set()); setActiveHighlightId(null); setSearchQuery('');
    setFailuresOnly(false);
  }, [conversation.id]);

  // Deep-link "Ver no chat": quando o caller abre o Inbox apontando para
  // uma mensagem específica, scrollamos até ela e aplicamos um destaque
  // temporário (~3 s) reaproveitando os mesmos states usados pela busca
  // dentro do chat. Tentamos durante alguns frames porque a mensagem
  // pode não estar no DOM no primeiro paint (lista virtualizada / fetch
  // assíncrono). Após sumir o ring, removemos o pending no caller.
  useEffect(() => {
    if (!initialHighlightMessageId) return;

    const targetId = initialHighlightMessageId;
    const findInternal = () => {
      const list = messages;
      return (
        list.find((m) => m.id === targetId)?.id ??
        list.find((m) => m.external_id === targetId)?.id ??
        null
      );
    };

    let cancelled = false;
    let highlightTimer: ReturnType<typeof setTimeout> | null = null;

    // Caso 1 — mensagem já está carregada: rola, destaca e agenda
    // a remoção do ring após ~3.2 s.
    const internalId = findInternal();
    if (internalId) {
      setHighlightedMessageIds(new Set([internalId]));
      setActiveHighlightId(internalId);

      let attempts = 0;
      const tryScroll = () => {
        if (cancelled) return;
        attempts++;
        const found = messagesAreaRef.current?.scrollToMessage(internalId) ?? false;
        if (!found && attempts < 6) setTimeout(tryScroll, 120);
      };
      tryScroll();

      highlightTimer = setTimeout(() => {
        setActiveHighlightId(null);
        setHighlightedMessageIds(new Set());
        onHighlightConsumed?.();
      }, 3200);

      return () => {
        cancelled = true;
        if (highlightTimer) clearTimeout(highlightTimer);
      };
    }

    // Caso 2 — mensagem ainda não está na lista. Damos uma janela de
    // graça (~2.5 s) para o fetch inicial / `loadOlder` materializá-la.
    // Se o effect re-rodar antes (porque `messages` mudou e a mensagem
    // apareceu), o cleanup cancela o timer e a próxima execução cai no
    // Caso 1. Caso contrário, mostramos um aviso e seguimos com a
    // conversa aberta normalmente, consumindo o pending para não
    // tentar novamente em renders subsequentes.
    const giveUpTimer = setTimeout(() => {
      if (cancelled) return;
      toast({
        title: 'Mensagem não encontrada',
        description:
          'A mensagem original pode ter sido removida ou ainda não foi carregada. Abrimos a conversa normalmente.',
        variant: 'destructive',
      });
      onHighlightConsumed?.();
    }, 2500);

    return () => {
      cancelled = true;
      clearTimeout(giveUpTimer);
    };
  }, [initialHighlightMessageId, messages, onHighlightConsumed]);

  const canGenerateSummary = messages.length >= 10;

  // Pré-computa o conjunto de mensagens com falha terminal — alimenta o
  // contador no header e o filtro do MessagesArea sem reescanear a lista
  // a cada render. Quando `failureCategory` está setado via URL, restringe
  // ainda mais para a categoria selecionada (failed | failed_auth | failed_retries).
  const failedMessages = useMemo(
    () => messages.filter(
      (m) => m.status === 'failed' || m.status === 'failed_auth' || m.status === 'failed_retries',
    ),
    [messages],
  );
  const categoryCounts = useMemo(() => ({
    failed: failedMessages.filter((m) => m.status === 'failed').length,
    failed_auth: failedMessages.filter((m) => m.status === 'failed_auth').length,
    failed_retries: failedMessages.filter((m) => m.status === 'failed_retries').length,
  }), [failedMessages]);
  const categoryFilteredMessages = useMemo(
    () => (failureCategory ? failedMessages.filter((m) => m.status === failureCategory) : failedMessages),
    [failedMessages, failureCategory],
  );
  const visibleMessages = failuresOnly ? categoryFilteredMessages : messages;

  // Memoize expensive derived arrays to avoid re-creation on every keystroke
  const lastContactMessages = useMemo(
    () => messages.filter(m => m.sender === 'contact').slice(-5).map(m => m.content),
    [messages]
  );
  const allMessagesForHeader = useMemo(
    () => messages.map(m => ({ id: m.id, content: m.content, sender: m.sender, timestamp: m.timestamp.toISOString() })),
    [messages]
  );
  const filteredQuickReplies = useMemo(
    () => dbQuickReplies.filter(r => handlers.inputValue.startsWith('/') && r.shortcut.toLowerCase().includes(handlers.inputValue.toLowerCase())),
    [dbQuickReplies, handlers.inputValue]
  );

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); handleSetActiveTool('chatSearch'); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // Stable refs for ChatMessagesArea to prevent re-renders on input change
  const contactJid = useMemo(() => conversation.contact.phone ? `${conversation.contact.phone}@s.whatsapp.net` : '', [conversation.contact.phone]);
  const contactAvatar = conversation.contact.avatar || undefined;
  const handleScrollToMessage = useCallback((id: string) => messagesAreaRef.current?.scrollToMessage(id), []);

  const handleQuickReply = (reply: { id: string; title: string; shortcut: string; content: string; category: string }) => {
    handlers.setInputValue(reply.content); closeDialog('quickReplies'); incrementUseCount(reply.id);
  };

  const { transferConversation: handleTransfer } = useTransferConversation({
    contactId: conversation.contact.id,
    whatsappConnectionId,
  });

  const handleScheduleMessage = async (message: string, scheduledAt: Date, attachment?: File) => {
    try {
      let mediaUrl: string | undefined;
      let messageType = 'text';
      if (attachment) {
        const fileName = `scheduled_${Date.now()}_${attachment.name}`;
        const { error: uploadError } = await supabase.storage.from('whatsapp-media').upload(fileName, attachment);
        if (uploadError) {
          toast({ title: 'Erro no upload', description: `Falha ao anexar: ${uploadError.message}`, variant: 'destructive' });
        }
        if (!uploadError) {
          const { data: signedData , error } = await supabase.storage.from('whatsapp-media').createSignedUrl(fileName, 604800); // 7 days for scheduled messages
          mediaUrl = signedData?.signedUrl;
          messageType = attachment.type.startsWith('audio') ? 'audio' : attachment.type.startsWith('image') ? 'image' : attachment.type.startsWith('video') ? 'video' : 'document';
        }
      }
      await scheduleMessage({ contactId: conversation.contact.id, content: message, scheduledAt, messageType, mediaUrl });
      closeDialog('scheduleDialog');
    } catch (err) { log.error('Failed to schedule message:', err); }
  };

  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounterRef.current++; if (e.dataTransfer.types.includes('Files')) setIsDraggingOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounterRef.current--; if (dragCounterRef.current === 0) setIsDraggingOver(false); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); dragCounterRef.current = 0; setIsDraggingOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && fileUploaderRef.current) fileUploaderRef.current.handleExternalFiles(files);
  };

  const ambient = useAmbientColor(conversation.sentiment);

  return (
    <div className={`flex h-full min-h-0 min-w-0 overflow-hidden relative ${ambient.className}`} style={{ backgroundColor: ambient.bgTint }} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}>
      <ChatDragOverlay isDraggingOver={isDraggingOver} />
      <CRMAutoSync conversation={conversation} messageCount={messages.length} messages={messages} />

      <div className="flex flex-col flex-1 h-full min-h-0 min-w-0 overflow-hidden">
        {!hideHeader && (
          <ChatHeader
            conversation={conversation}
            messages={messages}
            isContactTyping={isContactTyping}
            showAIAssistant={activeTool === 'aiAssistant'}
            showDetails={showDetails}
            voiceId={voiceId}
            speed={speed}
            onToggleAIAssistant={() => handleSetActiveTool('aiAssistant')}
            onToggleDetails={onToggleDetails || (() => {})}
            onStartCall={() => { setCallDirection('outbound'); openDialog('callDialog'); }}
            onOpenSearch={() => handleSetActiveTool('chatSearch')}
            onOpenTransfer={() => openDialog('transferDialog')}
            onOpenSchedule={() => openDialog('scheduleDialog')}
            onVoiceChange={setVoiceId}
            onSpeedChange={setSpeed}
            onBack={onBack}
            onGenerateSummary={(tool) => handleSetActiveTool(tool === 'teamFiles' ? 'teamFiles' : 'summary')}
            onCloseConversation={() => openDialog('closeDialog')}
            failuresOnly={failuresOnly}
            failuresCount={failedMessages.length}
            onToggleFailuresOnly={() => setFailuresOnly((v) => !v)}
            onOpenWhisper={() => dispatch({ type: 'TOGGLE', key: 'whisper' })}
            whisperCount={whisperCount}
          />
        )}

        <ChatSearchBar messages={messages} isOpen={activeTool === 'chatSearch'}
          onClose={() => { handleSetActiveTool('chatSearch'); setTimeout(() => handlers.inputRef.current?.focus(), 150); }}
          onNavigateToMessage={(id) => messagesAreaRef.current?.scrollToMessage(id)}
          onHighlightChange={(ids, activeId) => { setHighlightedMessageIds(ids); setActiveHighlightId(activeId); }}
          onSearchQueryChange={setSearchQuery} />

        <TicketActionsBar contactId={conversation.contact.id} onOpenHistory={() => setHistoryOpen(true)} />
        <TicketHistorySheet contactId={conversation.contact.id} open={historyOpen} onOpenChange={setHistoryOpen} />
        <ChatAssignedBar conversation={conversation} onOpenTransfer={() => openDialog('transferDialog')} />

        {failuresOnly && (
          <div
            role="status"
            aria-live="polite"
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 text-xs bg-destructive/10 text-destructive border-b border-destructive/20"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">
                {categoryFilteredMessages.length === 0
                  ? 'Nenhuma mensagem nesta categoria.'
                  : `${categoryFilteredMessages.length} ${categoryFilteredMessages.length === 1 ? 'mensagem' : 'mensagens'}`}
              </span>
              <div className="flex items-center gap-1" role="tablist" aria-label="Categoria de falha">
                {([
                  { key: null, label: 'Todas', count: failedMessages.length },
                  { key: 'failed' as const, label: 'Sem conexão', count: categoryCounts.failed },
                  { key: 'failed_auth' as const, label: 'Auth', count: categoryCounts.failed_auth },
                  { key: 'failed_retries' as const, label: 'Esgotadas', count: categoryCounts.failed_retries },
                ]).map(({ key, label, count }) => {
                  const isActive = (failureCategory ?? null) === key;
                  return (
                    <button
                      key={key ?? 'all'}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setFailureCategory(key)}
                      className={
                        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors ' +
                        (isActive
                          ? 'bg-destructive text-destructive-foreground border-destructive'
                          : 'bg-background/40 border-destructive/30 hover:bg-destructive/20')
                      }
                    >
                      {label}
                      <span className="opacity-70">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              className="font-medium underline hover:no-underline"
              onClick={() => setFailuresOnly(false)}
            >
              Limpar filtro
            </button>
          </div>
        )}

        <Suspense fallback={null}>
          <NextBestActionEngine contactId={conversation.contact.id} contactName={conversation.contact.name} />
        </Suspense>

        <ChatMessagesArea ref={messagesAreaRef} messages={visibleMessages} isContactTyping={isContactTyping} typingUserName={typingUsers[0]?.name || conversation.contact.name}
          ttsLoading={ttsLoading} ttsPlaying={ttsPlaying} ttsMessageId={ttsMessageId} instanceName={instanceName}
          contactJid={contactJid} contactAvatar={contactAvatar}
          onSpeak={speak} onStop={stop} onReply={handlers.handleReplyToMessage} onForward={handlers.handleForwardMessage} onCopy={handlers.handleCopyMessage}
          onScrollToMessage={handleScrollToMessage} onInteractiveButtonClick={handlers.handleInteractiveButtonClick} onEditStart={handlers.handleEditStart}
          highlightedMessageIds={highlightedMessageIds} activeHighlightId={activeHighlightId} searchQuery={searchQuery}
          onLoadOlder={failuresOnly ? undefined : onLoadOlder}
          onCancelLoadOlder={failuresOnly ? undefined : onCancelLoadOlder}
          loadingOlder={failuresOnly ? false : loadingOlder}
          hasMoreOlder={failuresOnly ? false : hasMoreOlder} />

        <ChatQuickRepliesPopover show={dialogs.quickReplies} replies={filteredQuickReplies} onSelect={handleQuickReply} onClose={() => closeDialog('quickReplies')} />

        {dialogs.whisper && (
          <Suspense fallback={null}>
            <WhisperMode contactId={conversation.contact.id} className="mx-3 mb-2" defaultExpanded={true} />
          </Suspense>
        )}

        <SendErrorBanner
          error={handlers.lastSendError}
          detail={handlers.lastSendErrorDetail}
          isRetrying={handlers.isSending}
          onRetry={handlers.retryLastSend}
          onDismiss={handlers.dismissSendError}
        />

        <AutomationSuggestionsBar
          remoteJid={conversation.contact.id}
          onUseSuggestion={(t) => handlers.setInputValue(t)}
        />

        <ChatInputArea inputValue={handlers.inputValue} replyToMessage={handlers.replyToMessage} editingMessage={handlers.editingMessage} isRecordingAudio={handlers.isRecordingAudio}
          showSlashCommands={dialogs.slashCommands} contactId={conversation.contact.id} contactPhone={conversation.contact.phone}
          contactName={conversation.contact.name} instanceName={instanceName} messages={messages} quickReplies={dbQuickReplies} isSending={handlers.isSending} sendProgress={handlers.sendProgress}
          isWhisper={handlers.isWhisper} onToggleWhisper={() => handlers.setIsWhisper(!handlers.isWhisper)}
          onInputChange={handlers.handleInputChange} onKeyDown={(e) => handlers.handleKeyDown(e, dialogs.slashCommands)} onBlur={handleTypingStop} onSend={(att) => handlers.handleSend(att)}
          onCancelReply={() => handlers.setReplyToMessage(null)} onCancelEdit={handlers.handleCancelEdit} onSlashCommand={handlers.handleSlashCommand}
          onCloseSlashCommands={() => closeDialog('slashCommands')} onQuickReply={handleQuickReply}
          onRecordToggle={() => handlers.setIsRecordingAudio(!handlers.isRecordingAudio)} onAudioSend={(blob) => handlers.handleAudioSend(blob, onSendAudio)} onAudioCancel={() => handlers.setIsRecordingAudio(false)}
          onOpenInteractiveBuilder={() => openDialog('interactiveBuilder')} onOpenSchedule={() => openDialog('scheduleDialog')}
          onOpenLocationPicker={() => openDialog('locationPicker')} onSendProduct={handlers.handleSendProduct} onSendSticker={handleSendSticker}
          onSendAudioMeme={handleSendAudioMeme} onSendCustomEmoji={handleSendCustomEmoji}
          signatureEnabled={signatureEnabled} signatureName={agentName} onToggleSignature={toggleSignature}
          onPollSent={async (poll) => { await dbFrom('messages').insert({ contact_id: conversation.contact.id, whatsapp_connection_id: whatsappConnectionId, content: `📊 *Enquete:* ${poll.name}\n${poll.options.map((o, i) => `${i + 1}. ${o}`).join('\n')}`, message_type: 'text', sender: 'agent', status: 'sending' }); }}
          onContactSent={async (contactName) => { await dbFrom('messages').insert({ contact_id: conversation.contact.id, whatsapp_connection_id: whatsappConnectionId, content: `📇 Cartão de contato: ${contactName}`, message_type: 'text', sender: 'agent', status: 'sending' }); }}
          onOpenCatalog={() => openDialog('catalogDirect')} onSelectSuggestion={(text) => handlers.setInputValue(text)} onSelectTemplate={(text) => handlers.setInputValue(text)}
          fileUploaderRef={fileUploaderRef} inputRef={handlers.inputRef} />

        <ChatDialogs
          dialogs={dialogs} openDialog={openDialog} closeDialog={closeDialog}
          conversation={conversation} forwardMessage={handlers.forwardMessage} callDirection={callDirection}
          contactId={conversation.contact.id} onTransfer={handleTransfer}
          onScheduleMessage={handleScheduleMessage} onSendInteractiveMessage={handlers.handleSendInteractiveMessage}
          onForwardToTargets={handlers.handleForwardToTargets} onSendLocation={handlers.handleSendLocation}
          onSendProduct={handlers.handleSendProduct} onSetInputValue={handlers.setInputValue}
        />
      </div>

      <ChatToolPanels
        activeTool={activeTool} onSetActiveTool={handleSetActiveTool}
        messages={messages} contactId={conversation.contact.id}
        contactName={conversation.contact.name} onSelectSuggestion={(text) => handlers.setInputValue(text)}
      />
    </div>
  );
}
