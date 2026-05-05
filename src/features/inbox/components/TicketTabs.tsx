import { useMemo, useState } from 'react';
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
      <div className="flex items-center gap-0.5 bg-accent/30 rounded-xl p-1 border border-border/20 shadow-xs font-sans">
        {mainTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = mainTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onMainTabChange(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-300',
                isActive
                  ? tab.activeColor + ' shadow-md scale-[1.02]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <Badge 
                  variant="outline"
                  className={cn(
                    'h-4 min-w-[16px] px-1 text-[9px] font-bold leading-none border transition-colors',
                    isActive 
                      ? 'bg-primary-foreground/20 text-inherit border-primary-foreground/30' 
                      : 'bg-transparent text-muted-foreground border-border/40'
                  )}
                >
                  {tab.count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Sub-tabs for "Abertos" — separated visually */}
      {mainTab === 'open' && (
        <div className="flex items-center gap-0.5 px-0.5 flex-wrap border-t border-border/40 pt-2 mt-0.5">
          {subTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = subTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSubTabChange(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-all duration-200 border shadow-xs font-sans',
                  isActive
                    ? 'bg-primary/10 text-primary border-primary/40'
                    : 'bg-muted/10 text-muted-foreground hover:text-foreground hover:bg-muted/30 border-transparent'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                <span className={cn(
                  'text-[10px] font-bold tabular-nums',
                  isActive ? 'text-primary' : 'text-muted-foreground/70'
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
              <SelectTrigger className={cn("h-6 w-auto text-[10px] border-border/40 bg-transparent px-2 gap-1", isMobile ? "min-w-[60px] max-w-[90px]" : "min-w-[80px] max-w-[120px]")}>
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
