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
  const isSent = message.sender === 'agent';
  const senderName = isSent ? 'Você' : message.senderName || 'Contato';
  const { avatarUrl } = useContactAvatar(message.conversationId, message.contactAvatar || contactAvatar);
  
  const agentInitials = profile?.name ? profile.name.slice(0, 2).toUpperCase() : 'EU';
  const isFailedTerminal = isSent && !message.is_deleted && (
    message.status === 'failed' || message.status === 'failed_auth' || message.status === 'failed_retries'
  );

  // Universal extractor: classifica o tipo bruto do WhatsApp/Evolution.
  // Quando o blueprint marca o tipo como `unsupported`, renderiza o
  // fallback diagnóstico inline em vez de tentar interpretar o conteúdo.
  // Usa `message_type` (raw da DB) quando disponível; cai para `type` interno.
  const extracted = extractMessageType(message.message_type ?? message.type);
  const showUnsupportedFallback =
    !message.is_deleted && !extracted.supported &&
    // Não dispara para mensagens que o adapter já casou com um renderer
    // dedicado (ex.: 'image' interno mesmo se o raw for desconhecido).
    !(message.mediaUrl && (message.type === 'image' || message.type === 'video' || message.type === 'audio' || message.type === 'document' || message.type === 'sticker')) &&
    !(message.type === 'location' && message.location) &&
    !(message.type === 'interactive' && message.interactive);

  // Build refresh key for auto-recovery of expired WhatsApp media URLs (410/403).
  const mediaRefreshKey = (instanceName && contactJid && message.external_id)
    ? { instanceName, remoteJid: contactJid, fromMe: isSent, id: message.external_id }
    : undefined;

  const bubbleContent = (
      <SwipeableMessage onSwipeRight={() => onReply(message)} onSwipeLeft={() => onForward(message)}>
        <div
          ref={registerRef}
          data-search-highlight={highlightedMessageIds?.has(message.id) ? 'true' : undefined}
          className={cn(
            'flex group gap-2.5 transition-all duration-300',
            isSent ? 'justify-end' : 'justify-start',
            !isLastInGroup && 'mb-0.5',
            highlightedMessageIds?.has(message.id) && 'relative',
            activeHighlightId === message.id && 'ring-2 ring-[hsl(var(--warning))] ring-offset-1 ring-offset-background rounded-2xl animate-[pulse_1.5s_ease-in-out_1]',
            highlightedMessageIds?.has(message.id) && activeHighlightId !== message.id && 'bg-[hsl(var(--warning)/0.08)] rounded-2xl',
          )}
        >
          {/* Avatar — received */}
          {!isSent && (
            <div className="w-8 shrink-0">
              {isLastInGroup && (
                <Avatar className="w-8 h-8 ring-2 ring-background shadow-sm">
                  <AvatarImage 
                    src={avatarUrl || undefined} 
                    referrerPolicy="no-referrer" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).removeAttribute('src');
                    }}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-accent to-accent/60 text-accent-foreground text-[10px] font-bold">
                    {senderName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          )}

          <div className={cn('max-w-[68%] space-y-0.5 relative', isSent && 'items-end')}>
            {!isSent && isFirstInGroup && (
              <span className="text-[11px] font-semibold text-primary/80 ml-1 block">{senderName}</span>
            )}

            {/* Floating emoji reactions on hover — WhatsApp Web style */}
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
              />
            </AnimatePresence>

            {/* Pill toolbar — WhatsApp Web style */}
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

            {/* Message bubble */}
            {message.is_deleted ? (
              <DeletedMessagePlaceholder isSent={isSent} content={message.content} />
            ) : (
              <motion.div
                whileHover={{ scale: 1.005 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className={cn(
                  'relative transition-all overflow-hidden',
                  (message.type === 'image' || message.type === 'video') && !message.content ? 'p-0' : 'px-3.5 py-2',
                  isSent
                    ? cn('bg-primary text-primary-foreground shadow-sm',
                        isFirstInGroup && isLastInGroup && 'rounded-2xl rounded-br-md',
                        isFirstInGroup && !isLastInGroup && 'rounded-2xl rounded-br-sm',
                        !isFirstInGroup && isLastInGroup && 'rounded-2xl rounded-tr-sm rounded-br-md',
                        !isFirstInGroup && !isLastInGroup && 'rounded-xl rounded-tr-sm rounded-br-sm')
                    : cn('bg-card border border-border/30 text-foreground shadow-[var(--shadow-sm)]',
                        isFirstInGroup && isLastInGroup && 'rounded-2xl rounded-bl-md',
                        isFirstInGroup && !isLastInGroup && 'rounded-2xl rounded-bl-sm',
                        !isFirstInGroup && isLastInGroup && 'rounded-2xl rounded-tl-sm rounded-bl-md',
                        !isFirstInGroup && !isLastInGroup && 'rounded-xl rounded-tl-sm rounded-bl-sm'),
                  isFailedTerminal && 'ring-1 ring-destructive/50 border border-destructive/40'
                )}
              >
                {message.replyTo && <QuotedMessage replyTo={message.replyTo} isSent={isSent} onClick={() => onScrollToMessage(message.replyTo!.messageId)} />}
                {message.buttonResponse && <ButtonResponseBadge buttonTitle={message.buttonResponse.buttonTitle} isSent={isSent} />}
                {message.type === 'interactive' && message.interactive && <InteractiveMessageDisplay interactive={message.interactive} isSent={isSent} onButtonClick={onInteractiveButtonClick} />}

                {showUnsupportedFallback && (
                  <MessageBubbleUnsupported extracted={extracted} rawContent={message.content} isSent={isSent} />
                )}

                {message.type === 'image' && message.mediaUrl && (
                  <div className={cn("overflow-hidden", message.content ? "mb-1.5 -mx-1 -mt-0.5 rounded-xl" : "w-full")}>
                    <MessageImage src={message.mediaUrl} refreshKey={mediaRefreshKey} />
                  </div>
                )}

                {message.type === 'video' && message.mediaUrl && (
                  <div className="mb-1.5"><VideoPreview url={message.mediaUrl} caption={message.content} isSent={isSent} refreshKey={mediaRefreshKey} /></div>
                )}

                {message.type === 'audio' && message.mediaUrl && (
                  <div className="mb-1">
                    <AudioMessagePlayer audioUrl={message.mediaUrl} messageId={message.id} isSent={isSent} existingTranscription={message.transcription} transcriptionStatus={message.transcriptionStatus} refreshKey={mediaRefreshKey} />
                    {searchQuery && highlightedMessageIds?.has(message.id) && message.transcription && (
                      <p className="text-[11px] mt-1 px-1 italic text-muted-foreground"><HighlightedText text={message.transcription} query={searchQuery} /></p>
                    )}
                  </div>
                )}

                {message.type === 'document' && message.mediaUrl && (
                  <div className="mb-1.5">
                    <DocumentPreview url={message.mediaUrl} fileName={searchQuery && highlightedMessageIds?.has(message.id) && message.content ? undefined : (message.content || 'documento')} isSent={isSent} />
                    {searchQuery && highlightedMessageIds?.has(message.id) && message.content && (
                      <p className="text-[12px] mt-1 px-1"><HighlightedText text={message.content} query={searchQuery} /></p>
                    )}
                  </div>
                )}

                {message.type === 'location' && message.location && <LocationMessageDisplay location={message.location} isSent={isSent} />}

                {message.type === 'sticker' && message.mediaUrl && (
                  <div className="mb-1 group/sticker relative">
                    <img src={message.mediaUrl} alt="Sticker" className="max-w-[160px] max-h-[160px] object-contain drop-shadow-lg" loading="lazy" />
                    {!isSent && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const { data: existing } = await supabase.from('stickers').select('id').eq('image_url', message.mediaUrl!).maybeSingle();
                            if (existing) { toast({ title: 'Figurinha já está na biblioteca!' }); return; }
                            toast({ title: '🔍 Classificando figurinha com IA...' });
                            let category = 'recebidas';
                            try {
                              const { data: classifyData, error: classifyErr } = await supabase.functions.invoke('classify-sticker', { body: { image_url: message.mediaUrl } });
                              if (!classifyErr && classifyData?.category) category = classifyData.category;
                            } catch (err) { log.error('Unexpected error in MessageBubble:', err); }
                            await supabase.from('stickers').insert({ name: `Recebida ${new Date().toLocaleDateString('pt-BR')}`, image_url: message.mediaUrl!, category, is_favorite: false, use_count: 0 });
                            toast({ title: `✅ Figurinha salva como "${category}"!` });
                          } catch { toast({ title: 'Erro ao salvar figurinha', variant: 'destructive' }); }
                        }}
                        className="absolute bottom-1 right-1 opacity-0 group-hover/sticker:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded-full p-1.5 shadow-md hover:bg-background border border-border/50"
                        title="Salvar na biblioteca"
                      >
                        <Download className="w-3.5 h-3.5 text-foreground" />
                      </button>
                    )}
                  </div>
                )}

                {!showUnsupportedFallback && message.content && message.type !== 'audio' && message.type !== 'location' && message.type !== 'video' && message.type !== 'document' && message.type !== 'sticker' && (
                  <p className="text-[13.5px] whitespace-pre-wrap leading-[1.45]">
                    {searchQuery && highlightedMessageIds?.has(message.id) ? <HighlightedText text={message.content} query={searchQuery} /> : message.content}
                  </p>
                )}

                <div className={cn(
                  'flex items-center justify-end gap-1 mt-0.5 -mb-0.5',
                  (message.type === 'image' || message.type === 'video') && !message.content
                    ? 'absolute bottom-2 right-3 text-white drop-shadow-md'
                    : isSent ? 'text-primary-foreground/60' : 'text-muted-foreground/70',
                  (message.type === 'image' || message.type === 'video') && !message.content && 'px-3.5 pb-1'
                )}>
                  {message.isEdited && <span className="text-[9px] italic mr-0.5">editada</span>}
                  <span className="text-[10px] font-medium">{formatMessageTime(message.timestamp)}</span>
                  {isSent ? <MessageStatusInline message={message} /> : <MessageReadStatus message={message} />}
                </div>
              </motion.div>
            )}

            {/* Resend / auth-fix actions for failed outbound messages */}
            {isSent && !message.is_deleted && (message.status === 'failed' || message.status === 'failed_auth' || message.status === 'failed_retries') && (
              <div className="flex items-center justify-end gap-2 mt-1 px-1">
                {message.status === 'failed_auth' ? (
                  <Link
                    to="/admin/instance-pauses"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-destructive hover:underline"
                  >
                    <ShieldAlert className="w-3 h-3" />
                    Verifique a conexão WhatsApp
                  </Link>
                ) : (
                  <button
                    onClick={async () => {
                      if (!message.conversationId || !message.content) return;
                      try {
                        await sendMessageToContact(
                          message.conversationId,
                          message.content,
                          message.type === 'text' ? 'text' : message.type,
                          message.mediaUrl,
                        );
                        toast({ title: 'Reenviando mensagem…' });
                      } catch (err) {
                        toast({ title: 'Falha ao reenviar', variant: 'destructive' });
                      }
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-destructive hover:underline"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Reenviar
                  </button>
                )}
              </div>
            )}

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

          {/* Avatar — sent */}
          {isSent && (
            <div className="w-8 shrink-0">
              {isLastInGroup && (
                <Avatar className="w-8 h-8 ring-2 ring-background shadow-sm">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/10 text-primary text-[10px] font-bold">
                    {agentInitials}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          )}
        </div>
      </SwipeableMessage>
  );

  if (!isSent) return bubbleContent;

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div>{bubbleContent}</div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56 bg-card border-border/50 shadow-xl">
          <ContextMenuItem
            onClick={() => setHistoryOpen(true)}
            className="gap-2 cursor-pointer"
          >
            <History className="w-4 h-4" />
            Ver histórico de envio
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <MessageSendHistorySheet
        message={message}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
    </>
  );
}
