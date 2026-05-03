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
  // Configurable SLA Thresholds (could be moved to a config file or context)
  const SLA_THRESHOLDS = {
    response_time: { excellent: 5, good: 15, regular: 60 }, // minutes
    failure_rate: { excellent: 0, good: 0.05, regular: 0.15 }, // percentage
  };

  const metrics = useMemo(() => {
    const contactMessages = messages.filter(m => m.sender === 'contact');
    const agentMessages = messages.filter(m => m.sender === 'agent');
    const failedMessages = agentMessages.filter(m => m.status === 'failed' || m.status === 'failed_auth' || m.status === 'failed_retries');
    
    if (contactMessages.length === 0 && agentMessages.length === 0) {
      return { score: 100, label: 'Novo', color: 'text-info', icon: Zap, details: { responseTime: 0, msgPerMin: 0, failureRate: 0 } };
    }

    // Response time calculation
    let totalResponseTimeMs = 0;
    let responseCount = 0;
    
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].sender === 'contact') {
        // Find next agent message
        const nextAgent = messages.slice(i + 1).find(m => m.sender === 'agent');
        if (nextAgent) {
          totalResponseTimeMs += nextAgent.timestamp.getTime() - messages[i].timestamp.getTime();
          responseCount++;
        }
      }
    }

    const avgResponseTimeMin = responseCount > 0 ? (totalResponseTimeMs / responseCount) / 60000 : 0;
    
    // Messages per minute (in the last 10 minutes)
    const tenMinAgo = Date.now() - 10 * 60000;
    const recentMessages = messages.filter(m => m.timestamp.getTime() > tenMinAgo);
    const msgPerMin = recentMessages.length / 10;

    // Failure rate
    const failureRate = agentMessages.length > 0 ? failedMessages.length / agentMessages.length : 0;

    // Calculate score
    let score = 100;
    
    // Impact of response time
    if (avgResponseTimeMin > SLA_THRESHOLDS.response_time.regular) score -= 40;
    else if (avgResponseTimeMin > SLA_THRESHOLDS.response_time.good) score -= 20;
    else if (avgResponseTimeMin > SLA_THRESHOLDS.response_time.excellent) score -= 5;

    // Impact of failure rate
    if (failureRate > SLA_THRESHOLDS.failure_rate.regular) score -= 30;
    else if (failureRate > SLA_THRESHOLDS.failure_rate.good) score -= 15;

    let label = 'Excelente';
    let color = 'text-success';
    let icon = ShieldCheck;

    if (score < 40) { label = 'Crítico'; color = 'text-destructive'; icon = AlertCircle; }
    else if (score < 70) { label = 'Regular'; color = 'text-warning'; icon = Clock; }
    else if (score < 90) { label = 'Bom'; color = 'text-success/80'; icon = Activity; }

    return { 
      score, label, color, icon, 
      details: { 
        responseTime: avgResponseTimeMin, 
        msgPerMin, 
        failureRate: failureRate * 100 
      } 
    };
  }, [messages]);

  const Icon = metrics.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div 
          whileHover={{ scale: 1.05 }}
          className={cn("flex items-center gap-1.5 cursor-help", className)}
        >
          <div className={cn("p-1 rounded-full bg-background/50 border border-border/20 shadow-sm", metrics.color)}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col -space-y-0.5">
            <span className="text-[10px] uppercase tracking-tighter font-bold opacity-50">SLA</span>
            <span className={cn("text-xs font-bold leading-none", metrics.color)}>{metrics.label}</span>
          </div>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="w-64 p-3 bg-card border-border/50 shadow-xl">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">Saúde da Conversa</span>
            <Badge variant="outline" className={cn("text-[10px] font-bold", metrics.color)}>{metrics.score}%</Badge>
          </div>
          
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${metrics.score}%` }}
              className={cn("h-full", metrics.score > 70 ? 'bg-success' : metrics.score > 40 ? 'bg-warning' : 'bg-destructive')}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/20">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Tempo Resposta</span>
              <span className="text-xs font-mono">{metrics.details.responseTime.toFixed(1)} min</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Msg / min</span>
              <span className="text-xs font-mono">{metrics.details.msgPerMin.toFixed(1)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Taxa Falha</span>
              <span className={cn("text-xs font-mono", metrics.details.failureRate > 10 ? 'text-destructive' : 'text-foreground')}>
                {metrics.details.failureRate.toFixed(1)}%
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">SLA Status</span>
              <span className={cn("text-xs font-bold", metrics.color)}>{metrics.label}</span>
            </div>
          </div>
          
          <p className="text-[10px] text-muted-foreground leading-tight italic">
            Métricas baseadas em SLAs configuráveis. Um score baixo pode indicar gargalos no atendimento ou falhas técnicas.
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
