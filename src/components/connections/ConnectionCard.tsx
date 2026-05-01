import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Smartphone, MoreVertical, Trash2, Copy, QrCode, Wifi, WifiOff,
  Star, Clock, Loader2, RefreshCw, History, Link2, Settings, Boxes,
  BatteryCharging, BatteryLow, BatteryMedium, BatteryFull, ShieldCheck, Zap,
  AlertTriangle, Activity, ArrowUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { BusinessHoursIndicator } from './BusinessHoursIndicator';
import { OfficialApiConfigDialog } from './OfficialApiConfigDialog';
import type { WhatsAppConnection } from '@/hooks/useConnectionsManager';

/** Human-friendly status labels — no technical jargon */
const statusConfig: Record<string, { label: string; color: string; icon: typeof Wifi; bgClass: string }> = {
  connected: { label: 'Online', color: 'text-emerald-400', icon: Wifi, bgClass: 'bg-emerald-500/10 border-emerald-500/20' },
  disconnected: { label: 'Desconectado', color: 'text-red-400', icon: WifiOff, bgClass: 'bg-red-500/10 border-red-500/20' },
  connecting: { label: 'Conectando...', color: 'text-amber-400', icon: RefreshCw, bgClass: 'bg-amber-500/10 border-amber-500/20' },
  pending: { label: 'Aguardando QR', color: 'text-amber-400', icon: QrCode, bgClass: 'bg-amber-500/10 border-amber-500/20' },
};

/** Human-readable health reasons */
const HEALTH_REASON_LABEL: Record<string, { short: string; long: string; severe: boolean; action: string }> = {
  phantom_session: {
    short: 'Precisa reconectar',
    long: 'O WhatsApp perdeu a conex\u00e3o. Escaneie o QR Code novamente para voltar a receber mensagens.',
    severe: true,
    action: 'Reconectar agora',
  },
  webhook_silent: {
    short: 'Sem atividade recente',
    long: 'Nenhuma mensagem recebida nos \u00faltimos 30 minutos. Pode ser baixo volume ou um problema na conex\u00e3o.',
    severe: false,
    action: 'Verificar conex\u00e3o',
  },
  stale_session: {
    short: 'Sess\u00e3o expirada',
    long: 'Sem mensagens h\u00e1 mais de 6 horas. A conex\u00e3o provavelmente expirou \u2014 reconecte escaneando o QR Code.',
    severe: true,
    action: 'Reconectar',
  },
  socket_closed: { short: 'Conex\u00e3o perdida', long: 'A conex\u00e3o com o WhatsApp foi interrompida.', severe: true, action: 'Reconectar' },
  http_error: { short: 'Erro de comunica\u00e7\u00e3o', long: 'Houve um problema na comunica\u00e7\u00e3o com o servidor.', severe: true, action: 'Verificar' },
  timeout: { short: 'Sem resposta', long: 'O servidor n\u00e3o respondeu a tempo.', severe: true, action: 'Verificar' },
};

interface ConnectionCardProps {
  connection: WhatsAppConnection;
  syncingHistory: string | null;
  onShowQrCode: (c: WhatsAppConnection) => void;
  onCopyId: (id: string) => void;
  onDisconnect: (c: WhatsAppConnection) => void;
  onSetDefault: (id: string) => void;
  onSetApiType?: (c: WhatsAppConnection, api_type: 'evolution' | 'official') => void;
  onDelete: (c: WhatsAppConnection) => void;
  onBusinessHours: (id: string, name: string) => void;
  onQueues: (id: string, name: string) => void;
  onSettings: (instanceName: string, name: string) => void;
  onIntegrations: (instanceName: string, name: string) => void;
  onSyncHistory: (connection: WhatsAppConnection) => void;
}

export function ConnectionCard({
  connection, syncingHistory,
  onShowQrCode, onCopyId, onDisconnect, onSetDefault, onSetApiType, onDelete,
  onBusinessHours, onQueues, onSettings, onIntegrations, onSyncHistory,
}: ConnectionCardProps) {
  const status = statusConfig[connection.status] || statusConfig.disconnected;
  const StatusIcon = status.icon;
  const isOfficial = (connection.api_type ?? 'evolution') === 'official';
  const [officialConfigOpen, setOfficialConfigOpen] = useState(false);
  const [recheckingHealth, setRecheckingHealth] = useState(false);

  const reasonInfo = connection.health_reason ? HEALTH_REASON_LABEL[connection.health_reason] : null;
  const isPhantomLike = reasonInfo?.severe && connection.health_status !== 'healthy';
  const needsAttention = isPhantomLike || (connection.health_status === 'degraded');
  const isConnected = connection.status === 'connected' && !isPhantomLike;

  const handleRecheckNow = async () => {
    if (!connection.instance_id) return;
    setRecheckingHealth(true);
    try {
      const { error } = await supabase.functions.invoke('connection-health-check', {
        body: { instanceName: connection.instance_id },
      });
      if (error) throw error;
      toast({ title: 'Verifica\u00e7\u00e3o conclu\u00edda', description: 'O status foi atualizado.' });
    } catch (e: unknown) {
      toast({
        title: 'Falha na verifica\u00e7\u00e3o',
        description: e instanceof Error ? e.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setRecheckingHealth(false);
    }
  };

  // Determine the single primary action for this card
  const getPrimaryAction = () => {
    if (!isConnected && !isOfficial) {
      return {
        label: 'Reconectar',
        onClick: () => onShowQrCode(connection),
        variant: 'default' as const,
        className: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20',
        icon: QrCode,
      };
    }
    if (!isConnected && isOfficial && connection.instance_id) {
      return {
        label: 'Configurar',
        onClick: () => onSettings(connection.instance_id!, connection.name),
        variant: 'outline' as const,
        className: 'border-primary text-primary hover:bg-primary hover:text-primary-foreground',
        icon: ShieldCheck,
      };
    }
    if (isConnected) {
      return {
        label: 'Gerenciar',
        onClick: () => connection.instance_id && onSettings(connection.instance_id, connection.name),
        variant: 'outline' as const,
        className: 'border-secondary/40 text-muted-foreground hover:bg-secondary/20',
        icon: Settings,
      };
    }
    return null;
  };

  const primaryAction = getPrimaryAction();

  return (
    <motion.div whileHover={{ y: -1 }}>
      <Card className={cn(
        'border transition-all duration-200',
        isConnected && 'border-emerald-500/20 bg-card shadow-emerald-500/5 shadow-lg',
        !isConnected && needsAttention && 'border-amber-500/20 bg-card',
        !isConnected && !needsAttention && 'border-red-500/15 bg-card',
      )}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            {/* Left: Status orb + Info */}
            <div className="flex items-start gap-3 min-w-0 flex-1">
              {/* Status indicator orb */}
              <div className="relative mt-0.5 shrink-0">
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  isConnected ? 'bg-emerald-500/15' : needsAttention ? 'bg-amber-500/15' : 'bg-red-500/15',
                )}>
                  <StatusIcon className={cn(
                    'w-5 h-5',
                    isConnected ? 'text-emerald-400' : needsAttention ? 'text-amber-400' : 'text-red-400',
                    connection.status === 'connecting' && 'animate-spin',
                  )} />
                </div>
                {isConnected && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400 border-2 border-card" />
                  </span>
                )}
              </div>

              {/* Connection info */}
              <div className="min-w-0 flex-1">
                {/* Name + default badge */}
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground truncate">{connection.name}</h3>
                  {connection.is_default && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-violet-500/15 text-violet-300 border-violet-500/25">
                      <Star className="w-3 h-3 mr-0.5" />Principal
                    </Badge>
                  )}
                </div>

                {/* Phone + battery */}
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-sm text-muted-foreground">{connection.phone_number}</p>
                  {connection.battery_level != null && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      {connection.is_plugged ? <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" /> :
                       connection.battery_level <= 20 ? <BatteryLow className="w-3.5 h-3.5 text-red-400" /> :
                       connection.battery_level <= 50 ? <BatteryMedium className="w-3.5 h-3.5 text-amber-400" /> :
                       <BatteryFull className="w-3.5 h-3.5 text-emerald-400" />}
                      {connection.battery_level}%
                    </span>
                  )}
                  <BusinessHoursIndicator connectionId={connection.id} />
                </div>

                {/* Single status line */}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant="outline" className={cn('text-xs gap-1', status.bgClass, status.color)}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', isConnected ? 'bg-emerald-400' : needsAttention ? 'bg-amber-400' : 'bg-red-400')} />
                    {needsAttention ? (reasonInfo?.short ?? 'Inst\u00e1vel') : status.label}
                  </Badge>

                  {isConnected && connection.health_response_ms != null && (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <ArrowUpDown className="w-3 h-3" />
                      {connection.health_response_ms}ms
                    </span>
                  )}

                  {isConnected && connection.owner_jid && (
                    <span className="text-[11px] text-emerald-500/70">
                      {connection.owner_jid.split('@')[0]}
                    </span>
                  )}

                  {(connection.retry_count ?? 0) > 0 && (
                    <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400 bg-amber-500/10">
                      Tentativa {connection.retry_count}/{connection.max_retries || 5}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Primary action + menu */}
            <div className="flex items-center gap-2 shrink-0">
              {primaryAction && (
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    variant={primaryAction.variant}
                    size="sm"
                    onClick={primaryAction.onClick}
                    className={primaryAction.className}
                  >
                    <primaryAction.icon className="w-4 h-4 mr-1.5" />
                    {primaryAction.label}
                  </Button>
                </motion.div>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {/* Group: Connection */}
                  <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground tracking-wider">Conex\u00e3o</DropdownMenuLabel>
                  {!isOfficial && (
                    <DropdownMenuItem onClick={() => onShowQrCode(connection)}>
                      <QrCode className="w-4 h-4 mr-2" />Gerar QR Code
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem disabled={recheckingHealth || !connection.instance_id} onClick={handleRecheckNow}>
                    {recheckingHealth ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}
                    Verificar conex\u00e3o
                  </DropdownMenuItem>
                  {isConnected && (
                    <DropdownMenuItem onClick={() => onDisconnect(connection)}>
                      <WifiOff className="w-4 h-4 mr-2" />Desconectar
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />

                  {/* Group: Configuration */}
                  <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground tracking-wider">Configura\u00e7\u00e3o</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => onSetDefault(connection.id)}>
                    <Star className="w-4 h-4 mr-2" />Definir como principal
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onBusinessHours(connection.id, connection.name)}>
                    <Clock className="w-4 h-4 mr-2" />Hor\u00e1rio de atendimento
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onQueues(connection.id, connection.name)}>
                    <Link2 className="w-4 h-4 mr-2" />Vincular filas
                  </DropdownMenuItem>
                  {connection.instance_id && (
                    <DropdownMenuItem onClick={() => onSettings(connection.instance_id!, connection.name)}>
                      <Settings className="w-4 h-4 mr-2" />Configura\u00e7\u00f5es
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />

                  {/* Group: Advanced */}
                  <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground tracking-wider">Avan\u00e7ado</DropdownMenuLabel>
                  {connection.instance_id && (
                    <>
                      <DropdownMenuItem onClick={() => onIntegrations(connection.instance_id!, connection.name)}>
                        <Boxes className="w-4 h-4 mr-2" />Integra\u00e7\u00f5es (IA/Bots)
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled={syncingHistory === connection.id} onClick={() => onSyncHistory(connection)}>
                        {syncingHistory === connection.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <History className="w-4 h-4 mr-2" />}
                        Sincronizar hist\u00f3rico
                      </DropdownMenuItem>
                    </>
                  )}
                  {onSetApiType && (
                    <DropdownMenuItem onClick={() => onSetApiType(connection, isOfficial ? 'evolution' : 'official')}>
                      {isOfficial ? <Zap className="w-4 h-4 mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                      Mudar para {isOfficial ? 'QR Code' : 'API Oficial'}
                    </DropdownMenuItem>
                  )}
                  {isOfficial && (
                    <DropdownMenuItem onClick={() => setOfficialConfigOpen(true)}>
                      <ShieldCheck className="w-4 h-4 mr-2" />Configurar Cloud API
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onCopyId(connection.id)}>
                    <Copy className="w-4 h-4 mr-2" />Copiar ID
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  {/* Danger zone */}
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(connection)}>
                    <Trash2 className="w-4 h-4 mr-2" />Excluir conex\u00e3o
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Urgent action banner — contextual, only when needed */}
          {needsAttention && reasonInfo && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 px-3 py-2 rounded-lg bg-amber-500/8 border border-amber-500/15 flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-xs text-amber-200 truncate">{reasonInfo.long}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 shrink-0 h-7"
                onClick={() => reasonInfo.severe ? onShowQrCode(connection) : handleRecheckNow()}
              >
                {reasonInfo.action}
              </Button>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {isOfficial && (
        <OfficialApiConfigDialog
          open={officialConfigOpen}
          onOpenChange={setOfficialConfigOpen}
          connectionId={connection.id}
          connectionName={connection.name}
          instanceId={connection.instance_id}
        />
      )}
    </motion.div>
  );
}
