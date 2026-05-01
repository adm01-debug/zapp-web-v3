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
  AlertTriangle, Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { BusinessHoursIndicator } from './BusinessHoursIndicator';
import { OfficialApiConfigDialog } from './OfficialApiConfigDialog';
import type { WhatsAppConnection } from '@/features/connections';

/** Human-friendly status — no jargon. */
const statusConfig: Record<string, { label: string; color: string; icon: typeof Wifi; bgClass: string }> = {
  connected: { label: 'Online', color: 'text-emerald-400', icon: Wifi, bgClass: 'bg-emerald-500/10 border-emerald-500/20' },
  disconnected: { label: 'Desconectado', color: 'text-red-400', icon: WifiOff, bgClass: 'bg-red-500/10 border-red-500/20' },
  connecting: { label: 'Conectando...', color: 'text-amber-400', icon: RefreshCw, bgClass: 'bg-amber-500/10 border-amber-500/20' },
  pending: { label: 'Aguardando QR', color: 'text-amber-400', icon: QrCode, bgClass: 'bg-amber-500/10 border-amber-500/20' },
};

/** Human-friendly health reason labels. */
const HEALTH_REASON_LABEL: Record<string, { short: string; long: string; severe: boolean }> = {
  phantom_session: { short: 'Precisa reconectar', long: 'A sessão perdeu vínculo com o WhatsApp. Escaneie o QR Code novamente.', severe: true },
  webhook_silent: { short: 'Sem atividade recente', long: 'Nenhuma mensagem recebida nos últimos 30 minutos.', severe: false },
  stale_session: { short: 'Sessão expirada', long: 'Sem mensagens há mais de 6 horas — reconecte.', severe: true },
  socket_closed: { short: 'Precisa reconectar', long: 'A conexão com o WhatsApp foi perdida.', severe: true },
  http_error: { short: 'Erro na conexão', long: 'O servidor não está respondendo corretamente.', severe: true },
  timeout: { short: 'Sem resposta', long: 'O servidor não respondeu a tempo.', severe: true },
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
  const isOfficial = (connection.api_type ?? 'evolution') === 'official';
  const [officialConfigOpen, setOfficialConfigOpen] = useState(false);
  const [recheckingHealth, setRecheckingHealth] = useState(false);
  const isConnected = connection.status === 'connected';

  const reasonInfo = connection.health_reason ? HEALTH_REASON_LABEL[connection.health_reason] : null;
  const isPhantomLike = reasonInfo?.severe && connection.health_status !== 'healthy';
  const needsAction = isPhantomLike || connection.status === 'disconnected';

  const handleRecheckNow = async () => {
    if (!connection.instance_id) return;
    setRecheckingHealth(true);
    try {
      const { error } = await supabase.functions.invoke('connection-health-check', {
        body: { instanceName: connection.instance_id },
      });
      if (error) throw error;
      toast({ title: 'Verificação concluída', description: 'O status foi atualizado.' });
    } catch (e: unknown) {
      toast({ title: 'Falha na verificação', description: e instanceof Error ? e.message : 'Erro desconhecido', variant: 'destructive' });
    } finally {
      setRecheckingHealth(false);
    }
  };

  const getLastActivity = () => {
    if (!connection.updated_at) return null;
    const diff = Date.now() - new Date(connection.updated_at).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins} min atrás`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h atrás`;
    return `${Math.floor(hours / 24)}d atrás`;
  };

  return (
    <motion.div whileHover={{ y: -2, boxShadow: '0 8px 30px hsl(var(--primary) / 0.08)' }}>
      <Card className={cn(
        'border transition-all overflow-hidden',
        isConnected && !isPhantomLike
          ? 'border-emerald-500/20 bg-card shadow-emerald-500/5 shadow-lg'
          : needsAction
            ? 'border-red-500/20 bg-card shadow-red-500/5 shadow-lg'
            : 'border-secondary/20 bg-card',
      )}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            {/* Left: Status orb + info */}
            <div className="flex items-start gap-3 min-w-0">
              <div className="relative mt-0.5 shrink-0">
                <motion.div
                  animate={connection.status === 'connecting' ? { rotate: 360 } : {}}
                  transition={{ duration: 1, repeat: connection.status === 'connecting' ? Infinity : 0, ease: 'linear' }}
                  className={cn(
                    'w-11 h-11 rounded-full flex items-center justify-center',
                    isConnected && !isPhantomLike ? 'bg-emerald-500/15' : needsAction ? 'bg-red-500/15' : 'bg-muted',
                  )}
                >
                  <Smartphone className={cn('w-5 h-5', isConnected && !isPhantomLike ? 'text-emerald-400' : needsAction ? 'text-red-400' : 'text-muted-foreground')} />
                </motion.div>
                {isConnected && !isPhantomLike && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400 border-2 border-card" />
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold truncate">{connection.name}</h3>
                  {connection.is_default && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 shrink-0">
                      <Star className="w-3 h-3 mr-0.5" />Principal
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-sm text-muted-foreground">{connection.phone_number}</p>
                  {connection.battery_level != null && (
                    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                      {connection.is_plugged ? <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" /> :
                       connection.battery_level <= 20 ? <BatteryLow className="w-3.5 h-3.5 text-destructive" /> :
                       connection.battery_level <= 50 ? <BatteryMedium className="w-3.5 h-3.5 text-amber-400" /> :
                       <BatteryFull className="w-3.5 h-3.5 text-emerald-400" />}
                      {connection.battery_level}%
                    </span>
                  )}
                </div>

                {/* Single status line */}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Badge variant="outline" className={cn('text-[11px] px-2 py-0.5 gap-1.5 font-medium', status.bgClass, status.color)}>
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0',
                      isConnected && !isPhantomLike ? 'bg-emerald-400' : needsAction ? 'bg-red-400' : 'bg-amber-400'
                    )} />
                    {isPhantomLike ? (reasonInfo?.short ?? 'Precisa reconectar') : status.label}
                  </Badge>

                  {isConnected && !isPhantomLike && getLastActivity() && (
                    <span className="text-[11px] text-muted-foreground">Atualizado {getLastActivity()}</span>
                  )}

                  {connection.health_response_ms != null && isConnected && (
                    <span className="text-[10px] text-muted-foreground">{connection.health_response_ms}ms</span>
                  )}

                  {(connection.retry_count ?? 0) > 0 && (
                    <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">
                      Tentativa {connection.retry_count}/{connection.max_retries || 5}
                    </Badge>
                  )}

                  <BusinessHoursIndicator connectionId={connection.id} />
                </div>
              </div>
            </div>

            {/* Right: single primary action + menu */}
            <div className="flex items-center gap-2 shrink-0">
              {(connection.status !== 'connected' || isPhantomLike) && !isOfficial && (
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button size="sm" onClick={() => onShowQrCode(connection)}
                    className="bg-whatsapp text-primary-foreground hover:bg-whatsapp/90 shadow-lg shadow-whatsapp/20">
                    <QrCode className="w-4 h-4 mr-1.5" />Reconectar
                  </Button>
                </motion.div>
              )}
              {connection.status !== 'connected' && isOfficial && connection.instance_id && (
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button variant="outline" size="sm" onClick={() => onSettings(connection.instance_id!, connection.name)}
                    className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                    <ShieldCheck className="w-4 h-4 mr-1.5" />Configurar
                  </Button>
                </motion.div>
              )}
              {connection.status === 'connected' && !isPhantomLike && (
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button variant="outline" size="sm" className="text-muted-foreground" onClick={() => onDisconnect(connection)}>
                    <WifiOff className="w-4 h-4 mr-1.5" />Desconectar
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
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Conexão</DropdownMenuLabel>
                  <DropdownMenuItem disabled={recheckingHealth || !connection.instance_id} onClick={handleRecheckNow}>
                    {recheckingHealth ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}
                    Verificar agora
                  </DropdownMenuItem>
                  {!isOfficial && (
                    <DropdownMenuItem onClick={() => onShowQrCode(connection)}>
                      <QrCode className="w-4 h-4 mr-2" />Gerar QR Code
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onSetDefault(connection.id)}>
                    <Star className="w-4 h-4 mr-2" />Definir como principal
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Configuração</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => onBusinessHours(connection.id, connection.name)}>
                    <Clock className="w-4 h-4 mr-2" />Horário de Atendimento
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onQueues(connection.id, connection.name)}>
                    <Link2 className="w-4 h-4 mr-2" />Vincular Filas
                  </DropdownMenuItem>
                  {connection.instance_id && (
                    <>
                      <DropdownMenuItem onClick={() => onSettings(connection.instance_id!, connection.name)}>
                        <Settings className="w-4 h-4 mr-2" />Configurações & Perfil
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onIntegrations(connection.instance_id!, connection.name)}>
                        <Boxes className="w-4 h-4 mr-2" />Integrações (IA/Bots)
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

                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Avançado</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => onCopyId(connection.id)}>
                    <Copy className="w-4 h-4 mr-2" />Copiar ID
                  </DropdownMenuItem>
                  {connection.instance_id && (
                    <DropdownMenuItem disabled={syncingHistory === connection.id} onClick={() => onSyncHistory(connection)}>
                      {syncingHistory === connection.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <History className="w-4 h-4 mr-2" />}
                      Sincronizar Histórico
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(connection)}>
                    <Trash2 className="w-4 h-4 mr-2" />Excluir conexão
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Urgent action banner */}
          {needsAction && !isOfficial && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 px-3 py-2 rounded-lg bg-red-500/8 border border-red-500/15 flex items-center gap-2"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span className="text-xs text-red-300">
                {reasonInfo?.long ?? 'Esta conexão está desconectada. Escaneie o QR Code para reconectar.'}
              </span>
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
