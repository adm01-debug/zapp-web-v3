import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Message } from '@/types/chat';
import { Button } from '@/components/ui/button';
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
        {isSending && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-1.5 bg-primary/5 border-t border-primary/10"
          >
            <div className="flex items-center justify-between gap-3 mb-1">
              <span className="text-[10px] font-medium text-primary uppercase tracking-wider">Enviando...</span>
              <span className="text-[10px] font-bold text-primary">{Math.round(sendProgress)}%</span>
            </div>
            <div className="h-1 w-full bg-primary/10 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${sendProgress}%` }}
                transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className={cn(
        "px-4 py-3 bg-background border-t border-border/40 relative flex flex-col gap-2 shrink-0 font-sans transition-colors duration-300", 
        isWhisper && "bg-amber-500/[0.03] dark:bg-amber-500/[0.05] border-t border-amber-500/20",
        logic.isMobile && "px-2 py-2 safe-area-bottom"
      )}>
        <AnimatePresence>
          {isRecordingAudio && (
            <div className="mb-4"><AudioRecorder onSend={onAudioSend} onCancel={onAudioCancel} /></div>
          )}
        </AnimatePresence>

        <SlashCommands inputValue={inputValue} onSelectCommand={onSlashCommand} onClose={onCloseSlashCommands} isOpen={showSlashCommands} />

        {typingNotification && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="absolute -top-7 left-6 flex items-center gap-2"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse" />
            <span className="text-[10px] font-bold text-amber-600/80 uppercase tracking-widest bg-amber-50/80 dark:bg-amber-950/60 backdrop-blur-sm px-2.5 py-0.5 rounded-full border border-amber-200/30">
              {typingNotification}
            </span>
          </motion.div>
        )}

        <div className="flex items-end gap-[5px]" role="toolbar" aria-label="Barra de mensagem">
          <div className="flex items-center">
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

          <div className="flex-1 min-w-0 relative">
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
              onKeyDown={onKeyDown} onBlur={onBlur} onPaste={logic.handlePaste}
              onClick={(e) => { const t = e.target as HTMLTextAreaElement; checkForMention(t.value, t.selectionStart ?? 0); }}
              placeholder={editingMessage ? "Editar mensagem..." : replyToMessage ? "Digite sua resposta..." : isWhisper ? "Sussurro interno (apenas agentes)..." : "Escreva sua mensagem..."}
              rows={1}
              className={cn(
                "w-full bg-accent/50 hover:bg-accent focus:bg-white dark:focus:bg-accent/80 border-none rounded-2xl outline-none font-sans text-[14px] font-medium tracking-tight text-[hsl(var(--foreground))] shadow-none",
                "placeholder:text-[hsl(var(--muted-foreground))/60 placeholder:font-normal resize-none transition-all duration-200",
                "focus:ring-2 focus:ring-primary/20",
                logic.isMobile ? "px-4 py-2.5 text-[15px] min-h-[44px] max-h-[160px]" : "px-4 py-[11px] min-h-[44px] max-h-[200px]",
                isWhisper && "bg-amber-500/10 focus:bg-amber-500/15",
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

          <div className="flex items-center gap-1.5 shrink-0 ml-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button 
                  onClick={(!logic.hasText && logic.attachments.length === 0 && !editingMessage) ? onRecordToggle : logic.handleSendWithAnimation}
                  disabled={logic.isOverLimit || isSending}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9, rotate: (logic.hasText || logic.attachments.length > 0) ? 10 : 0 }}
                  className={cn(
                    "inline-flex items-center justify-center rounded-full shrink-0 touch-manipulation transition-all duration-300 outline-none",
                    isRecordingAudio 
                      ? "bg-destructive text-white hover:bg-destructive/90 shadow-lg shadow-destructive/20 scale-110" 
                      : "text-[hsl(var(--muted-foreground))] dark:text-[hsl(var(--muted-foreground))] hover:text-primary dark:hover:text-primary",
                    logic.isMobile ? "w-10 h-10" : "w-[42px] h-[42px]",
                    logic.sendAnimation && "motion-safe:animate-bounce"
                  )}
                  aria-label={editingMessage ? "Confirmar edição" : (logic.hasText || logic.attachments.length > 0 ? "Enviar mensagem" : "Gravar áudio")}>
                  <AnimatePresence mode="wait">
                    {isSending ? (
                      <motion.div key="loading" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                        <Loader2 className="w-5 h-5 animate-spin" />
                      </motion.div>
                    ) : editingMessage ? (
                      <motion.div key="edit" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                        <Check className="w-5 h-5" />
                      </motion.div>
                    ) : (logic.hasText || logic.attachments.length > 0) ? (
                      <motion.div key="send" initial={{ opacity: 0, scale: 0.5, rotate: -20 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, scale: 0.5, rotate: 20 }}>
                        <Send className="w-6 h-6" />
                      </motion.div>
                    ) : (
                      <motion.div key="mic" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                        <Mic className={cn("w-5 h-5 md:w-6 md:h-6", isRecordingAudio && "animate-pulse")} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[10px] font-medium">Enviar</TooltipContent>
            </Tooltip>
            {/* Mic button handled by send button logic to mimic WhatsApp toggle */}
          </div>

          {/* SecondaryToolbar moved to the left side of textarea to match WA web */}

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
