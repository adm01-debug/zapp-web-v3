import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { SmilePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AggregatedReaction } from '@/features/inbox/hooks/team-chat/useTeamMessageReactions';

export const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '🎉'];
export const EXTENDED_EMOJIS = [
  ...QUICK_EMOJIS,
  '👏', '💯', '✅', '❌', '👀', '🤔', '😍', '😎',
  '🚀', '💪', '🙌', '👌', '✨', '⭐', '💡', '☕',
];

interface Props {
  messageId: string;
  reactions: AggregatedReaction[];
  isMine: boolean;
  onToggle: (emoji: string) => void;
}

export function MessageReactions({ messageId, reactions, isMine, onToggle }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const handlePick = (emoji: string) => {
    onToggle(emoji);
    setPickerOpen(false);
  };

  return (
    <div 
      className={cn('flex items-center gap-1 flex-wrap mt-1', isMine ? 'justify-end' : 'justify-start')}
      role="group"
      aria-label="Reações da mensagem"
    >
      {reactions.map((r) => (
        <button
          key={r.emoji}
          onClick={() => onToggle(r.emoji)}
          className={cn(
            'flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary',
            'hover:scale-110 active:scale-95',
            r.reactedByMe
              ? 'bg-primary/20 border-primary/50 text-primary font-bold shadow-md ring-1 ring-primary/20'
              : 'bg-background/80 border-border/40 text-foreground hover:bg-muted'
          )}
          aria-pressed={r.reactedByMe}
          aria-label={`${r.emoji}, ${r.count} reações. ${r.reactedByMe ? 'Você reagiu.' : 'Clique para reagir.'}`}
          data-testid={`reaction-${messageId}-${r.emoji}`}
        >
          <span className="text-sm leading-none" aria-hidden="true">{r.emoji}</span>
          <span className="text-[10px] tabular-nums font-semibold">{r.count}</span>
        </button>
      ))}

      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              'opacity-0 group-hover:opacity-100 transition-opacity focus-visible:opacity-100',
              'h-6 w-6 rounded-full flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-primary',
              'border border-border/40 bg-background/80 hover:bg-muted text-muted-foreground'
            )}
            aria-label="Adicionar reação"
            data-testid={`reaction-trigger-${messageId}`}
          >
            <SmilePlus className="w-3.5 h-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align={isMine ? 'end' : 'start'}
          className="w-auto p-2 bg-popover border-border shadow-xl animate-in fade-in zoom-in duration-150"
          role="dialog"
          aria-label="Escolher um emoji"
        >
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-1" role="grid">
            {EXTENDED_EMOJIS.map((emoji) => (
              <Button
                key={emoji}
                size="icon"
                variant="ghost"
                className="h-9 w-9 text-xl hover:scale-125 hover:bg-muted transition-all focus-visible:ring-2 focus-visible:ring-primary"
                onClick={() => handlePick(emoji)}
                aria-label={`Reagir com ${emoji}`}
                role="gridcell"
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
