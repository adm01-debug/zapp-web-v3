import { useRef, useState, useCallback, useMemo, forwardRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ConversationWithMessages } from '@/hooks/useRealtimeMessages';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { getAvatarColor, getInitials } from '@/lib/avatar-colors';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Pin, Gift } from 'lucide-react';
import { TypingIndicatorCompact } from './TypingIndicator';
import { useContactTyping } from '@/hooks/useContactTyping';
import { useInViewport } from '@/hooks/useInViewport';
import { useContactAvatar } from '@/hooks/realtime/useContactAvatar';

interface VirtualizedRealtimeListProps {
  conversations: ConversationWithMessages[];
  selectedContactId: string | null;
  onSelectConversation: (contactId: string) => void;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelection?: (contactId: string) => void;
  onMarkAsRead?: (contactId: string) => void;
  onArchive?: (contactId: string) => void;
  onPin?: (contactId: string) => void;
  pinnedIds?: Set<string>;
}

const ITEM_HEIGHT = 80;
const EMPTY_SET = new Set<string>();

/**
 * Linha de preview que escuta o canal `typing:${contactId}` e troca o conteúdo
 * por "digitando…" enquanto o contato está compondo. Sub-componente para que o
 * hook `useContactTyping` seja chamado por linha (regra dos Hooks).
 *
 * Otimização: o canal Realtime só é assinado quando a linha está dentro do
 * viewport (via `useInViewport`), evitando 1 canal por conversa em listas
 * longas. Margem de 200px antecipa a entrada e sticky de 1.5s reduz churn.
 */
const ConversationPreviewLine = forwardRef<HTMLDivElement, { contactId: string; fallback: string }>(
  function ConversationPreviewLine({ contactId, fallback }, _ref) {
    const localRef = useRef<HTMLDivElement>(null);
    const inView = useInViewport(localRef, { rootMargin: '200px', keepVisibleMs: 1500 });
    const isTyping = useContactTyping(contactId, inView);
    return (
      <div ref={localRef} className="text-[13px] min-h-[1em]">
        {isTyping ? (
          <TypingIndicatorCompact isVisible={true} />
        ) : (
          <p className="text-muted-foreground truncate">{fallback}</p>
        )}
      </div>
    );
  }
);

export function VirtualizedRealtimeList({
  conversations,
  selectedContactId,
  onSelectConversation,
  selectionMode = false,
  selectedIds = EMPTY_SET,
  onToggleSelection,
  onMarkAsRead,
  onArchive,
  onPin,
  pinnedIds = EMPTY_SET,
}: VirtualizedRealtimeListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Filter out invalid conversations
  const safeConversations = useMemo(() => {
    if (!Array.isArray(conversations)) return [];
    return conversations.filter(c => c?.contact?.id);
  }, [conversations]);

  // Sort: pinned first, then by last message date
  const sortedConversations = useMemo(() => {
    return [...safeConversations].sort((a, b) => {
      const aPin = pinnedIds.has(a.contact.id);
      const bPin = pinnedIds.has(b.contact.id);
      if (aPin && !bPin) return -1;
      if (!aPin && bPin) return 1;
      const aTime = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0;
      const bTime = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0;
      return bTime - aTime;
    });
  }, [safeConversations, pinnedIds]);

  const virtualizer = useVirtualizer({
    count: sortedConversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5,
  });

  const handleClick = useCallback((contactId: string, e: React.MouseEvent) => {
    if (selectionMode && onToggleSelection) {
      e.preventDefault();
      onToggleSelection(contactId);
    } else {
      onSelectConversation(contactId);
    }
  }, [selectionMode, onToggleSelection, onSelectConversation]);

  if (sortedConversations.length === 0) {
    return null;
  }

  return (
    <div ref={parentRef} className="h-full overflow-auto scrollbar-thin">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const conversation = sortedConversations[virtualRow.index];
          if (!conversation?.contact?.id) return null;

          return (
            <ConversationItem 
              key={conversation.contact.id}
              conversation={conversation}
              virtualRow={virtualRow}
              selectedContactId={selectedContactId}
              selectedIds={selectedIds}
              pinnedIds={pinnedIds}
              selectionMode={selectionMode}
              onToggleSelection={onToggleSelection}
              onSelectConversation={onSelectConversation}
              handleClick={handleClick}
            />
          );
          );
        })}
      </div>
    </div>
  );
}
