import { useCallback, useState } from 'react';
import { useAuth } from '@/features/auth';
import { motion, AnimatePresence } from '@/components/ui/motion';
import { cn } from '@/lib/utils';
import { Reply, Forward, Copy, Download } from 'lucide-react';
import { SwipeableMessage } from '@/components/mobile/SwipeableMessage';
import { DeletedMessagePlaceholder } from '@/features/inbox/components/DeletedMessagePlaceholder';
import { HighlightedText } from './HighlightedText';
import { Message, InteractiveButton } from '@/types/chat';
import { TypingIndicator } from '@/features/inbox/components/TypingIndicator';
import { MessageReactions, QuickReactionBar } from '@/features/inbox/components/MessageReactions';
import { MessageHoverToolbar } from './MessageHoverToolbar';
import { MessageImage } from '@/features/inbox/components/ImagePreview';
import { DocumentPreview, VideoPreview } from '@/features/inbox/components/MediaPreview';
import { AudioMessagePlayer } from '@/features/inbox/components/AudioMessagePlayer';
import { InteractiveMessageDisplay, ButtonResponseBadge } from '@/features/inbox/components/InteractiveMessage';
import { QuotedMessage } from '@/features/inbox/components/ReplyQuote';
import { LocationMessageDisplay } from '@/features/inbox/components/LocationMessage';
import { TextToSpeechButton } from '@/features/inbox/components/TextToSpeechButton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatMessageTime } from './messageUtils';
import { MessageStatusInline } from './MessageStatusInline';
import { MessageReadStatus } from './MessageReadStatus';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { sendMessageToContact } from '@/features/inbox';
import { Link } from 'react-router-dom';
import { RefreshCw, ShieldAlert, History } from 'lucide-react';
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { MessageSendHistorySheet } from './MessageSendHistorySheet';
import { extractMessageType } from '@/adapters/evolutionAdapter';
import { MessageBubbleUnsupported } from './MessageBubbleUnsupported';
import { useContactAvatar } from '@/features/inbox';

import { getLogger } from '@/lib/logger';
const log = getLogger('MessageBubble');

interface MessageBubbleProps {
  message: Message;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  contactAvatar?: string;
  instanceName?: string;
  contactJid?: string;
  ttsLoading: boolean;
  ttsPlaying: boolean;
  ttsMessageId: string | null;
  highlightedMessageIds?: Set<string>;
  activeHighlightId?: string | null;
  searchQuery?: string;
  onSpeak: (messageId: string, text: string) => void;
  onStop: () => void;
  onReply: (message: Message) => void;
  onForward: (message: Message) => void;
  onCopy: (content: string) => void;
  onScrollToMessage: (messageId: string) => void;
  onInteractiveButtonClick: (button: InteractiveButton) => void;
  onEditStart?: (message: Message) => void;
  onMessageDeleted: (messageId: string) => void;
  registerRef: (el: HTMLDivElement | null) => void;
  density?: 'comfortable' | 'compact' | 'dense';
}

export function MessageBubble({
  message, isFirstInGroup, isLastInGroup, contactAvatar, instanceName, contactJid,
  ttsLoading, ttsPlaying, ttsMessageId, highlightedMessageIds, activeHighlightId, searchQuery,
  onSpeak, onStop, onReply, onForward, onCopy, onScrollToMessage, onInteractiveButtonClick,
  onEditStart, onMessageDeleted, registerRef, density = 'comfortable',
}: MessageBubbleProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isActionsActive, setIsActionsActive] = useState(false);

  const isSent = message.sender === 'agent';
  const senderName = isSent ? 'Você' : message.senderName || 'Contato';
  const { avatarUrl } = useContactAvatar(message.conversationId, message.contactAvatar || contactAvatar);
  
  const agentInitials = profile?.name ? profile.name.slice(0, 2).toUpperCase() : 'EU';
  const isFailedTerminal = isSent && !message.is_deleted && (
    message.status === 'failed' || message.status === 'failed_auth' || message.status === 'failed_retries'
  );

  const extracted = extractMessageType(message.message_type ?? message.type);
  const showUnsupportedFallback =
    !message.is_deleted && !extracted.supported &&
    !(message.mediaUrl && (message.type === 'image' || message.type === 'video' || message.type === 'audio' || message.type === 'document' || message.type === 'sticker')) &&
    !(message.type === 'location' && message.location) &&
    !(message.type === 'interactive' && message.interactive);

  const mediaRefreshKey = (instanceName && contactJid && message.external_id)
    ? { instanceName, remoteJid: contactJid, fromMe: isSent, id: message.external_id }
    : undefined;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) return;
    switch (e.key.toLowerCase()) {
      case 'r': e.preventDefault(); onReply(message); break;
      case 'f': e.preventDefault(); onForward(message); break;
      case 'c': e.preventDefault(); if (message.content) onCopy(message.content); break;
    }
  };

  const bubbleContent = (
    <SwipeableMessage onSwipeRight={() => onReply(message)} onSwipeLeft={() => onForward(message)}>
      <div
        ref={registerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onClick={() => {
          if (window.innerWidth < 768) {
            setIsActionsActive(!isActionsActive);
          }
        }}
        role="listitem"
        aria-label={`Mensagem de ${senderName} às ${formatMessageTime(message.timestamp)}. Pressione R para responder, F para encaminhar, C para copiar.`}
        data-testid={`message-bubble-${message.id}`}
        data-message-id={message.id}
        className={cn(
          'flex group gap-2.5 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          isSent ? 'justify-end' : 'justify-start',
          density === 'comfortable' ? 'mb-4' : density === 'compact' ? 'mb-1.5' : 'mb-0.5',
          highlightedMessageIds?.has(message.id) && 'relative',
          activeHighlightId === message.id && 'ring-2 ring-[hsl(var(--warning))] ring-offset-1 ring-offset-background rounded-2xl animate-[pulse_1.5s_ease-in-out_1]',
          highlightedMessageIds?.has(message.id) && activeHighlightId !== message.id && 'bg-[hsl(var(--warning)/0.08)] rounded-2xl',
        )}
      >
        {!isSent && (
          <div className="w-8 shrink-0">
            {isLastInGroup && (
              <Avatar className="w-8 h-8 ring-2 ring-background shadow-sm">
                <AvatarImage src={avatarUrl || undefined} referrerPolicy="no-referrer" onError={(e) => (e.target as HTMLImageElement).removeAttribute('src')} />
                <AvatarFallback className="bg-gradient-to-br from-accent to-accent/60 text-accent-foreground text-[10px] font-bold">{senderName.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            )}
          </div>
        )}

        <div className={cn('max-w-[85%] sm:max-w-[70%] space-y-0.5 relative', isSent && 'items-end')}>
          {!isSent && isFirstInGroup && <span className="text-[11px] font-semibold text-primary/80 ml-1 block">{senderName}</span>}
          {message.isWhisper && (
            <div className="flex items-center gap-1.5 mb-1 ml-1 bg-amber-500/10 dark:bg-amber-500/20 px-2 py-0.5 rounded-full w-fit border border-amber-500/20">
              <ShieldAlert className="w-3 h-3 text-amber-600 dark:text-amber-400 animate-pulse" />
              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">Equipe — Sussurro Interno</span>
            </div>
          )}

          <AnimatePresence>
            <QuickReactionBar
              messageId={message.id}
              isSent={isSent}
              instanceName={instanceName}
              contactJid={contactJid}
              externalId={message.external_id}
              senderType={message.sender}
              refreshKey={message.updated_at}
              disableRealtime
              forceShow={isActionsActive}
            />
          </AnimatePresence>

          {!message.is_deleted && (
            <div className="mt-1">
              <MessageReactions
                messageId={message.id}
                isSent={isSent}
                instanceName={instanceName}
                contactJid={contactJid}
                externalId={message.external_id}
                senderType={message.sender}
                refreshKey={message.updated_at}
                disableRealtime
              />
            </div>
          )}

          <MessageHoverToolbar
            message={message}
            isSent={isSent}
            instanceName={instanceName}
            contactJid={contactJid}
            ttsLoading={ttsLoading}
            ttsPlaying={ttsPlaying}
            ttsMessageId={ttsMessageId}
            onReply={onReply}
            onForward={onForward}
            onCopy={onCopy}
            onSpeak={onSpeak}
            onStop={onStop}
            onEditStart={onEditStart}
            onMessageDeleted={onMessageDeleted}
          />

          {message.is_deleted ? (
            <DeletedMessagePlaceholder isSent={isSent} content={message.content} />
          ) : (
            <motion.div
              whileHover={{ scale: 1.005 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className={cn(
                'relative transition-all overflow-hidden',
                (message.type === 'image' || message.type === 'video') && !message.content ? 'p-0' : density === 'comfortable' ? 'px-3.5 py-2' : density === 'compact' ? 'px-2.5 py-1.5' : 'px-2 py-1',
                isSent
                  ? cn('bg-primary text-primary-foreground shadow-sm', isFirstInGroup && isLastInGroup ? 'rounded-2xl rounded-br-md' : isFirstInGroup ? 'rounded-2xl rounded-br-sm' : isLastInGroup ? 'rounded-2xl rounded-tr-sm rounded-br-md' : 'rounded-xl rounded-tr-sm rounded-br-sm')
                  : cn('bg-card border border-border/30 text-foreground shadow-[var(--shadow-sm)]', isFirstInGroup && isLastInGroup ? 'rounded-2xl rounded-bl-md' : isFirstInGroup ? 'rounded-2xl rounded-bl-sm' : isLastInGroup ? 'rounded-2xl rounded-tl-sm rounded-bl-md' : 'rounded-xl rounded-tl-sm rounded-bl-sm'),
                message.isWhisper && 'bg-amber-50 dark:bg-amber-900/20 border-amber-300/50 dark:border-amber-800/40 text-amber-900 dark:text-amber-100 shadow-[inset_0_1px_2px_rgba(251,191,36,0.1)] ring-1 ring-amber-500/30 border-dashed',
                isFailedTerminal && 'ring-1 ring-destructive/50 border border-destructive/40'
              )}
            >
              {message.replyTo && <QuotedMessage replyTo={message.replyTo} isSent={isSent} onClick={() => onScrollToMessage(message.replyTo!.messageId)} />}
              {message.buttonResponse && <ButtonResponseBadge buttonTitle={message.buttonResponse.buttonTitle} isSent={isSent} />}
              {message.type === 'interactive' && message.interactive && <InteractiveMessageDisplay interactive={message.interactive} isSent={isSent} onButtonClick={onInteractiveButtonClick} />}
              {showUnsupportedFallback && <MessageBubbleUnsupported extracted={extracted} rawContent={message.content} isSent={isSent} />}
              {message.type === 'image' && message.mediaUrl && <div className={cn("overflow-hidden", message.content ? "mb-1.5 -mx-1 -mt-0.5 rounded-xl" : "w-full")}><MessageImage src={message.mediaUrl} refreshKey={mediaRefreshKey} /></div>}
              {message.type === 'video' && message.mediaUrl && <div className="mb-1.5"><VideoPreview url={message.mediaUrl} caption={message.content} isSent={isSent} refreshKey={mediaRefreshKey} /></div>}
              {message.type === 'audio' && message.mediaUrl && <div className="mb-1"><AudioMessagePlayer audioUrl={message.mediaUrl} messageId={message.id} isSent={isSent} existingTranscription={message.transcription} transcriptionStatus={message.transcriptionStatus} refreshKey={mediaRefreshKey} /></div>}
              {message.type === 'document' && message.mediaUrl && <div className="mb-1.5"><DocumentPreview url={message.mediaUrl} fileName={message.content || 'documento'} isSent={isSent} /></div>}
              {message.type === 'location' && message.location && <LocationMessageDisplay location={message.location} isSent={isSent} />}
              {message.type === 'sticker' && message.mediaUrl && <div className="mb-1 group/sticker relative"><img src={message.mediaUrl} alt="Sticker" className="max-w-[160px] max-h-[160px] object-contain drop-shadow-lg" loading="lazy" /></div>}
              {!showUnsupportedFallback && message.content && !['audio','location','video','document','sticker'].includes(message.type) && <p className="text-[13.5px] whitespace-pre-wrap leading-[1.45]">{searchQuery && highlightedMessageIds?.has(message.id) ? <HighlightedText text={message.content} query={searchQuery} /> : message.content}</p>}
              <div className={cn('flex items-center justify-end gap-1 mt-0.5 -mb-0.5', (message.type === 'image' || message.type === 'video') && !message.content ? 'absolute bottom-2 right-3 text-white drop-shadow-md' : isSent ? 'text-primary-foreground/60' : 'text-muted-foreground/70')}>
                {message.isEdited && <span className="text-[9px] italic mr-0.5">editada</span>}
                <span className="text-[10px] font-medium">{formatMessageTime(message.timestamp)}</span>
                {isSent ? <MessageStatusInline message={message} /> : <MessageReadStatus message={message} />}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </SwipeableMessage>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{bubbleContent}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onReply(message)} className="gap-2"><Reply className="w-3.5 h-3.5" /> Responder</ContextMenuItem>
        <ContextMenuItem onClick={() => onForward(message)} className="gap-2"><Forward className="w-3.5 h-3.5" /> Encaminhar</ContextMenuItem>
        <ContextMenuItem onClick={() => onCopy(message.content || '')} className="gap-2"><Copy className="w-3.5 h-3.5" /> Copiar</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
