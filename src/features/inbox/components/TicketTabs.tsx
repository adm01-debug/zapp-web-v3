import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MessageSquare, CheckCircle2, Search, Users, Headphones, Clock } from 'lucide-react';
import { useAuth } from '@/features/auth';
import { useUserRole } from '@/features/auth';
import { useQueues } from '@/hooks/useQueues';
import { useAllTicketStates } from '@/features/inbox';
import { ConversationWithMessages } from '@/features/inbox';

export type MainTab = 'open' | 'resolved' | 'search';
export type SubTab = 'attending' | 'waiting';

interface TicketTabsProps {
  conversations: ConversationWithMessages[];
  mainTab: MainTab;
  subTab: SubTab;
  onMainTabChange: (tab: MainTab) => void;
  onSubTabChange: (tab: SubTab) => void;
  showAll: boolean;
  onShowAllChange: (value: boolean) => void;
  selectedQueueId: string | null;
  onQueueChange: (queueId: string | null) => void;
}

export function TicketTabs({
  conversations,
  mainTab,
  subTab,
  onMainTabChange,
  onSubTabChange,
  showAll,
  onShowAllChange,
  selectedQueueId,
  onQueueChange,
}: TicketTabsProps) {
  const { user } = useAuth();
  const { isSupervisor } = useUserRole();
  const { queues } = useQueues();
  const ticketStates = useAllTicketStates();
  const isMobile = useIsMobile();
  // Operação ampla — supervisor+ vê todos os tickets (admin e dev incluídos por hierarquia).
  const canShowAll = isSupervisor;

  // Conta tickets pelo overlay real (open/in_progress/resolved). Quando
  // um contato ainda não tem registro, assumimos `open` (bootstrap).
  const counts = useMemo(() => {
    const userId = user?.id;
    let openCount = 0;
    let attending = 0;
    let waiting = 0;
    let resolved = 0;
    for (const c of conversations) {
      const t = ticketStates[c.contact.id];
      const status = t?.status ?? 'open';
      const assigned = t?.assignedTo ?? c.contact.assigned_to ?? null;
      if (status === 'resolved') {
        resolved += 1;
      } else {
        openCount += 1;
        if (assigned && assigned === userId) attending += 1;
        if (!assigned) waiting += 1;
      }
    }
    return { open: openCount, attending, waiting, resolved };
  }, [conversations, ticketStates, user?.id]);

  const mainTabs = [
    { 
      id: 'open' as MainTab, 
      label: 'Abertos', 
      icon: MessageSquare, 
      count: counts.open,
      activeColor: 'bg-primary text-primary-foreground',
    },
    { 
      id: 'resolved' as MainTab, 
      label: 'Resolvidos', 
      icon: CheckCircle2, 
      count: counts.resolved,
      activeColor: 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]',
    },
    { 
      id: 'search' as MainTab, 
      label: 'Busca', 
      icon: Search, 
      count: null,
      activeColor: 'bg-muted-foreground text-background',
    },
  ];

  const subTabs = [
    {
      id: 'attending' as SubTab,
      label: 'Atendendo',
      icon: Headphones,
      count: counts.attending,
    },
    {
      id: 'waiting' as SubTab,
      label: 'Aguardando',
      icon: Clock,
      count: counts.waiting,
    },
  ];

  return (
    <div className="space-y-2">
      {/* Main Tabs */}
      <div className="flex items-center gap-1 bg-muted/30 dark:bg-muted/10 rounded-2xl p-1 border border-border/20 shadow-sm font-sans">
        {mainTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = mainTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onMainTabChange(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-bold transition-all duration-500 ease-out relative overflow-hidden',
                isActive
                  ? tab.activeColor + ' shadow-lg scale-[1.02] ring-1 ring-white/10'
                  : 'text-muted-foreground/70 hover:text-foreground hover:bg-muted/60'
              )}
            >
              <Icon className={cn("w-4 h-4 transition-transform duration-500", isActive && "scale-110")} />
              <span className="tracking-tight">{tab.label}</span>
              {tab.count !== null && (
                <Badge 
                  variant="outline"
                  className={cn(
                    'h-4.5 min-w-[18px] px-1.5 text-[9px] font-black leading-none border-0 transition-all duration-500 shadow-sm',
                    isActive 
                      ? 'bg-white/20 text-white' 
                      : 'bg-muted/60 text-muted-foreground/60'
                  )}
                >
                  {tab.count}
                </Badge>
              )}
              {isActive && (
                <motion.div
                  layoutId="activeTabGlow"
                  className="absolute inset-0 bg-white/5 pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Sub-tabs for "Abertos" — separated visually */}
      {mainTab === 'open' && (
        <div className="flex items-center gap-1 px-0.5 flex-wrap border-t border-border/10 pt-3 mt-1 animate-in fade-in slide-in-from-top-1 duration-500">
          {subTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = subTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSubTabChange(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-bold transition-all duration-300 border shadow-sm font-sans relative overflow-hidden',
                  isActive
                    ? 'bg-primary/5 text-primary border-primary/20 shadow-primary/5'
                    : 'bg-muted/20 text-muted-foreground/60 hover:text-foreground hover:bg-muted/40 border-transparent'
                )}
              >
                <Icon className={cn("w-3.5 h-3.5 transition-transform", isActive && "rotate-[10deg]")} />
                {tab.label}
                <span className={cn(
                  'text-[10px] font-black tabular-nums bg-muted/40 px-1.5 py-0.5 rounded-md ml-1',
                  isActive ? 'text-primary' : 'text-muted-foreground/40'
                )}>
                  {tab.count}
                </span>
              </button>
            );
          })}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Queue filter */}
          {queues.length > 0 && (
            <Select 
              value={selectedQueueId || 'all'} 
              onValueChange={(v) => onQueueChange(v === 'all' ? null : v)}
            >
              <SelectTrigger className={cn("h-7 w-auto text-[10px] font-bold border-border/20 bg-accent/10 px-3 gap-2 rounded-full hover:bg-accent/20 transition-all", isMobile ? "min-w-[70px] max-w-[100px]" : "min-w-[90px] max-w-[140px]")}>
                <SelectValue placeholder="Fila" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">{isMobile ? 'Todas' : 'Todas filas'}</SelectItem>
                {queues.map(q => (
                  <SelectItem key={q.id} value={q.id} className="text-xs">
                    <div className="flex items-center gap-1.5">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: q.color || 'hsl(var(--primary))' }} 
                      />
                      {q.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Admin: Show All toggle */}
      {canShowAll && mainTab === 'open' && (
        <div className="flex items-center gap-2 bg-muted/20 px-2 py-1.5 rounded-lg border border-border/10">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-3 h-3 text-primary" />
            </div>
            <Label htmlFor="show-all" className="text-[11px] font-semibold text-muted-foreground cursor-pointer uppercase tracking-tight">
              Todos Atendentes
            </Label>
          </div>
          <Switch
            id="show-all"
            checked={showAll}
            onCheckedChange={onShowAllChange}
            className="h-4 w-7 data-[state=checked]:bg-primary"
          />
        </div>
      )}
    </div>
  );
}
