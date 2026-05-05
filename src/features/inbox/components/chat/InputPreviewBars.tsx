import { AnimatePresence, motion } from 'framer-motion';
import { Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReplyPreview } from '@/features/inbox/components/ReplyQuote';
import { Message } from '@/types/chat';

interface InputPreviewBarsProps {
  replyToMessage: Message | null;
  editingMessage?: Message | null;
  onCancelReply: () => void;
  onCancelEdit?: () => void;
}

export function InputPreviewBars({ replyToMessage, editingMessage, onCancelReply, onCancelEdit }: InputPreviewBarsProps) {
  return (
    <>
      <AnimatePresence>
        {replyToMessage && !editingMessage && (
          <ReplyPreview message={replyToMessage} onCancel={onCancelReply} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-4 mt-2"
          >
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-primary/10 border-2 border-primary/20 shadow-sm">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Pencil className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase font-black tracking-widest text-primary">Modo de Edição</span>
                <p className="text-sm text-muted-foreground/80 truncate font-medium">{editingMessage.content}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 border border-rose-500/20 rounded-full transition-all shrink-0"
                onClick={onCancelEdit}
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Cancelar Edição
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
