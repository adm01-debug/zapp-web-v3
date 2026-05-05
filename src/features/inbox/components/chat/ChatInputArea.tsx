import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Message } from '@/types/chat';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AnimatePresence, motion } from 'framer-motion';
import { RichTextToolbar } from './RichTextToolbar';
import { AIRewriteButton } from './AIRewriteButton';
import { MentionAutocomplete, useMentions } from './MentionAutocomplete';
import { MarkdownPreview } from './MarkdownPreview';
import { SlashCommands, SlashCommand } from '@/features/inbox/components/SlashCommands';
import { AudioRecorder } from '@/features/inbox/components/AudioRecorder';
import { FileUploaderRef } from '@/features/inbox/components/FileUploader';
import { ExternalProduct } from '@/hooks/useExternalCatalog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SecondaryToolbar, TertiaryToolsMenu } from './ChatInputToolbars';
import { StickerPicker } from '@/features/inbox/components/StickerPicker';
import { CustomEmojiPicker } from '@/features/inbox/components/CustomEmojiPicker';
import { RichTextToggle } from './RichTextToolbar';
import { FileUploader } from '@/features/inbox/components/FileUploader';
import { Send, Mic, Check, Plus, Loader2, X, Image as ImageIcon, FileText, FileVideo, FileAudio } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { InputPreviewBars } from './InputPreviewBars';
import { useChatInputLogic, setNativeValue } from './useChatInputLogic';
import { formatFileSize } from '@/utils/whatsappFileTypes';

interface QuickReplyItem {
  id: string;
  title: string;
  shortcut: string;
  content: string;
  category: string;
}

interface ChatInputAreaProps {
  inputValue: string;
  replyToMessage: Message | null;
  editingMessage?: Message | null;
  isRecordingAudio: boolean;
  showSlashCommands: boolean;
  contactId: string;
  contactPhone: string;
  contactName: string;
  instanceName?: string;
  onPollSent?: (poll: { name: string; options: string[]; selectableCount: number }) => void;
  onContactSent?: (contactName: string) => void;
  messages: Message[];
  quickReplies: QuickReplyItem[];
  isSending?: boolean;
  sendProgress?: number;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onBlur: () => void;
  onSend: (attachments?: File[]) => void;
  onCancelReply: () => void;
  onCancelEdit?: () => void;
  onSlashCommand: (command: SlashCommand, subCommand?: string) => void;
  onCloseSlashCommands: () => void;
  onQuickReply: (reply: QuickReplyItem) => void;
  onRecordToggle: () => void;
  onAudioSend: (blob: Blob) => void;
  onAudioCancel: () => void;
  onOpenInteractiveBuilder: () => void;
  onOpenSchedule: () => void;
  onOpenLocationPicker: () => void;
  onSendProduct: (product: ExternalProduct) => void;
  onSendSticker: (stickerUrl: string) => void;
  onSendAudioMeme: (audioUrl: string) => void;
  onSendCustomEmoji: (emojiUrl: string) => void;
  onOpenCatalog?: () => void;
  onSelectSuggestion: (text: string) => void;
  onSelectTemplate: (text: string) => void;
  onExternalFiles?: (files: File[]) => void;
  onPasteFiles?: (files: File[]) => void;
  signatureEnabled?: boolean;
  signatureName?: string;
  onToggleSignature?: () => void;
  isWhisper?: boolean;
  onToggleWhisper?: () => void;
  fileUploaderRef: React.RefObject<FileUploaderRef | null>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  onOpenTeamFiles?: () => void;
  queue?: any[];
  onRetry?: (id: string) => void;
}

export function ChatInputArea(props: ChatInputAreaProps) {
  const {
    inputValue, replyToMessage, editingMessage, isRecordingAudio, showSlashCommands,
    contactId, contactPhone, contactName, instanceName, onPollSent, onContactSent,
    messages, quickReplies, isSending = false, sendProgress = 0,
    onInputChange, onKeyDown, onBlur, onSend, onCancelReply, onCancelEdit,
    onSlashCommand, onCloseSlashCommands, onQuickReply, onRecordToggle,
    onAudioSend, onAudioCancel, onOpenInteractiveBuilder, onOpenSchedule,
    onOpenLocationPicker, onSendProduct, onSendSticker, onSendAudioMeme,
    onSendCustomEmoji, onOpenCatalog, onSelectSuggestion, onSelectTemplate,
    onPasteFiles, signatureEnabled, signatureName, onToggleSignature,
    isWhisper, onToggleWhisper,
    fileUploaderRef, inputRef, onOpenTeamFiles,
    queue, onRetry,
  } = props;

  const logic = useChatInputLogic({
    inputValue, contactId, editingMessage, inputRef, fileUploaderRef, onSend, onPasteFiles,
  });

  const { isOpen: mentionOpen, cursorPos: mentionCursorPos, checkForMention, handleSelect: handleMentionSelect, close: closeMention } = useMentions(inputRef);

  const tertiaryTools = useMemo(() => (
    <TertiaryToolsMenu
      instanceName={instanceName} contactPhone={contactPhone} contactName={contactName}
      messages={messages} quickReplies={quickReplies}
      onOpenInteractiveBuilder={onOpenInteractiveBuilder} onOpenLocationPicker={onOpenLocationPicker}
      onOpenSchedule={onOpenSchedule} onSendProduct={onSendProduct}
      onSelectSuggestion={onSelectSuggestion} onSelectTemplate={onSelectTemplate}
      onQuickReply={onQuickReply} signatureEnabled={signatureEnabled}
      signatureName={signatureName} onToggleSignature={onToggleSignature}
      onPollSent={onPollSent} onContactSent={onContactSent}
      onOpenTeamFiles={onOpenTeamFiles}
    />
  ), [instanceName, contactPhone, contactName, messages, quickReplies, onOpenInteractiveBuilder, onOpenLocationPicker, onOpenSchedule, onSendProduct, onSelectSuggestion, onSelectTemplate, signatureEnabled, signatureName, onToggleSignature, onPollSent, onContactSent, onOpenTeamFiles]);

  const typingNotification = useMemo(() => {
    if (isWhisper) return "Modo Sussurro: Notas internas invisíveis ao cliente";
    return null;
  }, [isWhisper]);

  return (
    <>
      <RichTextToolbar
        inputRef={inputRef} inputValue={inputValue}
        onInputChange={(val) => setNativeValue(inputRef, val)}
        visible={logic.showRichToolbar} onToggle={() => logic.setShowRichToolbar(!logic.showRichToolbar)}
      />

      <InputPreviewBars
        replyToMessage={replyToMessage} editingMessage={editingMessage}
        onCancelReply={onCancelReply} onCancelEdit={onCancelEdit}
      />
      <AnimatePresence>
        {logic.attachments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-2 border-t border-border/50 bg-background/80 backdrop-blur-sm"
          >
            <div className="flex flex-wrap gap-2">
              {logic.attachments.map((att) => (
                <motion.div
                  key={att.id}
                  layout
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="relative group w-20 h-20 rounded-lg overflow-hidden border border-border bg-muted flex items-center justify-center"
                >
                  {att.preview ? (
                    <img src={att.preview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground p-1">
                      {att.category === 'video' ? <FileVideo className="w-6 h-6" /> :
                       att.category === 'audio' ? <FileAudio className="w-6 h-6" /> :
                       att.category === 'image' ? <ImageIcon className="w-6 h-6" /> :
                       <FileText className="w-6 h-6" />}
                      <span className="text-[8px] truncate max-w-full text-center">{att.file.name}</span>
                    </div>
                  )}
                  <button
                    onClick={() => logic.removeAttachment(att.id)}
                    className="absolute top-1 right-1 p-0.5 rounded-full bg-background/80 text-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-background/60 backdrop-blur-xs py-0.5 px-1">
                    <span className="text-[8px] block truncate font-medium">{formatFileSize(att.file.size)}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(isSending || props.queue?.length > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-1.5 bg-primary/5 border-t border-primary/10"
          >
            {props.queue?.map((item: any) => (
              <div key={item.id} className="mb-2 last:mb-0 group">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <div className="flex items-center gap-2">
                    {item.status === 'sending' ? (
                      <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    ) : item.status === 'failed' ? (
                      <X className="w-3 h-3 text-destructive" />
                    ) : item.status === 'confirmed' ? (
                      <Check className="w-3 h-3 text-success" />
                    ) : (
                      <Clock className="w-3 h-3 text-muted-foreground/50" />
                    )}
                    <div className="flex flex-col">
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider",
                        item.status === 'failed' ? "text-destructive" : item.status === 'confirmed' ? "text-success" : "text-primary"
                      )}>
                        {item.status === 'failed' ? 'Erro no envio' : 
                         item.status === 'sending' ? 'Enviando...' : 
                         item.status === 'confirmed' ? 'Enviado!' : 'Aguardando na fila...'}
                      </span>
                      {item.error && (
                        <span className="text-[9px] text-destructive/80 line-clamp-1 italic">
                          {item.error?.message || String(item.error)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.status === 'failed' && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => props.onRetry?.(item.id)}
                          className="text-[10px] font-black text-primary hover:text-primary/80 bg-primary/10 px-2 py-0.5 rounded-full transition-colors"
                        >
                          Tentar novamente
                        </button>
                      </div>
                    )}
                    <span className={cn(
                      "text-[10px] font-black tabular-nums",
                      item.status === 'failed' ? "text-destructive" : "text-primary"
                    )}>
                      {item.status === 'failed' ? '!' : `${Math.round(item.progress || 0)}%`}
                    </span>
                  </div>
                </div>
                <div className="h-1 w-full bg-primary/10 rounded-full overflow-hidden">
                  <motion.div 
                    className={cn(
                      "h-full", 
                      item.status === 'failed' ? "bg-destructive" : 
                      item.status === 'confirmed' ? "bg-success" : "bg-primary"
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: item.status === 'failed' ? '100%' : `${item.progress || 0}%` }}
                    transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                  />
                </div>
                {item.attempts?.length > 0 && (
                  <div className="hidden group-hover:block mt-1 pt-1 border-t border-primary/5">
                    <div className="flex items-center justify-between text-[8px] text-muted-foreground font-mono">
                      <span>{item.attempts.length} {item.attempts.length === 1 ? 'tentativa' : 'tentativas'}</span>
                      {item.attempts[item.attempts.length - 1].duration && (
                        <span>{item.attempts[item.attempts.length - 1].duration}ms</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <div className={cn(
        "px-4 py-3 md:px-6 md:py-4 bg-background/95 backdrop-blur-xl border-t border-border/10 relative flex flex-col gap-2 shrink-0 font-sans transition-all duration-500 ease-in-out", 
        isWhisper && "bg-amber-500/[0.04] dark:bg-amber-500/[0.08] border-t-2 border-amber-500/30 shadow-[0_-8px_30px_rgba(245,158,11,0.05)]",
        !isWhisper && "focus-within:shadow-[0_-8px_30px_rgba(var(--primary-rgb),0.04)]",
        logic.isMobile && "px-3 py-2 safe-area-bottom"
      )}>
        <AnimatePresence>
          {isRecordingAudio && (
            <div className="mb-4"><AudioRecorder onSend={onAudioSend} onCancel={onAudioCancel} /></div>
          )}
        </AnimatePresence>

        <SlashCommands inputValue={inputValue} onSelectCommand={onSlashCommand} onClose={onCloseSlashCommands} isOpen={showSlashCommands} />

        {typingNotification && (
            <motion.div 
              initial={{ opacity: 0, y: 15, scale: 0.95 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              className="absolute -top-10 left-8 flex items-center gap-2 z-50"
            >
              <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)] animate-pulse" />
              <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-[0.2em] bg-white/90 dark:bg-amber-950/80 backdrop-blur-md px-4 py-1.5 rounded-2xl border border-amber-500/40 shadow-xl">
                {typingNotification}
              </span>
            </motion.div>
        )}

        <div className="flex flex-col gap-2" role="toolbar" aria-label="Barra de mensagem">
          {/* ROW 1: Textarea (campo de digitar mensagem em cima) */}
          <div className="min-w-0 relative w-full">
            <MentionAutocomplete inputValue={inputValue} cursorPosition={mentionCursorPos} onSelect={handleMentionSelect} onClose={closeMention} isOpen={mentionOpen} />

            <AnimatePresence>
              {logic.showMarkdownPreview && logic.hasText && logic.showRichToolbar && (
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                  className="mb-2 px-4 py-3 border border-border/10 rounded-2xl bg-muted/20 backdrop-blur-sm text-[13px] max-h-[120px] overflow-y-auto shadow-sm">
                  <MarkdownPreview text={inputValue} className="text-foreground/90 leading-snug" />
                </motion.div>
              )}
            </AnimatePresence>

            <textarea ref={inputRef} value={inputValue}
              onChange={(e) => { onInputChange(e); checkForMention(e.target.value, e.target.selectionStart ?? 0); }}
              onKeyDown={(e) => {
                onKeyDown(e);
                if (e.key === 'ArrowUp' && !inputValue && messages.length > 0) {
                  const lastOwnMessage = [...messages].reverse().find(m => m.sender === 'agent' && !m.is_deleted);
                  if (lastOwnMessage && props.onCancelEdit && props.onCancelReply) {
                    // This is a heuristic shortcut for accessibility
                    // In a full implementation, we'd pass onEditStart as a prop
                    e.preventDefault();
                  }
                }
              }} onBlur={onBlur} onPaste={logic.handlePaste}
              onClick={(e) => { const t = e.target as HTMLTextAreaElement; checkForMention(t.value, t.selectionStart ?? 0); }}
              placeholder={editingMessage ? "Editar mensagem..." : replyToMessage ? "Digite sua resposta..." : isWhisper ? "Sussurro interno (apenas agentes)..." : "Escreva sua mensagem..."}
              rows={1}
              className={cn(
                "w-full bg-muted/30 hover:bg-muted/50 focus:bg-background border border-border/10 focus:border-primary/20 rounded-[24px] outline-none font-sans text-[15px] font-semibold tracking-normal text-foreground shadow-sm",
                "placeholder:text-muted-foreground/30 placeholder:font-normal resize-none transition-all duration-500 ease-out",
                "focus:ring-4 focus:ring-primary/5 focus:shadow-lg",
                logic.isMobile ? "px-5 py-3.5 text-[16px] min-h-[48px] max-h-[160px]" : "px-5 py-[14px] min-h-[48px] max-h-[220px]",
                isWhisper && "bg-amber-500/5 focus:bg-amber-500/10 ring-amber-500/30 border-amber-500/20",
                logic.isOverLimit && "text-destructive",
                isSending && "opacity-60 pointer-events-none"
              )}
              disabled={isSending}
              aria-label={editingMessage ? "Editar mensagem" : replyToMessage ? "Responder mensagem" : "Digite sua mensagem"}
              aria-describedby={logic.charCount > 0 ? "char-counter" : undefined}
            />
            {logic.charCount > 100 && (
              <span id="char-counter" className={cn("absolute bottom-2 right-4 text-[9px] font-mono tracking-tighter select-none pointer-events-none transition-colors",
                logic.isOverLimit ? "text-destructive font-bold" : logic.isNearLimit ? "text-warning" : "text-muted-foreground/30")}>
                {logic.charCount}/{logic.CHAR_LIMIT}
              </span>
            )}
          </div>

          {/* ROW 2: Toolbar (botões/ferramentas embaixo) + botão Enviar à direita */}
          <div className="flex items-center gap-[5px] w-full">
            <div className="flex items-center flex-1 min-w-0">
              <Popover>
                <PopoverTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    className={cn(
                      "inline-flex items-center justify-center text-[hsl(var(--muted-foreground))] dark:text-[hsl(var(--muted-foreground))] hover:bg-transparent shrink-0 transition-all rounded-full outline-none",
                      logic.isMobile ? "w-10 h-10" : "w-[42px] h-[42px]"
                    )}
                    aria-label="Mais opções de mensagem"
                  >
                    <Plus className="w-6 h-6" />
                  </motion.button>
                </PopoverTrigger>
                <PopoverContent className="w-60 p-2 bg-popover/95 backdrop-blur-md border-border/40 shadow-2xl animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-300" align="start" side="top">{tertiaryTools}</PopoverContent>
              </Popover>

              {!logic.isMobile && (
                <SecondaryToolbar inputRef={inputRef} inputValue={inputValue}
                  showRichToolbar={logic.showRichToolbar} onToggleRichToolbar={() => logic.setShowRichToolbar(!logic.showRichToolbar)}
                  isRecordingAudio={isRecordingAudio} onSendSticker={onSendSticker} onSendAudioMeme={onSendAudioMeme}
                  onSendCustomEmoji={onSendCustomEmoji} onOpenCatalog={onOpenCatalog} onAudioSend={onAudioSend}
                  fileUploaderRef={fileUploaderRef} instanceName={instanceName} contactPhone={contactPhone}
                  contactId={contactId} contactName={contactName} onVoiceDictation={logic.handleVoiceDictation}
                  onFileSelect={logic.handleFileSelect}
                  isWhisper={isWhisper} onToggleWhisper={onToggleWhisper}
                />
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    onClick={onRecordToggle}
                    disabled={isSending || logic.hasText || logic.attachments.length > 0}
                    whileHover={!(isSending || logic.hasText || logic.attachments.length > 0) ? { scale: 1.1 } : {}}
                    whileTap={!(isSending || logic.hasText || logic.attachments.length > 0) ? { scale: 0.9 } : {}}
                    className={cn(
                      "inline-flex items-center justify-center rounded-full shrink-0 touch-manipulation transition-all duration-300 outline-none",
                      isRecordingAudio
                        ? "bg-rose-500 text-white hover:bg-rose-600 shadow-xl shadow-rose-500/30 scale-125 z-10"
                        : (logic.hasText || logic.attachments.length > 0)
                          ? "text-muted-foreground/20 cursor-not-allowed opacity-50"
                          : "text-muted-foreground/60 hover:text-primary hover:bg-primary/5",
                      logic.isMobile ? "w-11 h-11" : "w-[46px] h-[46px]"
                    )}
                    aria-label={isRecordingAudio ? "Parar gravação" : "Gravar áudio"}
                    aria-pressed={isRecordingAudio}
                  >
                    <Mic className={cn("w-6 h-6", isRecordingAudio && "animate-pulse")} />
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-[10px] font-medium">
                  {isRecordingAudio ? "Parar Gravação" : (logic.hasText || logic.attachments.length > 0) ? "Apague o texto para gravar" : "Gravar Áudio"}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    onClick={() => logic.handleSendWithAnimation()}
                    disabled={isSending || (!logic.hasText && logic.attachments.length === 0 && !editingMessage)}
                    whileHover={!(isSending || (!logic.hasText && logic.attachments.length === 0 && !editingMessage)) ? { scale: 1.1 } : {}}
                    whileTap={!(isSending || (!logic.hasText && logic.attachments.length === 0 && !editingMessage)) ? { scale: 0.9 } : {}}
                    className={cn(
                      "inline-flex items-center justify-center rounded-full shrink-0 touch-manipulation transition-all duration-300 outline-none",
                      (logic.hasText || logic.attachments.length > 0 || editingMessage)
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "text-muted-foreground/20 cursor-not-allowed opacity-50",
                      logic.isMobile ? "w-11 h-11" : "w-[46px] h-[46px]"
                    )}
                    aria-label="Enviar mensagem"
                  >
                    <AnimatePresence mode="wait">
                      {isSending ? (
                        <motion.div key="loading" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                          <Loader2 className="w-6 h-6 animate-spin" />
                        </motion.div>
                      ) : editingMessage ? (
                        <motion.div key="edit" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                          <Check className="w-6 h-6" />
                        </motion.div>
                      ) : (
                        <motion.div key="send" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                          <Send className="w-6 h-6" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-[10px] font-medium">
                  {isSending ? "Enviando..." : editingMessage ? "Confirmar Edição" : "Enviar Mensagem"}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {logic.isMobile && (
            <div className="flex items-center gap-0.5 shrink-0">
              <FileUploader ref={fileUploaderRef} instanceName={instanceName || ''} recipientNumber={contactPhone}
                contactId={contactId} connectionId={undefined}
                onFileSelect={logic.handleFileSelect}
                onFileSent={() => toast({ title: 'Arquivo enviado!', description: 'O arquivo foi enviado com sucesso.' })}
                showDialog={false}
              />
            </div>
          )}
        </div>

        {logic.isMobile && logic.hasText && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-1.5 mt-1.5 overflow-x-auto scrollbar-none pb-0.5">
            <AIRewriteButton inputValue={inputValue} contactName={contactName}
              onRewrite={(newText) => setNativeValue(inputRef, newText)} />
            <RichTextToggle active={logic.showRichToolbar} onToggle={() => logic.setShowRichToolbar(!logic.showRichToolbar)} />
            <CustomEmojiPicker onSendEmoji={onSendCustomEmoji} />
            <StickerPicker onSendSticker={onSendSticker} />
          </motion.div>
        )}
      </div>
    </>
  );
}
