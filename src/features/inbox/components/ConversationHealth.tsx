import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, Zap, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Conversation, Message } from '@/types/chat';

interface ConversationHealthProps {
  conversation: Conversation;
  messages: Message[];
  className?: string;
}

export function ConversationHealth({ conversation, messages, className }: ConversationHealthProps) {
  // Simple heuristics for health
  const health = useMemo(() => {
    const contactMessages = messages.filter(m => m.sender === 'contact');
    const agentMessages = messages.filter(m => m.sender === 'agent');
    
    if (contactMessages.length === 0) return { score: 100, label: 'Novo', color: 'text-info', icon: Zap };

    // Response time (very simple)
    const lastContactMsg = contactMessages[contactMessages.length - 1];
    const lastAgentMsg = agentMessages[agentMessages.length - 1];
    
    let responseTimeMs = 0;
    if (lastAgentMsg && lastContactMsg && lastAgentMsg.timestamp > lastContactMsg.timestamp) {
      responseTimeMs = lastAgentMsg.timestamp.getTime() - lastContactMsg.timestamp.getTime();
    } else if (lastContactMsg) {
      responseTimeMs = Date.now() - lastContactMsg.timestamp.getTime();
    }

    const minutes = responseTimeMs / 60000;
    
    if (minutes < 5) return { score: 95, label: 'Excelente', color: 'text-success', icon: ShieldCheck };
    if (minutes < 15) return { score: 80, label: 'Bom', color: 'text-success/80', icon: Activity };
    if (minutes < 60) return { score: 60, label: 'Regular', color: 'text-warning', icon: Clock };
    return { score: 30, label: 'Crítico', color: 'text-destructive', icon: AlertCircle };
  }, [messages]);

  const Icon = health.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div 
          whileHover={{ scale: 1.05 }}
          className={cn("flex items-center gap-1.5 cursor-help", className)}
        >
          <div className={cn("p-1 rounded-full bg-background/50 border border-border/20 shadow-sm", health.color)}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col -space-y-0.5">
            <span className="text-[10px] uppercase tracking-tighter font-bold opacity-50">Saúde</span>
            <span className={cn("text-xs font-bold leading-none", health.color)}>{health.label}</span>
          </div>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="w-56 p-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Score de Engajamento</span>
            <Badge variant="outline" className={cn("text-[10px]", health.color)}>{health.score}%</Badge>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${health.score}%` }}
              className={cn("h-full", health.score > 70 ? 'bg-success' : health.score > 40 ? 'bg-warning' : 'bg-destructive')}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Basado no tempo de resposta e frequência de interação. Mantenha o score acima de 80% para garantir a satisfação do cliente.
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
