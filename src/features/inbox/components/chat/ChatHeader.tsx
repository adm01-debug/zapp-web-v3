import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { VisionIcon } from '@/features/inbox/components/ai-tools/VisionIcon';
import { Conversation, Message } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from '@/components/ui/motion';
import { TypingIndicatorCompact } from '@/features/inbox/components/TypingIndicator';
import { SLAIndicatorForContact } from '@/features/inbox/components/SLAIndicatorForContact';
import { ConversationHealth } from '@/features/inbox/components/ConversationHealth';
import { VoiceSelector } from '@/features/inbox/components/VoiceSelector';
import { KeyboardShortcutsHelp } from '@/features/inbox/components/KeyboardShortcutsHelp';
import { QueuePositionNotifier } from '@/features/inbox/components/QueuePositionNotifier';
import { RealtimeCollaboration } from '@/features/inbox/components/RealtimeCollaboration';
import { useExternalContact360 } from '@/hooks/useExternalContact360';
import { useContactIntelligence } from '@/hooks/useContactIntelligence';
import { isExternalConfigured } from '@/integrations/supabase/externalClient';
import { CrmBadges } from './CrmBadges';
import { BusinessHoursBadge } from '@/features/inbox/components/BusinessHoursBadge';
import { AnalysisBadges } from '@/features/inbox/components/AnalysisBadges';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Video, Tag, Archive, CheckCircle, Clock, ArrowRight, PhoneCall, Search, Brain, Info, Users, UserCheck, Truck, Wrench, LayoutGrid, Maximize2, Minimize2, ArrowLeft, XCircle, AlertCircle, EyeOff, Share2 } from 'lucide-react';
import { useContactAvatar } from '@/features/inbox';
import { useDensity } from '@/hooks/useDensity';

const contactTypeConfig: Record<string, { label: string; icon: typeof Users; color: string }> = {
  cliente: { label: 'Cliente', icon: Users, color: 'bg-info/10 text-info border-info/30' },
  colaborador: { label: 'Colaborador', icon: UserCheck, color: 'bg-success/10 text-success border-success/30' },
  fornecedor: { label: 'Fornecedor', icon: Truck, color: 'bg-secondary/10 text-secondary border-secondary/30' },
  prestador_servico: { label: 'Prestador', icon: Wrench, color: 'bg-warning/10 text-warning border-warning/30' },
  transportadora: { label: 'Transportadora', icon: Truck, color: 'bg-info/10 text-info border-info/30' },
};

interface ChatHeaderProps {
  conversation: Conversation;
  messages: Message[];
  isContactTyping: boolean;
  showAIAssistant: boolean;
  showDetails: boolean;
  voiceId: string;
  speed: number;
  onToggleAIAssistant: () => void;
  onToggleDetails: () => void;
  onStartCall: () => void;
  onOpenSearch: () => void;
  onOpenTransfer: () => void;
  onOpenSchedule: () => void;
  onVoiceChange: (voiceId: string) => void;
  onSpeedChange: (speed: number) => void;
  onBack?: () => void;
  onCloseConversation?: () => void;
  onGenerateSummary?: (tool?: any) => void;
  failuresOnly?: boolean;
  onToggleFailuresOnly?: () => void;
  failuresCount?: number;
  onOpenWhisper?: () => void;
  whisperCount?: number;
}

export const ChatHeader = memo(function ChatHeader({
  conversation, messages, isContactTyping, showAIAssistant, showDetails,
  voiceId, onToggleAIAssistant, onToggleDetails, onStartCall, onOpenSearch,
  onOpenTransfer, onOpenSchedule, onVoiceChange, onBack, onCloseConversation,
  onGenerateSummary, failuresOnly, onToggleFailuresOnly, failuresCount, onOpenWhisper, whisperCount,
}: ChatHeaderProps) {
  const { data: crmData } = useExternalContact360(isExternalConfigured ? conversation.contact.phone : undefined);
  const crmCompany = crmData?.found ? crmData.company : null;
  const crmCustomer = crmData?.found ? crmData.customer : null;
  const crmRfm = crmData?.found ? crmData.rfm : null;

  const { data: intel } = useContactIntelligence(isExternalConfigured ? conversation.contact.phone : undefined);
  const briefing = intel?.found ? intel.briefing : null;
  const { avatarUrl } = useContactAvatar(conversation.contact.id, conversation.contact.avatar);
  const { density, cycleDensity } = useDensity();

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut" }} className={cn(
      "flex items-center justify-between px-4 sm:px-6 border-b border-border/5 bg-[#f0f2f5] dark:bg-[#111b21] sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.08)]",
      density === 'comfortable' ? 'py-1.5' : 'py-1'
    )}>
      <div className="flex items-center gap-3">
        {onBack && (
          <Button variant="ghost" size="icon" className="w-8 h-8 lg:hidden rounded-full hover:bg-primary/5" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Avatar className="w-10 h-10 ring-0 shadow-none">
            <AvatarImage 
              src={avatarUrl || undefined} 
              referrerPolicy="no-referrer" 
              className="object-cover w-full h-full"
              onError={(e) => {
                (e.target as HTMLImageElement).removeAttribute('src');
              }}
            />
            <AvatarFallback className="bg-primary/5 text-primary text-xs font-semibold uppercase">
              {conversation.contact.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
        </motion.div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 flex-nowrap overflow-hidden">
            <h3 className="font-display font-bold text-[15px] tracking-tight text-foreground/90 truncate max-w-[180px] sm:max-w-md">
              {conversation.contact.name}
            </h3>
            <div className="flex-shrink-0 flex items-center gap-1">
              <SLAIndicatorForContact conversation={conversation} />
              <Badge variant="outline" className="text-[9px] h-4 px-1 capitalize border border-border/20 bg-muted/20 text-muted-foreground whitespace-nowrap">
                {conversation.status === 'open' ? 'Aberto' : conversation.status === 'pending' ? 'Pendente' : conversation.status === 'resolved' ? 'Resolvido' : 'Aguardando'}
              </Badge>
            </div>
          </div>
          <div className="flex items-center h-4">
            {isContactTyping ? (
              <span className="text-[12px] text-[#00a884] dark:text-[#00a884] font-normal">digitando...</span>
            ) : (
              <span className="text-[12px] text-[#667781] dark:text-[#8696a0] font-normal">{conversation.contact.phone}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {failuresCount != null && failuresCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={failuresOnly ? "destructive" : "ghost"} 
                size="sm" 
                className={cn(
                  "h-8 gap-1.5 px-2 animate-in fade-in slide-in-from-right-2",
                  !failuresOnly && "text-destructive hover:text-destructive hover:bg-destructive/10"
                )}
                onClick={onToggleFailuresOnly}
              >
                <AlertCircle className={cn("w-4 h-4", !failuresOnly && "animate-pulse")} />
                <span className="text-[11px] font-bold uppercase tracking-tight">{failuresCount} Falhas</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{failuresOnly ? 'Mostrar todas as mensagens' : 'Filtrar mensagens com erro'}</TooltipContent>
          </Tooltip>
        )}

        <RealtimeCollaboration contactId={conversation.contact.id} className="mr-1" />
        
        {onOpenWhisper && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-100/50"
                onClick={onOpenWhisper}
              >
                <div className="relative">
                  <EyeOff className="w-4 h-4" />
                  {whisperCount !== undefined && whisperCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-3.5 min-w-[14px] px-0.5 rounded-full bg-amber-500 text-[8px] font-bold text-white flex items-center justify-center ring-1 ring-white">
                      {whisperCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-tight hidden sm:inline">Equipe</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Abrir Modo Sussurro (Chat Interno - Alt+W)</TooltipContent>
          </Tooltip>
        )}
        {[
          { icon: Search, label: 'Buscar (Ctrl+K)', onClick: onOpenSearch },
          { icon: PhoneCall, label: 'Iniciar chamada', onClick: onStartCall },
          { icon: Video, label: 'Videochamada', onClick: undefined },
        ].map(({ icon: Icon, label, onClick }) => (
          <Tooltip key={label}>
            <TooltipTrigger asChild>
              <motion.div whileHover={{ scale: 1.1, y: -1 }} whileTap={{ scale: 0.9 }}>
                <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-[#667781] dark:text-[#8696a0] hover:bg-transparent transition-all" onClick={onClick} aria-label={label}>
                  <Icon className="w-4 h-4" />
                </Button>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent className="text-[10px] font-medium">{label}</TooltipContent>
          </Tooltip>
        ))}

        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button variant="ghost" size="icon" className={cn("text-muted-foreground hover:text-primary hover:bg-primary/10", showAIAssistant && "text-primary bg-primary/10")} onClick={onToggleAIAssistant} aria-label="Visão">
                <VisionIcon className="w-4 h-4" />
              </Button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent>Visão</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button variant="ghost" size="icon" className={cn("text-muted-foreground hover:text-primary hover:bg-primary/10 relative", showDetails && "text-primary bg-primary/10")} onClick={onToggleDetails} aria-label="Detalhes do contato">
                <Info className="w-4 h-4" />
                {!showDetails && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary animate-pulse" />}
              </Button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent>Detalhes do contato</TooltipContent>
        </Tooltip>

        <VoiceSelector selectedVoiceId={voiceId} onVoiceChange={onVoiceChange} />
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:text-primary hover:bg-primary/10" 
                onClick={cycleDensity} 
                aria-label={`Densidade: ${density}`}
              >
                {density === 'comfortable' ? <Maximize2 className="w-4 h-4" /> : density === 'compact' ? <LayoutGrid className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </Button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent>Densidade: {density === 'comfortable' ? 'Confortável' : density === 'compact' ? 'Compacto' : 'Denso'}</TooltipContent>
        </Tooltip>

        <KeyboardShortcutsHelp />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary hover:bg-primary/10" aria-label="Mais opções">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </motion.div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-card border-border/30">
            <DropdownMenuItem><Tag className="w-4 h-4 mr-2" />Adicionar tag</DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenTransfer}><ArrowRight className="w-4 h-4 mr-2" />Transferir</DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenSchedule}><Clock className="w-4 h-4 mr-2" />Agendar mensagem</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onGenerateSummary}><Brain className="w-4 h-4 mr-2" />Gerar Resumo</DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleFailuresOnly} className={cn(failuresOnly && "text-destructive font-medium")}>
              <XCircle className="w-4 h-4 mr-2" />
              {failuresOnly ? 'Ocultar Falhas' : `Ver Falhas (${failuresCount || 0})`}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem><CheckCircle className="w-4 h-4 mr-2" />Marcar como resolvido</DropdownMenuItem>
            <DropdownMenuItem><Archive className="w-4 h-4 mr-2" />Arquivar</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onGenerateSummary?.('teamFiles')}>
              <Share2 className="w-4 h-4 mr-2 text-amber-600" />
              Arquivos da Equipe
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onCloseConversation} className="text-destructive">
              <XCircle className="w-4 h-4 mr-2" />Encerrar Conversa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
});
