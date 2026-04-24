import { useState, useEffect, useCallback, useRef } from 'react';
import { log } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useEvolutionApi } from '@/hooks/useEvolutionApi';

export type WhatsAppApiType = 'evolution' | 'official';

export interface WhatsAppConnection {
  id: string;
  name: string;
  phone_number: string;
  instance_id: string | null;
  status: string;
  qr_code: string | null;
  is_default: boolean;
  created_at: string;
  /** 'evolution' = não-oficial (QR Code via Evolution/Baileys); 'official' = WhatsApp Cloud API (Meta, sem QR). */
  api_type?: string;
  battery_level?: number | null;
  is_plugged?: boolean | null;
  retry_count?: number | null;
  max_retries?: number | null;
  health_status?: string | null;
  health_response_ms?: number | null;
  last_health_check?: string | null;
}

export interface QrCodeDialogState {
  open: boolean;
  connectionId: string;
  connectionName: string;
  qrCode: string | null;
  status: 'loading' | 'pending' | 'connected' | 'error';
  errorMessage?: string;
  /** Unix ms when current QR expires. null when not pending. */
  expiresAt: number | null;
  /** id of the qr_attempts row tied to current QR (for expiration update). */
  attemptId: string | null;
}

const INITIAL_QR_STATE: QrCodeDialogState = {
  open: false,
  connectionId: '',
  connectionName: '',
  qrCode: null,
  status: 'loading',
  expiresAt: null,
  attemptId: null,
};

const QR_TTL_MS = 60_000;
const QR_STORAGE_KEY = 'zapp:qrDialog:v1';

interface PersistedQrState {
  connectionId: string;
  connectionName: string;
  qrCode: string | null;
  status: 'loading' | 'pending' | 'connected' | 'error';
  expiresAt: number | null;
  attemptId: string | null;
  errorMessage?: string;
}

function loadPersistedQr(): PersistedQrState | null {
  try {
    const raw = sessionStorage.getItem(QR_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedQrState;
    // discard if already expired
    if (parsed.status === 'pending' && parsed.expiresAt && parsed.expiresAt <= Date.now()) {
      sessionStorage.removeItem(QR_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function savePersistedQr(state: QrCodeDialogState) {
  try {
    if (!state.open || state.status === 'connected') {
      sessionStorage.removeItem(QR_STORAGE_KEY);
      return;
    }
    const payload: PersistedQrState = {
      connectionId: state.connectionId,
      connectionName: state.connectionName,
      qrCode: state.qrCode,
      status: state.status,
      expiresAt: state.expiresAt,
      attemptId: state.attemptId,
      errorMessage: state.errorMessage,
    };
    sessionStorage.setItem(QR_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage errors (quota, private mode)
  }
}

function clearPersistedQr() {
  try { sessionStorage.removeItem(QR_STORAGE_KEY); } catch { /* noop */ }
}

export function useConnectionsManager() {
  const [connections, setConnections] = useState<WhatsAppConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [qrCodeDialog, setQrCodeDialog] = useState<QrCodeDialogState>(() => {
    const persisted = loadPersistedQr();
    if (!persisted) return INITIAL_QR_STATE;
    return {
      open: true,
      connectionId: persisted.connectionId,
      connectionName: persisted.connectionName,
      qrCode: persisted.qrCode,
      status: persisted.status,
      errorMessage: persisted.errorMessage,
      expiresAt: persisted.expiresAt,
      attemptId: persisted.attemptId,
    };
  });
  const [newConnection, setNewConnection] = useState<{ name: string; phone_number: string; api_type: WhatsAppApiType }>({ name: '', phone_number: '', api_type: 'evolution' });
  const [isCreating, setIsCreating] = useState(false);
  const [syncingHistory, setSyncingHistory] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  const {
    isLoading: evolutionLoading,
    createInstance,
    getInstanceStatus,
    disconnectInstance,
    deleteInstance,
  } = useEvolutionApi();

  // Persist QR dialog state across page reloads.
  useEffect(() => {
    savePersistedQr(qrCodeDialog);
  }, [qrCodeDialog]);

  // Tracks which connections we've already toasted as "connected" in this
  // session, so realtime + status-poll can't fire duplicate notifications.
  const toastedConnectedRef = useRef<Set<string>>(new Set());

  const announceConnected = useCallback((conn: { id: string; name: string }) => {
    if (toastedConnectedRef.current.has(conn.id)) return;
    toastedConnectedRef.current.add(conn.id);
    toast({
      title: 'WhatsApp conectado!',
      description: `${conn.name} está online e pronto para enviar e receber mensagens.`,
    });
  }, []);

  useEffect(() => {
    fetchConnections();

    const channel = supabase
      .channel('whatsapp-connections-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_connections' },
        (payload) => {
          log.debug('Connection update:', payload);
          if (payload.eventType === 'UPDATE') {
            const newConn = payload.new as WhatsAppConnection;
            const oldConn = payload.old as Partial<WhatsAppConnection> | null;
            setConnections((prev) =>
              prev.map((conn) => (conn.id === newConn.id ? newConn : conn))
            );
            // Fire connected toast on transition → 'connected', regardless of
            // whether the QR dialog is open or closed.
            if (
              newConn.status === 'connected' &&
              oldConn?.status !== 'connected'
            ) {
              announceConnected({ id: newConn.id, name: newConn.name });
            }
            if (qrCodeDialog.open && qrCodeDialog.connectionId === newConn.id) {
              if (newConn.status === 'connected') {
                setQrCodeDialog((prev) => ({ ...prev, status: 'connected', qrCode: null, expiresAt: null }));
              } else if (newConn.qr_code) {
                setQrCodeDialog((prev) => ({
                  ...prev,
                  qrCode: newConn.qr_code,
                  status: 'pending',
                  expiresAt: prev.expiresAt ?? Date.now() + QR_TTL_MS,
                }));
              }
            }
          } else if (payload.eventType === 'INSERT') {
            setConnections((prev) => [payload.new as WhatsAppConnection, ...prev]);
          } else if (payload.eventType === 'DELETE') {
            setConnections((prev) => prev.filter((conn) => conn.id !== (payload.old as { id: string }).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (pollingInterval) clearInterval(pollingInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchConnections = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('whatsapp_connections')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setConnections(data);
    setLoading(false);
  };

  const generateInstanceName = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').slice(0, 30) +
    '_' + Date.now().toString().slice(-6);

  const handleAddConnection = async () => {
    if (!newConnection.name || !newConnection.phone_number) {
      toast({ title: 'Erro', description: 'Preencha o nome e o número do telefone.', variant: 'destructive' });
      return;
    }
    setIsCreating(true);
    const isOfficial = newConnection.api_type === 'official';
    const instanceName = isOfficial ? `official_${Date.now().toString(36)}` : generateInstanceName(newConnection.name);
    try {
      // Official Cloud API doesn't use Evolution instances — skip createInstance.
      if (!isOfficial) {
        await createInstance({ instanceName });
      }
      const { data, error } = await supabase.from('whatsapp_connections').insert({
        name: newConnection.name,
        phone_number: newConnection.phone_number,
        instance_id: instanceName,
        status: 'disconnected',
        is_default: connections.length === 0,
        api_type: newConnection.api_type,
      }).select().single();
      if (error) throw error;
      toast({
        title: 'Conexão criada!',
        description: isOfficial
          ? 'Configure as credenciais da API oficial (Meta) nas configurações da conexão.'
          : 'Agora conecte escaneando o QR Code.',
      });
      setIsAddDialogOpen(false);
      setNewConnection({ name: '', phone_number: '', api_type: 'evolution' });
      if (data && !isOfficial) handleShowQrCode(data);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      log.error('Error creating connection:', error);
      toast({ title: 'Erro ao criar conexão', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSetApiType = async (connection: WhatsAppConnection, api_type: WhatsAppApiType) => {
    if ((connection.api_type ?? 'evolution') === api_type) return;
    const { error } = await supabase
      .from('whatsapp_connections')
      .update({ api_type })
      .eq('id', connection.id);
    if (error) {
      toast({ title: 'Erro ao atualizar tipo de API', description: error.message, variant: 'destructive' });
      return;
    }
    setConnections((prev) => prev.map((c) => (c.id === connection.id ? { ...c, api_type } : c)));
    toast({
      title: 'Tipo de API atualizado',
      description: api_type === 'official'
        ? `${connection.name} agora usa WhatsApp Cloud API (oficial). QR Code não será necessário.`
        : `${connection.name} agora usa Evolution API (não-oficial) com QR Code.`,
    });
  };

  const startStatusPolling = useCallback((instanceName: string, connectionId: string) => {
    if (pollingInterval) clearInterval(pollingInterval);
    const interval = setInterval(async () => {
      try {
        const result = await getInstanceStatus(instanceName);
        if (result?.state === 'open' || result?.status === 'connected') {
          clearInterval(interval);
          setPollingInterval(null);
          setQrCodeDialog((prev) => ({ ...prev, status: 'connected', qrCode: null, expiresAt: null }));
          // Use the deduplicated announcer so we don't double-toast when realtime
          // also delivers the UPDATE event with status='connected'.
          setConnections((prev) => {
            const conn = prev.find((c) => c.id === connectionId);
            if (conn) announceConnected({ id: conn.id, name: conn.name });
            return prev;
          });
        }
      } catch (error) {
        log.error('Status polling error:', error);
      }
    }, 3000);
    setPollingInterval(interval);
  }, [getInstanceStatus, pollingInterval, announceConnected]);

  /**
   * Logs a QR generation attempt to qr_attempts. Returns the inserted attempt id (if successful)
   * so we can later mark it as expired/error.
   */
  const logQrAttempt = async (
    conn: { id: string; instance_id: string | null; name: string },
    extra: { error_message?: string | null; status?: 'pending' | 'error' } = {},
  ): Promise<string | null> => {
    if (!conn.instance_id) return null;
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('qr_attempts')
        .insert({
          connection_id: conn.id,
          instance_id: conn.instance_id,
          connection_name: conn.name,
          status: extra.status ?? 'pending',
          requested_by: userData.user?.id ?? null,
          error_message: extra.error_message ?? null,
        })
        .select('id')
        .single();
      if (error) {
        log.warn('Failed to log QR attempt', error);
        return null;
      }
      return data?.id ?? null;
    } catch (e) {
      log.warn('Failed to log QR attempt (catch)', e);
      return null;
    }
  };

  /** Mark a previously inserted QR attempt as expired/error. */
  const updateQrAttempt = async (
    attemptId: string | null,
    patch: { status: 'expired' | 'error'; error_message?: string | null },
  ) => {
    if (!attemptId) return;
    try {
      await supabase
        .from('qr_attempts')
        .update({
          status: patch.status,
          expired_at: patch.status === 'expired' ? new Date().toISOString() : null,
          error_message: patch.error_message ?? null,
        })
        .eq('id', attemptId);
    } catch (e) {
      log.warn('Failed to update QR attempt', e);
    }
  };

  const requestConnectionQr = async (instanceId: string) => {
    const { data, error } = await supabase.functions.invoke('evolution-api', {
      body: { action: 'connect', instanceName: instanceId },
    });

    if (error) throw new Error(error.message || 'Erro ao gerar QR Code');
    if (data && typeof data === 'object' && 'error' in data && data.error === true) {
      const code = (data as { code?: string }).code;
      const message = typeof (data as { message?: unknown }).message === 'string'
        ? (data as { message: string }).message
        : 'Erro ao gerar QR Code';
      if (code === 'EVOLUTION_AUTH_ERROR') {
        throw new Error(`Integração sem autorização: ${message}`);
      }
      throw new Error(message);
    }

    return data as { qrcode?: { base64?: string }; status?: string; state?: string } | null;
  };

  const handleShowQrCode = async (connection: WhatsAppConnection) => {
    if ((connection.api_type ?? 'evolution') === 'official') {
      toast({
        title: 'QR Code não disponível',
        description: 'Esta conexão usa WhatsApp Cloud API (oficial). A autenticação é feita via credenciais da Meta, não via QR Code.',
        variant: 'destructive',
      });
      return;
    }
    if (!connection.instance_id) {
      toast({ title: 'Erro', description: 'Esta conexão não possui uma instância configurada.', variant: 'destructive' });
      return;
    }
    setQrCodeDialog({
      open: true,
      connectionId: connection.id,
      connectionName: connection.name,
      qrCode: connection.qr_code,
      status: connection.status === 'connected' ? 'connected' : 'loading',
      expiresAt: null,
      attemptId: null,
    });
    if (connection.status !== 'connected') {
      const attemptId = await logQrAttempt(connection);
      try {
        const result = await requestConnectionQr(connection.instance_id);
        const expiresAt = Date.now() + QR_TTL_MS;
        if (result?.qrcode?.base64) {
          setQrCodeDialog((prev) => ({
            ...prev,
            qrCode: result.qrcode.base64,
            status: 'pending',
            expiresAt,
            attemptId,
          }));
        } else {
          setQrCodeDialog((prev) => ({ ...prev, expiresAt, attemptId }));
        }
        startStatusPolling(connection.instance_id, connection.id);
        // QR codes typically expire after ~60s — auto-mark expired if dialog still pending.
        setTimeout(() => {
          setQrCodeDialog((prev) => {
            if (prev.connectionId === connection.id && prev.status === 'pending') {
              updateQrAttempt(prev.attemptId, { status: 'expired' });
              return { ...prev, status: 'error', errorMessage: 'QR Code expirado. Gere um novo.', expiresAt: null };
            }
            return prev;
          });
        }, QR_TTL_MS);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erro ao gerar QR Code';
        await updateQrAttempt(attemptId, { status: 'error', error_message: errorMessage });
        setQrCodeDialog((prev) => ({ ...prev, status: 'error', errorMessage, expiresAt: null }));
      }
    }
  };

  const handleRefreshQrCode = async () => {
    const connection = connections.find((c) => c.id === qrCodeDialog.connectionId);
    if (!connection?.instance_id) return;
    setQrCodeDialog((prev) => ({ ...prev, status: 'loading', qrCode: null, expiresAt: null, attemptId: null }));
    const attemptId = await logQrAttempt(connection);
    try {
      const result = await requestConnectionQr(connection.instance_id);
      const expiresAt = Date.now() + QR_TTL_MS;
      if (result?.qrcode?.base64) {
        setQrCodeDialog((prev) => ({
          ...prev,
          qrCode: result.qrcode.base64,
          status: 'pending',
          expiresAt,
          attemptId,
        }));
      } else {
        setQrCodeDialog((prev) => ({ ...prev, expiresAt, attemptId }));
      }
      setTimeout(() => {
        setQrCodeDialog((prev) => {
          if (prev.connectionId === connection.id && prev.status === 'pending') {
            updateQrAttempt(prev.attemptId, { status: 'expired' });
            return { ...prev, status: 'error', errorMessage: 'QR Code expirado. Gere um novo.', expiresAt: null };
          }
          return prev;
        });
      }, QR_TTL_MS);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar QR Code';
      await updateQrAttempt(attemptId, { status: 'error', error_message: errorMessage });
      setQrCodeDialog((prev) => ({ ...prev, status: 'error', errorMessage, expiresAt: null }));
    }
  };
  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast({ title: 'ID copiado!', description: 'O ID da conexão foi copiado para a área de transferência.' });
  };

  const handleReconnect = (connection: WhatsAppConnection) => handleShowQrCode(connection);

  const handleDisconnect = async (connection: WhatsAppConnection) => {
    if (!connection.instance_id) return;
    try {
      await disconnectInstance(connection.instance_id);
      await supabase.from('whatsapp_connections').update({ status: 'disconnected', qr_code: null }).eq('id', connection.id);
    } catch (error: unknown) {
      toast({ title: 'Erro ao desconectar', description: error instanceof Error ? error.message : 'Erro desconhecido', variant: 'destructive' });
    }
  };

  const handleSetDefault = async (id: string) => {
    await supabase.from('whatsapp_connections').update({ is_default: false }).neq('id', id);
    await supabase.from('whatsapp_connections').update({ is_default: true }).eq('id', id);
    setConnections(connections.map((conn) => ({ ...conn, is_default: conn.id === id })));
    toast({ title: 'Conexão padrão atualizada' });
  };

  const handleDelete = async (connection: WhatsAppConnection) => {
    try {
      if (connection.instance_id) await deleteInstance(connection.instance_id).catch(() => {});
      const { error } = await supabase.from('whatsapp_connections').delete().eq('id', connection.id);
      if (!error) {
        setConnections(connections.filter((conn) => conn.id !== connection.id));
        toast({ title: 'Conexão removida', description: 'A conexão foi excluída com sucesso.' });
      }
    } catch (error: unknown) {
      toast({ title: 'Erro ao excluir', description: error instanceof Error ? error.message : 'Erro desconhecido', variant: 'destructive' });
    }
  };

  const closeQrDialog = () => {
    if (pollingInterval) { clearInterval(pollingInterval); setPollingInterval(null); }
    clearPersistedQr();
    setQrCodeDialog(INITIAL_QR_STATE);
  };

  // After connections load (e.g. after a page refresh), if we have a restored
  // pending QR, resume status polling and re-arm the expiration timer for the
  // remaining time. This keeps the QR visible and the countdown accurate without
  // forcing the user to manually generate a new QR before the existing one expires.
  useEffect(() => {
    if (loading) return;
    if (!qrCodeDialog.open) return;
    if (qrCodeDialog.status !== 'pending') return;
    const conn = connections.find((c) => c.id === qrCodeDialog.connectionId);
    if (!conn?.instance_id) return;

    // If persisted QR already expired, surface the expired state instead of restoring it.
    if (qrCodeDialog.expiresAt && qrCodeDialog.expiresAt <= Date.now()) {
      void updateQrAttempt(qrCodeDialog.attemptId, { status: 'expired' });
      setQrCodeDialog((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: 'QR Code expirado. Gere um novo.',
        expiresAt: null,
      }));
      return;
    }

    startStatusPolling(conn.instance_id, conn.id);
    const remaining = qrCodeDialog.expiresAt
      ? Math.max(0, qrCodeDialog.expiresAt - Date.now())
      : QR_TTL_MS;
    const timer = setTimeout(() => {
      setQrCodeDialog((prev) => {
        if (prev.connectionId === conn.id && prev.status === 'pending') {
          void updateQrAttempt(prev.attemptId, { status: 'expired' });
          return { ...prev, status: 'error', errorMessage: 'QR Code expirado. Gere um novo.', expiresAt: null };
        }
        return prev;
      });
    }, remaining);
    return () => clearTimeout(timer);
    // We intentionally only run this when connections finish loading the first time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Auto-refresh: regenerate the QR ~5s before it expires (at 55s of the 60s TTL)
  // so the user never has to manually click "Atualizar" mid-scan. Only runs while
  // the dialog is open and the QR is in `pending`. Each new QR resets the timer.
  useEffect(() => {
    if (!qrCodeDialog.open) return;
    if (qrCodeDialog.status !== 'pending') return;
    if (!qrCodeDialog.expiresAt) return;
    const refreshAt = qrCodeDialog.expiresAt - 5_000;
    const delay = refreshAt - Date.now();
    if (delay <= 0) return;
    const timer = setTimeout(() => {
      // Re-check inside the closure: avoid refreshing if user already connected/closed.
      setQrCodeDialog((prev) => {
        if (prev.open && prev.status === 'pending') {
          void handleRefreshQrCode();
        }
        return prev;
      });
    }, delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrCodeDialog.open, qrCodeDialog.status, qrCodeDialog.expiresAt, qrCodeDialog.attemptId]);

  return {
    connections,
    loading,
    isAddDialogOpen, setIsAddDialogOpen,
    qrCodeDialog,
    newConnection, setNewConnection,
    isCreating,
    syncingHistory, setSyncingHistory,
    evolutionLoading,
    handleAddConnection,
    handleShowQrCode,
    handleRefreshQrCode,
    handleCopyId,
    handleReconnect,
    handleDisconnect,
    handleSetDefault,
    handleSetApiType,
    handleDelete,
    closeQrDialog,
  };
}
