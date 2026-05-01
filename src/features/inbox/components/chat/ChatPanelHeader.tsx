import { cn } from '@/lib/utils';
import { Conversation } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { TypingIndicatorCompact } from '../TypingIndicator';
import { useIsMobile } from '@/hooks/use-mobile';
import { SLAIndicatorForContact } from '../SLAIndicatorForContact';
import { ChatHeaderToolbar } from './ChatHeaderToolbar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { MoreVertical, Tag, Archive, CheckCircle, Clock, ArrowRight, ArrowLeft, ExternalLink, XCircle } from 'lucide-react';
import { openChatPopup } from '@/lib/popupManager';
import { useContactAvatar } from '@/features/inbox';

interface ChatMessage { id: string; content: string; sender: string; timestamp: string; }
type ActiveTool = 'chatSearch' | 'objections' | 'university' | 'aiAssistant' | 'summary' | null;

interface ChatPanelHeaderProps {
  conversation: Conversation;
  isContactTyping: boolean;
  showAIAssistant: boolean;
  showDetails?: boolean;
  showSummaryPanel?: boolean;
  activeTool?: ActiveTool;
  onSetActiveTool?: (tool: ActiveTool) => void;
  voiceId: string;
  speed: number;
  onToggleAIAssistant: () => void;
  onToggleDetails?: () => void;
  onStartCall: () => void;
  onOpenSearch: () => void;
  onOpenTransfer: () => void;
  onOpenSchedule: () => void;
  onVoiceChange: (voiceId: string) => void;
  onSpeedChange: (speed: number) => void;
  onBack?: () => void;
  onGenerateSummary?: () => void;
  isSummaryLoading?: boolean;
  canGenerateSummary?: boolean;
  onCloseConversation?: () => void;
  lastMessages?: string[];
  allMessages?: ChatMessage[];
  onSelectSuggestion?: (text: string) => void;
  sendState?: 'idle' | 'retrying' | 'failed';
  failuresOnly?: boolean;
  onToggleFailuresOnly?: () => void;
  failuresCount?: number;
}

export function ChatPanelHeader({
  conversation, isContactTyping, showAIAssistant, showDetails, showSummaryPanel,
  onToggleAIAssistant, onToggleDetails, onOpenSearch, onOpenTransfer, onOpenSchedule,
  onBack, onGenerateSummary, isSummaryLoading, onCloseConversation, activeTool, onSetActiveTool,
  sendState = 'idle', failuresOnly, onToggleFailuresOnly, failuresCount,
}: ChatPanelHeaderProps) {
  const isMobile = useIsMobile();
  const { avatarUrl } = useContactAvatar(conversation.contact.id, conversation.contact.avatar);

  return (
    <div className="flex items-center justify-between px-3 md:px-5 h-[56px] md:h-[65px] border-b border-border bg-card shrink-0">
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        {isMobile && onBack && (
          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-xl shrink-0 touch-manipulation" onClick={onBack} aria-label="Voltar">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <div className="relative shrink-0">
          <Avatar className="w-9 h-9 md:w-10 md:h-10">
            <AvatarImage 
              src={avatarUrl || undefined} 
              referrerPolicy="no-referrer" 
              onError={(e) => {
                (e.target as HTMLImageElement).removeAttribute('src');
              }}
            />
            <AvatarFallback className="bg-primary/15 text-primary font-semibold text-sm">
              {conversation.contact.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[hsl(var(--online))] border-2 border-card" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground text-[15px]">{conversation.contact.name}</h3>
            <SLAIndicatorForContact conversation={conversation} />
            {sendState === 'retrying' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-warning/15 text-warning border border-warning/30">
                <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                Tentando reenviar…
              </span>
            )}
            {sendState === 'failed' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-destructive/15 text-destructive border border-destructive/30">
                Última mensagem falhou
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {isContactTyping ? <TypingIndicatorCompact isVisible={true} /> : (
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--online))]" />Online</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-0.5">
        <ChatHeaderToolbar
          activeTool={activeTool} showAIAssistant={showAIAssistant} showDetails={showDetails}
          showSummaryPanel={showSummaryPanel} isSummaryLoading={isSummaryLoading}
          onOpenSearch={onOpenSearch} onSetActiveTool={onSetActiveTool}
          onToggleAIAssistant={onToggleAIAssistant} onToggleDetails={onToggleDetails}
          onGenerateSummary={onGenerateSummary}
          failuresOnly={failuresOnly} onToggleFailuresOnly={onToggleFailuresOnly} failuresCount={failuresCount}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-muted"
              aria-label="Mais ações"
              title="Mais ações"
            >
              <MoreVertical className="w-[18px] h-[18px]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-popover border-border">
            <DropdownMenuItem onClick={() => openChatPopup(conversation.contact.id, conversation.contact.name)}>
              <ExternalLink className="w-4 h-4 mr-2" />Abrir em popup
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem><Tag className="w-4 h-4 mr-2" />Adicionar tag</DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenTransfer}><ArrowRight className="w-4 h-4 mr-2" />Transferir</DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenSchedule}><Clock className="w-4 h-4 mr-2" />Agendar mensagem</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem><CheckCircle className="w-4 h-4 mr-2" />Marcar como resolvido</DropdownMenuItem>
            <DropdownMenuItem><Archive className="w-4 h-4 mr-2" />Arquivar</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onCloseConversation} className="text-destructive focus:text-destructive">
              <XCircle className="w-4 h-4 mr-2" />Encerrar Conversa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
