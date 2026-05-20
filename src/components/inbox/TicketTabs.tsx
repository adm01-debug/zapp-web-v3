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
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useQueues } from '@/hooks/useQueues';
import { ConversationWithMessages } from '@/hooks/useRealtimeMessages';

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
  const { isAdmin, isSupervisor } = useUserRole();
  const { queues } = useQueues();
  const isMobile = useIsMobile();
  const canShowAll = isAdmin || isSupervisor;

  // Count conversations by category
  const counts = useMemo(() => {
    const userId = user?.id;
    
    // Open = has unread messages or has recent activity (not resolved)
    const openConversations = conversations.filter(c => {
      const hasMessages = c.messages.length > 0;
      return hasMessages; // All with messages are "open" for now
    });

    // Attending = assigned to current user
    const attending = openConversations.filter(c => 
      c.contact.assigned_to === userId
    );

    // Waiting = not assigned to anyone (in queue)
    const waiting = openConversations.filter(c => 
      !c.contact.assigned_to
    );

    // Resolved = no unread, no recent messages (contacts with no messages)
    const resolved = conversations.filter(c => 
      c.messages.length === 0
    );

    return {
      open: openConversations.length,
      attending: attending.length,
      waiting: waiting.length,
      resolved: resolved.length,
    };
  }, [conversations, user?.id]);

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
      <div className="flex items-center gap-0.5 bg-muted/40 rounded-lg p-0.5">
        {mainTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = mainTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onMainTabChange(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all duration-200',
                isActive
                  ? tab.activeColor + ' shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              )}
            >
              <Icon className="w-3 h-3" />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <Badge 
                  variant="outline"
                  className={cn(
                    'h-4 min-w-[16px] px-1 text-[9px] font-bold leading-none border',
                    isActive 
                      ? 'bg-primary-foreground/15 text-inherit border-primary-foreground/25' 
                      : 'bg-transparent text-muted-foreground border-border/60'
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
                  'flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition-all',
                  isActive
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent'
                )}
              >
                <Icon className="w-3 h-3" />
                {tab.label}
                <span className={cn(
                  'text-[10px] font-bold',
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
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Users className="w-3 h-3 text-muted-foreground" />
            <Label htmlFor="show-all" className="text-[10px] text-muted-foreground cursor-pointer">
              Mostrar Todos
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
