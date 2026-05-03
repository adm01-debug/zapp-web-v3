import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { SmilePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AggregatedReaction } from '@/features/inbox/hooks/team-chat/useTeamMessageReactions';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '🎉'];
const EXTENDED_EMOJIS = [
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
    <div className={cn('flex items-center gap-1 flex-wrap mt-1', isMine ? 'justify-end' : 'justify-start')}>
      {reactions.map((r) => (
        <button
          key={r.emoji}
          onClick={() => onToggle(r.emoji)}
          className={cn(
            'flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-all',
            'hover:scale-110 active:scale-95',
            r.reactedByMe
              ? 'bg-primary/15 border-primary/40 text-primary font-medium'
              : 'bg-background/80 border-border/40 text-foreground hover:bg-muted'
          )}
          aria-label={`${r.emoji} reagido por ${r.count} pessoa(s)`}
          data-testid={`reaction-${messageId}-${r.emoji}`}
        >
          <span className="text-sm leading-none">{r.emoji}</span>
          <span className="text-[10px] tabular-nums">{r.count}</span>
        </button>
      ))}

      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              'opacity-0 group-hover:opacity-100 transition-opacity',
              'h-6 w-6 rounded-full flex items-center justify-center',
              'border border-border/40 bg-background/80 hover:bg-muted text-muted-foreground'
            )}
            aria-label="Adicionar reação"
            data-testid={`reaction-trigger-${messageId}`}
          >
            <SmilePlus className="w-3 h-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align={isMine ? 'end' : 'start'}
          className="w-auto p-2 bg-popover border-border"
        >
          <div className="grid grid-cols-8 gap-1">
            {EXTENDED_EMOJIS.map((emoji) => (
              <Button
                key={emoji}
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-lg hover:scale-125 transition-transform"
                onClick={() => handlePick(emoji)}
                aria-label={`Reagir com ${emoji}`}
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
