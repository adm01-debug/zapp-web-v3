import { useRef, forwardRef, useImperativeHandle, useCallback, useMemo, memo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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

interface ChatMessagesAreaProps {
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
}

export interface ChatMessagesAreaRef {
  scrollToBottom: () => void;
  registerMessageRef: (messageId: string, el: HTMLDivElement | null) => void;
  scrollToMessage: (messageId: string) => void;
}

export const ChatMessagesArea = memo(forwardRef<ChatMessagesAreaRef, ChatMessagesAreaProps>(({
  messages, isContactTyping, typingUserName, ttsLoading, ttsPlaying, ttsMessageId,
  instanceName, contactJid, contactAvatar, onSpeak, onStop, onReply, onForward, onCopy,
  onScrollToMessage, onInteractiveButtonClick, onEditStart, highlightedMessageIds, activeHighlightId, searchQuery,
}, ref) => {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={scrollContainerRef} role="log" aria-label="Mensagens da conversa" aria-live="polite" className="flex-1 min-h-0 min-w-0 overflow-y-auto px-4 py-6 md:px-8 space-y-4 scrollbar-thin bg-background/50 relative">
      <ChatWatermark />

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