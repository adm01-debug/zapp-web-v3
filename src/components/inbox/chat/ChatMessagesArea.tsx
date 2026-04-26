import { useRef, forwardRef, useImperativeHandle, useCallback, useMemo, memo, useEffect, useState, useId } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Ban, RotateCw, Navigation2 } from 'lucide-react';
import { getLogger } from '@/lib/logger';

const log = getLogger('ChatMessagesArea');
import { supabase } from '@/integrations/supabase/client';
import { ChatWatermark } from './ChatWatermark';
import { cn } from '@/lib/utils';
import { Message, InteractiveButton } from '@/types/chat';
import { motion, StaggeredList, StaggeredItem } from '@/components/ui/motion';
import { TypingIndicator } from '../TypingIndicator';
import { format } from 'date-fns';
import { formatDateSeparator } from './messageUtils';
import { MessageBubble } from './MessageBubble';
import {
  recordLoadOlderStarted,
  recordLoadOlderCancelled,
  recordLoadOlderCompleted,
} from './loadOlderMetrics';

import type { LoadOlderProps } from './loadOlderTypes';

interface ChatMessagesAreaProps extends LoadOlderProps {
  messages: Message[];
  isContactTyping: boolean;
  typingUserName: string;
  ttsLoading: boolean;
  ttsPlaying: boolean;
  ttsMessageId: string | null;
  instanceName?: string;
  contactJid?: string;
  contactAvatar?: string;
  onSpeak: (messageId: string, text: string) => void;
  onStop: () => void;
  onReply: (message: Message) => void;
  onForward: (message: Message) => void;
  onCopy: (content: string) => void;
  onScrollToMessage: (messageId: string) => void;
  onInteractiveButtonClick: (button: InteractiveButton) => void;
  onEditStart?: (message: Message) => void;
  highlightedMessageIds?: Set<string>;
  activeHighlightId?: string | null;
  searchQuery?: string;
  /**
   * Duração em ms do badge "Carregamento cancelado". Default: 2500ms.
   * Ignorado em modo local (sem `onLoadOlder`), pois o badge nunca aparece.
   */
  loadOlderCancelBadgeMs?: number;
}

export type LoadOlderCancelReason = 'reverse-scroll' | 'navigation';

export interface ChatMessagesAreaRef {
  scrollToBottom: () => void;
  registerMessageRef: (messageId: string, el: HTMLDivElement | null) => void;
  /**
   * Centraliza a mensagem com `messageId` (id interno) e aplica o ring
   * de destaque temporário. Retorna `true` quando o nó já estava
   * registrado e o scroll foi disparado, `false` quando o caller deve
   * tentar novamente (mensagem ainda não montada / fora do viewport).
   */
  scrollToMessage: (messageId: string) => boolean;
}

export const ChatMessagesArea = memo(forwardRef<ChatMessagesAreaRef, ChatMessagesAreaProps>(({
  messages, isContactTyping, typingUserName, ttsLoading, ttsPlaying, ttsMessageId,
  instanceName, contactJid, contactAvatar, onSpeak, onStop, onReply, onForward, onCopy,
  onScrollToMessage, onInteractiveButtonClick, onEditStart, highlightedMessageIds, activeHighlightId, searchQuery,
  onLoadOlder, onCancelLoadOlder, loadingOlder = false, hasMoreOlder = false,
  loadOlderCancelBadgeMs = 2500,
}, ref) => {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isFetchingOlderRef = useRef(false);
  const cancelledRef = useRef(false);
  const prevScrollHeightRef = useRef<number | null>(null);
  const prevFirstIdRef = useRef<string | null>(null);
  const prevLengthRef = useRef<number>(0);
  const lastScrollTopRef = useRef<number>(0);
  const lastTriggerAtRef = useRef<number>(0);
  const [loadCancelled, setLoadCancelled] = useState(false);
  const [cancelReason, setCancelReason] = useState<LoadOlderCancelReason>('reverse-scroll');
  const cancelBadgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevContactJidRef = useRef<string | undefined>(contactJid);

  const flagCancelled = useCallback((reason: LoadOlderCancelReason = 'reverse-scroll') => {
    setCancelReason(reason);
    setLoadCancelled(true);
    if (cancelBadgeTimerRef.current) clearTimeout(cancelBadgeTimerRef.current);
    cancelBadgeTimerRef.current = setTimeout(() => setLoadCancelled(false), loadOlderCancelBadgeMs);
  }, [loadOlderCancelBadgeMs]);

  // Detecta troca de contato com load em andamento → cancelamento por navegação.
  useEffect(() => {
    if (prevContactJidRef.current !== undefined && prevContactJidRef.current !== contactJid && isFetchingOlderRef.current) {
      flagCancelled('navigation');
    }
    prevContactJidRef.current = contactJid;
  }, [contactJid, flagCancelled]);

  useEffect(() => () => {
    if (cancelBadgeTimerRef.current) clearTimeout(cancelBadgeTimerRef.current);
  }, []);

  const handleMessageDeleted = useCallback(async (messageId: string) => {
    try {
      await supabase.from('messages').update({ is_deleted: true, content: '[Mensagem apagada]' }).eq('id', messageId);
    } catch {
      log.error('Failed to mark message as deleted in DB');
    }
  }, []);

  useImperativeHandle(ref, () => ({
    scrollToBottom: () => {
      const container = scrollContainerRef.current;
      if (container) container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    },
    registerMessageRef: (messageId: string, el: HTMLDivElement | null) => {
      messageRefs.current[messageId] = el;
    },
    scrollToMessage: (messageId: string) => {
      const element = messageRefs.current[messageId];
      const container = scrollContainerRef.current;
      if (element && container) {
        const elementTop = element.offsetTop - container.offsetTop;
        container.scrollTo({ top: elementTop - (container.clientHeight / 2) + (element.clientHeight / 2), behavior: 'smooth' });
        if (!element.dataset.searchHighlight) {
          element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
          setTimeout(() => element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2'), 2000);
        }
      }
    },
  }));

  const messageIds = useMemo(() => messages.map((message) => message.id).filter(Boolean), [messages]);
  const messageIdsSet = useMemo(() => new Set(messageIds), [messageIds]);
  const messageIdsKey = useMemo(() => messageIds.join(','), [messageIds]);

  useEffect(() => {
    if (messageIds.length === 0) return;

    const channel = supabase
      .channel(`chat-reactions:${messageIds[0] ?? 'empty'}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'message_reactions',
      }, (payload) => {
        const nextMessageId = (payload.new as { message_id?: string } | null)?.message_id;
        const prevMessageId = (payload.old as { message_id?: string } | null)?.message_id;
        const reactionMessageId = nextMessageId ?? prevMessageId;

        if (!reactionMessageId || !messageIdsSet.has(reactionMessageId)) return;

        queryClient.invalidateQueries({ queryKey: ['message-reactions', reactionMessageId] });
      })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [messageIds.length, messageIdsKey, messageIdsSet, queryClient]);

  const groupedMessages = useMemo(() => {
    return messages.reduce((groups, message) => {
      const dateKey = format(message.timestamp, 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(message);
      return groups;
    }, {} as Record<string, Message[]>);
  }, [messages]);

  // Scroll-to-top detector → loadOlder (with cancellation on reverse-scroll)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !onLoadOlder) return;

    // Preload threshold: ~1 viewport height OR 600px, whichever is larger.
    // Triggers loadOlder before user reaches scrollTop=0 to avoid visible "wait" gap.
    const PRELOAD_PX = Math.max(600, container.clientHeight);
    const TRIGGER_THROTTLE_MS = 250;
    const REVERSE_CANCEL_PX = 50;

    // Tracks the perf.now() timestamp of the in-flight load so we can compute
    // duration on completion or cancellation.
    let inFlightStartedAt: number | null = null;

    const triggerLoad = () => {
      if (!hasMoreOlder || loadingOlder || isFetchingOlderRef.current) return;
      const now = Date.now();
      if (now - lastTriggerAtRef.current < TRIGGER_THROTTLE_MS) return;
      lastTriggerAtRef.current = now;

      isFetchingOlderRef.current = true;
      cancelledRef.current = false;
      // New load attempt: clear any prior cancel badge.
      setLoadCancelled(false);
      if (cancelBadgeTimerRef.current) {
        clearTimeout(cancelBadgeTimerRef.current);
        cancelBadgeTimerRef.current = null;
      }
      prevScrollHeightRef.current = container.scrollHeight;
      inFlightStartedAt = recordLoadOlderStarted({ contactJid });
      const startedAtForThisRun = inFlightStartedAt;
      Promise.resolve(onLoadOlder()).finally(() => {
        // Only count as "completed" if no cancellation flipped the flag first.
        if (!cancelledRef.current && startedAtForThisRun != null) {
          recordLoadOlderCompleted(startedAtForThisRun, { contactJid });
        }
        if (inFlightStartedAt === startedAtForThisRun) inFlightStartedAt = null;
        setTimeout(() => { isFetchingOlderRef.current = false; }, 100);
      });
    };

    const maybeCancel = (currentTop: number) => {
      // Only cancel an in-flight loadOlder when the user has CLEARLY left the
      // top zone — i.e. they scrolled past the preload threshold AND moved down
      // by more than REVERSE_CANCEL_PX. This avoids spurious cancellations from
      // micro-jitter or rubber-band bounces near scrollTop=0, which were
      // aborting valid loads while the user was still effectively at the top.
      if (!isFetchingOlderRef.current || !onCancelLoadOlder) return;
      const movedDownEnough = currentTop > lastScrollTopRef.current + REVERSE_CANCEL_PX;
      const leftTopZone = currentTop > PRELOAD_PX;
      if (movedDownEnough && leftTopZone) {
        cancelledRef.current = true;
        onCancelLoadOlder();
        recordLoadOlderCancelled(inFlightStartedAt, {
          contactJid,
          reason: 'reverse-scroll',
          scrollTop: currentTop,
          preloadPx: PRELOAD_PX,
        });
        inFlightStartedAt = null;
        // Drop the saved height so the prepend-anchor effect skips reanchoring.
        prevScrollHeightRef.current = null;
        isFetchingOlderRef.current = false;
        flagCancelled();
      }
    };

    const handleScroll = () => {
      const top = container.scrollTop;
      maybeCancel(top);
      if (top < PRELOAD_PX) triggerLoad();
      lastScrollTopRef.current = top;
    };

    // rAF-based throttle: coalesce rapid scroll events into at most 1 invocation per frame.
    // Cuts handler invocations from ~60-120/s on fast wheels/trackpads down to ~60/s,
    // and dedupes the inner triggerLoad/maybeCancel work without delaying user response.
    let rafId: number | null = null;
    const throttledScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        handleScroll();
      });
    };

    // Anticipate intent: if user is scrolling up via wheel/touch near the top, preload immediately
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY < 0 && container.scrollTop < PRELOAD_PX * 1.5) triggerLoad();
    };

    let lastTouchY = 0;
    const handleTouchStart = (e: TouchEvent) => { lastTouchY = e.touches[0]?.clientY ?? 0; };
    const handleTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? 0;
      if (y > lastTouchY && container.scrollTop < PRELOAD_PX * 1.5) triggerLoad();
      lastTouchY = y;
    };

    lastScrollTopRef.current = container.scrollTop;
    container.addEventListener('scroll', throttledScroll, { passive: true });
    container.addEventListener('wheel', handleWheel, { passive: true });
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    return () => {
      container.removeEventListener('scroll', throttledScroll);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
      // On unmount (e.g. conversation switch), abort any in-flight loadOlder.
      if (isFetchingOlderRef.current && onCancelLoadOlder) {
        onCancelLoadOlder();
        cancelledRef.current = true;
        recordLoadOlderCancelled(inFlightStartedAt, { contactJid, reason: 'unmount' });
        inFlightStartedAt = null;
        isFetchingOlderRef.current = false;
      }
    };
  }, [onLoadOlder, onCancelLoadOlder, hasMoreOlder, loadingOlder, flagCancelled, contactJid]);

  // Preserve scroll position after older messages prepend
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const firstId = messages[0]?.id ?? null;
    const lengthIncreased = messages.length > prevLengthRef.current;
    const firstChanged = prevFirstIdRef.current !== null && firstId !== prevFirstIdRef.current;
    const wasPrepend = lengthIncreased && firstChanged;

    if (wasPrepend && prevScrollHeightRef.current !== null && !cancelledRef.current) {
      const prev = prevScrollHeightRef.current;
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight - prev;
        prevScrollHeightRef.current = null;
      });
    } else if (cancelledRef.current) {
      // Cancelled mid-flight: respect user's current scroll position, no anchoring.
      prevScrollHeightRef.current = null;
      cancelledRef.current = false;
    }

    prevFirstIdRef.current = firstId;
    prevLengthRef.current = messages.length;
  }, [messages]);

  return (
    <div ref={scrollContainerRef} role="log" aria-label="Mensagens da conversa" aria-live="polite" className="flex-1 min-h-0 min-w-0 overflow-y-auto px-4 py-6 md:px-8 space-y-4 scrollbar-thin bg-background/50 relative">
      <ChatWatermark />

      {/*
        Topo da lista — duas modalidades mutuamente exclusivas:

        1) MODO EXTERNO (`onLoadOlder` definido):
           Renderiza spinner de carregamento, badge de cancelamento (com
           retry) ou marcador "Inicio da conversa" quando nao ha mais.

        2) MODO LOCAL (`onLoadOlder` indefinido):
           NUNCA renderiza spinner, badge ou qualquer indicador de
           paginacao. Em vez disso, mostra um marcador estatico de
           "Inicio da conversa (modo local)" que deixa explicito ao usuario
           que esta visualizando todas as mensagens disponiveis e que nao
           ha carregamento adicional. Este marcador e puramente visual:
           sem listeners, sem efeitos, sem custo de runtime alem do render.
      */}
      {onLoadOlder ? (
        <div className="flex justify-center py-2" aria-live="polite">
          {loadingOlder && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border/30">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              <span>Carregando mensagens anteriores…</span>
            </div>
          )}
          {!loadingOlder && loadCancelled && (
            <LoadCancelledBadge
              reason={cancelReason}
              scrollContainerRef={scrollContainerRef}
              onRetry={() => {
                setLoadCancelled(false);
                if (cancelBadgeTimerRef.current) {
                  clearTimeout(cancelBadgeTimerRef.current);
                  cancelBadgeTimerRef.current = null;
                }
                cancelledRef.current = false;
                void onLoadOlder?.();
              }}
            />
          )}
          {!loadingOlder && !loadCancelled && !hasMoreOlder && messages.length > 0 && (
            <span className="text-[11px] text-muted-foreground/60 italic">Início da conversa</span>
          )}
        </div>
      ) : (
        messages.length > 0 && (
          <div
            className="flex justify-center py-2"
            data-testid="chat-local-mode-top"
            data-mode="local"
          >
            <span
              className="text-[11px] text-muted-foreground/60 italic"
              title="Modo local: voce esta vendo todas as mensagens disponiveis. Nao ha carregamento de mensagens anteriores."
            >
              Início da conversa
            </span>
          </div>
        )
      )}


      {Object.entries(groupedMessages).map(([dateKey, dayMessages]) => (
        <div key={dateKey}>
          <div className="flex justify-center my-5">
            <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/80 bg-muted/50 backdrop-blur-sm px-4 py-1 rounded-full border border-border/30 shadow-sm">
              {formatDateSeparator(new Date(dateKey))}
            </motion.span>
          </div>

          <StaggeredList className="space-y-3">
            {dayMessages.map((message, idx) => {
              const nextMsg = dayMessages[idx + 1];
              const prevMsg = dayMessages[idx - 1];
              const isLastInGroup = !nextMsg || nextMsg.sender !== message.sender;
              const isFirstInGroup = !prevMsg || prevMsg.sender !== message.sender;

              return (
                <StaggeredItem key={message.id}>
                  <MessageBubble
                    message={message}
                    isFirstInGroup={isFirstInGroup}
                    isLastInGroup={isLastInGroup}
                    contactAvatar={contactAvatar}
                    instanceName={instanceName}
                    contactJid={contactJid}
                    ttsLoading={ttsLoading}
                    ttsPlaying={ttsPlaying}
                    ttsMessageId={ttsMessageId}
                    highlightedMessageIds={highlightedMessageIds}
                    activeHighlightId={activeHighlightId}
                    searchQuery={searchQuery}
                    onSpeak={onSpeak}
                    onStop={onStop}
                    onReply={onReply}
                    onForward={onForward}
                    onCopy={onCopy}
                    onScrollToMessage={onScrollToMessage}
                    onInteractiveButtonClick={onInteractiveButtonClick}
                    onEditStart={onEditStart}
                    onMessageDeleted={handleMessageDeleted}
                    registerRef={(el) => { messageRefs.current[message.id] = el; }}
                  />
                </StaggeredItem>
              );
            })}
          </StaggeredList>
        </div>
      ))}

      <div className="flex justify-start pl-10">
        <TypingIndicator isVisible={isContactTyping} userName={typingUserName} />
      </div>
      <div ref={messagesEndRef} />
    </div>
  );
}));

ChatMessagesArea.displayName = 'ChatMessagesArea';
// Badge acessível de cancelamento. Anuncia via aria-live polite, move o foco
// para o botão de retry quando o foco anterior estava dentro da área de chat
// (evita roubar foco se o usuário está digitando ou em outro painel).
function LoadCancelledBadge({
  reason,
  onRetry,
  scrollContainerRef,
}: {
  reason: LoadOlderCancelReason;
  onRetry: () => void;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
}) {
  const isNav = reason === 'navigation';
  const Icon = isNav ? Navigation2 : Ban;
  const text = isNav
    ? 'Carregamento interrompido pela navegação'
    : 'Carregamento cancelado pela rolagem';
  const retryBtnRef = useRef<HTMLButtonElement>(null);
  const labelId = useId();

  useEffect(() => {
    const active = document.activeElement as HTMLElement | null;
    const insideChat = !!(active && scrollContainerRef.current?.contains(active));
    // Só move o foco se o usuário estava interagindo dentro do scroll do chat.
    // Caso contrário, o aria-live já anuncia sem interromper a tarefa atual.
    if (insideChat) {
      retryBtnRef.current?.focus({ preventScroll: true });
    }
  }, [scrollContainerRef]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-testid="load-older-cancelled"
      data-cancel-reason={reason}
      className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 backdrop-blur-sm pl-3 pr-1 py-1 rounded-full border border-border/30"
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      <span id={labelId}>{text}</span>
      <button
        ref={retryBtnRef}
        type="button"
        data-testid="load-older-retry"
        onClick={onRetry}
        aria-describedby={labelId}
        aria-label="Tentar carregar mensagens anteriores novamente"
        className="inline-flex items-center gap-1 ml-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-foreground bg-background/80 hover:bg-background border border-border/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <RotateCw className="h-3 w-3" aria-hidden="true" />
        Tentar carregar de novo
      </button>
    </div>
  );
}
