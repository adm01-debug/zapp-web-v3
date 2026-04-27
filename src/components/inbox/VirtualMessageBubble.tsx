import { useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Message, InteractiveButton } from '@/types/chat';
import { motion } from 'framer-motion';
import { MessageReactions } from './MessageReactions';
import { MessageImage } from './ImagePreview';
import { DocumentPreview, VideoPreview } from './MediaPreview';
import { InteractiveMessageDisplay, ButtonResponseBadge } from './InteractiveMessage';
import { DeletedMessagePlaceholder } from './DeletedMessagePlaceholder';
import { QuotedMessage } from './ReplyQuote';
import { LocationMessageDisplay } from './LocationMessage';
import { AudioMessagePlayer } from './AudioMessagePlayer';
import { TextToSpeechButton } from './TextToSpeechButton';
import { Reply, Forward, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { MessageStatusInline } from './chat/MessageStatusInline';
import { useContactAvatar } from '@/hooks/realtime/useContactAvatar';

function formatMessageTime(date: Date): string {
  return format(date, 'HH:mm');
}

interface MessageBubbleProps {
  message: Message;
  onReply: (message: Message) => void;
  onForward: (message: Message) => void;
  onCopy: (content: string) => void;
  onInteractiveButtonClick: (button: InteractiveButton) => void;
  ttsLoading: boolean;
  ttsPlaying: boolean;
  ttsMessageId: string | null;
  onSpeak: (messageId: string, text: string) => void;
  onStopSpeak: () => void;
  scrollToMessage: (messageId: string) => void;
  instanceName?: string;
  contactJid?: string;
  contactAvatar?: string;
}

export function MessageBubble({
  message, onReply, onForward, onCopy, onInteractiveButtonClick,
  ttsLoading, ttsPlaying, ttsMessageId, onSpeak, onStopSpeak, scrollToMessage,
  instanceName, contactJid, contactAvatar,
}: MessageBubbleProps) {
  const isSent = message.sender === 'agent';
  const { avatarUrl } = useContactAvatar(message.contact_id, contactAvatar);
  
  const mediaRefreshKey = (instanceName && contactJid && message.external_id)
    ? { instanceName, remoteJid: contactJid, fromMe: isSent, id: message.external_id }
    : undefined;

  return (
    <div className={cn('flex group px-4 py-1 gap-2', isSent ? 'justify-end' : 'justify-start')}>
      {!isSent && (
        <Avatar className="w-8 h-8 shrink-0 self-end mb-1 ring-1 ring-border/30">
          <AvatarImage src={contactAvatar} />
          <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
            {(message.senderName || 'C').slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      <div className="max-w-[70%] space-y-1 relative">
        <div className={cn(
          "absolute top-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10",
          isSent ? "right-full mr-2" : "left-full ml-2"
        )}>
          <ActionButton icon={<Reply className="w-3.5 h-3.5" />} title="Responder" onClick={() => onReply(message)} />
          <ActionButton icon={<Forward className="w-3.5 h-3.5" />} title="Encaminhar" onClick={() => onForward(message)} />
          <ActionButton icon={<Copy className="w-3.5 h-3.5" />} title="Copiar" onClick={() => onCopy(message.content)} />
          {message.type === 'text' && (
            <TextToSpeechButton
              messageId={message.id} text={message.content}
              isLoading={ttsLoading} isPlaying={ttsPlaying} currentMessageId={ttsMessageId}
              onSpeak={onSpeak} onStop={onStopSpeak}
              className="p-1.5 rounded-full bg-card border border-border/50 shadow-sm"
            />
          )}
        </div>

        {message.is_deleted ? (
          <DeletedMessagePlaceholder isSent={isSent} content={message.content} />
        ) : (
          <div className={cn(
            'relative rounded-2xl shadow-sm transition-all overflow-hidden',
            (message.type === 'image' || message.type === 'video') && !message.content ? 'p-0' : 'px-4 py-2.5',
            isSent ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-card border border-border/30 text-foreground'
          )}>
            {message.replyTo && <QuotedMessage replyTo={message.replyTo} isSent={isSent} onClick={() => scrollToMessage(message.replyTo!.messageId)} />}
            {message.buttonResponse && <ButtonResponseBadge buttonTitle={message.buttonResponse.buttonTitle} isSent={isSent} />}
            {message.type === 'interactive' && message.interactive && <InteractiveMessageDisplay interactive={message.interactive} isSent={isSent} onButtonClick={onInteractiveButtonClick} />}
            {message.type === 'image' && message.mediaUrl && <div className="mb-2 rounded-lg overflow-hidden"><MessageImage src={message.mediaUrl} refreshKey={mediaRefreshKey} /></div>}
            {message.type === 'video' && message.mediaUrl && <div className="mb-2"><VideoPreview url={message.mediaUrl} caption={message.content} isSent={isSent} refreshKey={mediaRefreshKey} /></div>}
            {message.type === 'audio' && message.mediaUrl && <div className="mb-2"><AudioMessagePlayer audioUrl={message.mediaUrl} messageId={message.id} isSent={isSent} existingTranscription={message.transcription} transcriptionStatus={message.transcriptionStatus} refreshKey={mediaRefreshKey} /></div>}
            {message.type === 'document' && message.mediaUrl && <div className="mb-2"><DocumentPreview url={message.mediaUrl} fileName="document" isSent={isSent} /></div>}
            {message.type === 'location' && message.location && <LocationMessageDisplay location={message.location} isSent={isSent} />}
            {message.content && message.type === 'text' && <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>}
            <div className={cn('flex items-center gap-1 mt-1 text-[10px]', isSent ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
              <span>{formatMessageTime(message.timestamp)}</span>
              {isSent && <MessageStatusInline message={message} />}
            </div>
          </div>
        )}

        <MessageReactions messageId={message.id} isSent={isSent} />
      </div>
    </div>
  );
}

function ActionButton({ icon, title, onClick }: { icon: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onClick}
      className="p-1.5 rounded-full bg-card border border-border/50 text-muted-foreground hover:text-primary hover:bg-primary/10 shadow-sm"
      title={title}
    >
      {icon}
    </motion.button>
  );
}
