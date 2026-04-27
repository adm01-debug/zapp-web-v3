import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Smartphone, MoreVertical, Trash2, Copy, QrCode, Wifi, WifiOff,
  Star, Clock, Loader2, RefreshCw, History, Link2, Settings, Boxes,
  BatteryCharging, BatteryLow, BatteryMedium, BatteryFull, ShieldCheck, Zap,
  AlertTriangle, Activity,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { BusinessHoursIndicator } from './BusinessHoursIndicator';
import { OfficialApiConfigDialog } from './OfficialApiConfigDialog';
import type { WhatsAppConnection } from '@/hooks/useConnectionsManager';

const statusConfig: Record<string, { label: string; color: string; icon: typeof Wifi }> = {
  connected: { label: 'Conectado', color: 'bg-status-online', icon: Wifi },
  disconnected: { label: 'Desconectado', color: 'bg-status-offline', icon: WifiOff },
  connecting: { label: 'Conectando...', color: 'bg-status-away', icon: RefreshCw },
  pending: { label: 'Aguardando QR', color: 'bg-status-away', icon: QrCode },
};

/** Mensagens human-friendly para o motivo retornado pelo health check 3-camadas. */
const HEALTH_REASON_LABEL: Record<string, { short: string; long: string; severe: boolean }> = {
  phantom_session: {
    short: 'Sessão fantasma',
    long: 'O servidor Evolution mantém o socket aberto, mas nenhum número está pareado. Reconecte escaneando o QR Code novamente.',
    severe: true,
  },
  webhook_silent: {
    short: 'Webhook silencioso',
    long: 'Sem eventos recebidos nos últimos 30 minutos. Pode ser baixo volume ou um webhook quebrado.',
    severe: false,
  },
  stale_session: {
    short: 'Sessão obsoleta',
    long: 'Sem mensagens há mais de 6 horas. A sessão provavelmente perdeu vínculo com o WhatsApp — reconecte.',
    severe: true,
  },
  socket_closed: { short: 'Socket fechado', long: 'A Evolution API reportou socket fechado.', severe: true },
  http_error: { short: 'Erro HTTP', long: 'Resposta de erro da Evolution API.', severe: true },
  timeout: { short: 'Timeout', long: 'A Evolution API não respondeu a tempo.', severe: true },
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
  // Sessão fantasma: o DB ainda pode estar 'connected' por uma janela curta antes do próximo health-check derrubar.
  // Forçamos visualização de "Atenção" e habilitamos o QR mesmo se status === 'connected'.
  const isPhantomLike = reasonInfo?.severe && connection.health_status !== 'healthy';
  const showAttentionBadge = isPhantomLike || (connection.health_status === 'degraded');

  const handleRecheckNow = async () => {
    if (!connection.instance_id) return;
    setRecheckingHealth(true);
    try {
      const { error } = await supabase.functions.invoke('connection-health-check', {
        body: { instanceName: connection.instance_id },
      });
      if (error) throw error;
      toast({ title: 'Verificação concluída', description: 'O status real foi atualizado.' });
    } catch (e: unknown) {
      toast({
        title: 'Falha na verificação',
        description: e instanceof Error ? e.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setRecheckingHealth(false);
    }
  };

  return (
    <motion.div whileHover={{ y: -2, boxShadow: '0 8px 30px hsl(var(--primary) / 0.1)' }}>
      <Card className="border border-secondary/20 bg-card hover:border-secondary/40 transition-all">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div
                animate={connection.status === 'connecting' ? { rotate: 360 } : {}}
                transition={{ duration: 1, repeat: connection.status === 'connecting' ? Infinity : 0, ease: 'linear' }}
                className={cn('w-12 h-12 rounded-xl flex items-center justify-center', connection.status === 'connected' ? 'bg-whatsapp/10' : 'bg-muted')}
              >
                <Smartphone className={cn('w-6 h-6', connection.status === 'connected' ? 'text-whatsapp' : 'text-muted-foreground')} />
              </motion.div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">{connection.name}</h3>
                  {connection.is_default && <Badge variant="secondary" className="text-xs"><Star className="w-3 h-3 mr-1" />Padrão</Badge>}
                  <Badge
                    variant="outline"
                    className={cn('text-xs',
                      isOfficial ? 'border-primary text-primary' : 'border-whatsapp text-whatsapp')}
                    title={isOfficial ? 'WhatsApp Cloud API (Meta) — sem QR Code' : 'Evolution API (não-oficial) — usa QR Code'}
                  >
                    {isOfficial ? <ShieldCheck className="w-3 h-3 mr-1" /> : <Zap className="w-3 h-3 mr-1" />}
                    {isOfficial ? 'API Oficial' : 'Não-oficial (QR)'}
                  </Badge>
                  {showAttentionBadge ? (
                    <TooltipProvider delayDuration={150}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="text-xs border-warning text-warning cursor-help">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Atenção{reasonInfo ? ` · ${reasonInfo.short}` : ''}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs">{reasonInfo?.long ?? 'A conexão apresenta sinais de instabilidade. Verifique o status real.'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <Badge variant="outline" className={cn('text-xs',
                      connection.status === 'connected' && 'border-status-online text-status-online',
                      connection.status !== 'connected' && connection.status !== 'pending' && 'border-status-offline text-status-offline',
                      connection.status === 'pending' && 'border-status-away text-status-away'
                    )}>
                      <StatusIcon className={cn('w-3 h-3 mr-1', connection.status === 'connecting' && 'animate-spin')} />
                      {status.label}
                    </Badge>
                  )}
                  <BusinessHoursIndicator connectionId={connection.id} />
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">{connection.phone_number}</p>
                  {connection.battery_level != null && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      {connection.is_plugged ? <BatteryCharging className="w-3.5 h-3.5 text-success" /> :
                       connection.battery_level <= 20 ? <BatteryLow className="w-3.5 h-3.5 text-destructive" /> :
                       connection.battery_level <= 50 ? <BatteryMedium className="w-3.5 h-3.5 text-warning" /> :
                       <BatteryFull className="w-3.5 h-3.5 text-success" />}
                      {connection.battery_level}%
                    </span>
                  )}
                  {(connection.retry_count ?? 0) > 0 && (
                    <Badge variant="outline" className="text-[10px] border-warning/30 text-warning">
                      Retry {connection.retry_count}/{connection.max_retries || 5}
                    </Badge>
                  )}
                </div>
                {connection.instance_id && (
                  <p className="text-xs text-muted-foreground mt-1">Instância: <code className="bg-muted px-1 rounded">{connection.instance_id}</code></p>
                )}
                {connection.health_status && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="relative flex h-2 w-2">
                      {connection.health_status === 'healthy' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />}
                      <span className={cn('relative inline-flex rounded-full h-2 w-2',
                        connection.health_status === 'healthy' && 'bg-success',
                        connection.health_status === 'degraded' && 'bg-warning',
                        (connection.health_status === 'error' || connection.health_status === 'timeout' || connection.health_status === 'disconnected') && 'bg-destructive',
                      )} />
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {connection.health_status === 'healthy' ? 'Saudável' : connection.health_status === 'degraded' ? 'Degradado' :
                       connection.health_status === 'timeout' ? 'Timeout' : connection.health_status === 'error' ? 'Erro' : 'Desconectado'}
                      {connection.health_response_ms != null && <> · {connection.health_response_ms}ms</>}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="outline" size="sm" onClick={() => onCopyId(connection.id)}><Copy className="w-4 h-4 mr-2" />Copiar ID</Button>
              </motion.div>
              {connection.status !== 'connected' && !isOfficial && (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant={connection.status === 'disconnected' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onShowQrCode(connection)}
                    className={connection.status === 'disconnected'
                      ? 'bg-whatsapp text-primary-foreground hover:bg-whatsapp/90 animate-pulse'
                      : 'border-whatsapp text-whatsapp hover:bg-whatsapp hover:text-primary-foreground'}
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    {connection.status === 'disconnected' ? 'Ver QR Code' : 'Conectar'}
                  </Button>
                </motion.div>
              )}
              {connection.status !== 'connected' && isOfficial && connection.instance_id && (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="outline" size="sm" onClick={() => onSettings(connection.instance_id!, connection.name)} className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                    <ShieldCheck className="w-4 h-4 mr-2" />Configurar credenciais
                  </Button>
                </motion.div>
              )}
              {connection.status === 'connected' && (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="outline" size="sm" onClick={() => onDisconnect(connection)}><WifiOff className="w-4 h-4 mr-2" />Desconectar</Button>
                </motion.div>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                  </motion.div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onSetDefault(connection.id)}><Star className="w-4 h-4 mr-2" />Definir como padrão</DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onShowQrCode(connection)}
                    disabled={isOfficial}
                    title={isOfficial ? 'API Oficial não usa QR Code' : undefined}
                  >
                    <QrCode className="w-4 h-4 mr-2" />Gerar QR Code
                  </DropdownMenuItem>
                  {onSetApiType && (
                    <DropdownMenuItem
                      onClick={() => onSetApiType(connection, isOfficial ? 'evolution' : 'official')}
                    >
                      {isOfficial ? <Zap className="w-4 h-4 mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                      Mudar para API {isOfficial ? 'não-oficial (Evolution)' : 'oficial (Cloud API)'}
                    </DropdownMenuItem>
                  )}
                  {isOfficial && (
                    <DropdownMenuItem onClick={() => setOfficialConfigOpen(true)}>
                      <ShieldCheck className="w-4 h-4 mr-2" />Configurar Cloud API
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onBusinessHours(connection.id, connection.name)}><Clock className="w-4 h-4 mr-2" />Horário de Atendimento</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onQueues(connection.id, connection.name)}><Link2 className="w-4 h-4 mr-2" />Vincular Filas</DropdownMenuItem>
                  {connection.instance_id && (
                    <>
                      <DropdownMenuItem onClick={() => onSettings(connection.instance_id!, connection.name)}><Settings className="w-4 h-4 mr-2" />Configurações & Perfil</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onIntegrations(connection.instance_id!, connection.name)}><Boxes className="w-4 h-4 mr-2" />Integrações (IA/Bots)</DropdownMenuItem>
                      <DropdownMenuItem disabled={syncingHistory === connection.id} onClick={() => onSyncHistory(connection)}>
                        {syncingHistory === connection.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <History className="w-4 h-4 mr-2" />}
                        Sincronizar Histórico
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => onDelete(connection)}><Trash2 className="w-4 h-4 mr-2" />Excluir</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
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
