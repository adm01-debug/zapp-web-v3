import { useState } from 'react';
import { Mail, Plus, Settings, Wifi, WifiOff, RefreshCw, ChevronDown, LogOut, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { type GmailAccount } from '@/hooks/gmail/gmailTypes';
import { type TokenStatus } from '@/hooks/useGmailOAuthFlow';

interface GmailAccountSelectorProps {
  accounts: GmailAccount[];
  activeAccountId: string | null;
  tokenStatus: Record<string, TokenStatus>;
  isSyncing: boolean;
  onSelectAccount: (id: string) => void;
  onAddAccount: () => void;
  onDisconnect: (id: string) => void;
  onSync: () => void;
  onSettings?: () => void;
  totalUnread?: number;
  className?: string;
}

const TOKEN_STATUS_CONFIG: Record<TokenStatus, { icon: typeof Wifi; color: string; label: string }> = {
  loading:      { icon: RefreshCw, color: 'text-muted-foreground', label: 'Verificando...' },
  valid:        { icon: Wifi, color: 'text-green-500', label: 'Conectado' },
  expiring:     { icon: AlertTriangle, color: 'text-amber-500', label: 'Token expirando' },
  expired:      { icon: WifiOff, color: 'text-destructive', label: 'Sessão expirada — reconecte' },
  disconnected: { icon: WifiOff, color: 'text-muted-foreground', label: 'Desconectado' },
};

export function GmailAccountSelector({
  accounts,
  activeAccountId,
  tokenStatus,
  isSyncing,
  onSelectAccount,
  onAddAccount,
  onDisconnect,
  onSync,
  onSettings,
  totalUnread = 0,
  className,
}: GmailAccountSelectorProps) {
  const activeAccount = accounts.find(a => a.id === activeAccountId);
  const activeStatus = activeAccountId ? (tokenStatus[activeAccountId] ?? 'disconnected') : 'disconnected';
  const statusConfig = TOKEN_STATUS_CONFIG[activeStatus];
  const StatusIcon = statusConfig.icon;

  if (accounts.length === 0) {
    return (
      <Button
        variant="outline"
        size="sm"
        className={cn('gap-2 w-full', className)}
        onClick={onAddAccount}
      >
        <Plus className="h-4 w-4" />
        Conectar Gmail
      </Button>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/60 transition-colors min-w-0 flex-1">
            <div className="relative shrink-0">
              <Avatar className="h-7 w-7">
                <AvatarImage src={activeAccount?.picture_url ?? ''} alt={activeAccount?.display_name ?? ''} />
                <AvatarFallback className="text-xs bg-primary/20 text-primary">
                  {(activeAccount?.email ?? '?')[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {/* Status dot */}
              <span className={cn('absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background',
                activeStatus === 'valid' && 'bg-green-500',
                activeStatus === 'expiring' && 'bg-amber-500',
                activeStatus === 'expired' && 'bg-destructive',
                (activeStatus === 'loading' || activeStatus === 'disconnected') && 'bg-muted-foreground',
              )} />
            </div>

            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-medium truncate">{activeAccount?.display_name ?? activeAccount?.email}</p>
              <p className="text-[10px] text-muted-foreground truncate">{activeAccount?.email}</p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {totalUnread > 0 && (
                <Badge className="h-4 text-[10px] px-1.5">{totalUnread > 99 ? '99+' : totalUnread}</Badge>
              )}
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-64">
          {/* Status do token */}
          <div className={cn('flex items-center gap-2 px-3 py-2 text-xs', statusConfig.color)}>
            <StatusIcon className={cn('h-3.5 w-3.5 shrink-0', activeStatus === 'loading' && 'animate-spin')} />
            <span>{statusConfig.label}</span>
          </div>

          <DropdownMenuSeparator />

          {/* Outras contas */}
          {accounts.map(acc => {
            const status = tokenStatus[acc.id] ?? 'disconnected';
            const cfg = TOKEN_STATUS_CONFIG[status];
            const AccIcon = cfg.icon;

            return (
              <DropdownMenuItem
                key={acc.id}
                className={cn('gap-2', acc.id === activeAccountId && 'bg-muted/60')}
                onClick={() => onSelectAccount(acc.id)}
              >
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarImage src={acc.picture_url ?? ''} />
                  <AvatarFallback className="text-[10px]">{acc.email[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{acc.display_name ?? acc.email}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{acc.email}</p>
                </div>
                <AccIcon className={cn('h-3.5 w-3.5 shrink-0', cfg.color)} />
              </DropdownMenuItem>
            );
          })}

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={onAddAccount} className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar conta Gmail
          </DropdownMenuItem>

          <DropdownMenuItem onClick={onSync} disabled={isSyncing} className="gap-2">
            <RefreshCw className={cn('h-4 w-4', isSyncing && 'animate-spin')} />
            Sincronizar agora
          </DropdownMenuItem>

          {onSettings && (
            <DropdownMenuItem onClick={onSettings} className="gap-2">
              <Settings className="h-4 w-4" />
              Configurar Gmail
            </DropdownMenuItem>
          )}

          {activeAccountId && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 text-destructive focus:text-destructive"
                onClick={() => onDisconnect(activeAccountId)}
              >
                <LogOut className="h-4 w-4" />
                Desconectar {activeAccount?.email}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sync button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onSync}
            disabled={isSyncing}
          >
            <RefreshCw className={cn('h-4 w-4', isSyncing && 'animate-spin')} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Sincronizar inbox</TooltipContent>
      </Tooltip>
    </div>
  );
}
