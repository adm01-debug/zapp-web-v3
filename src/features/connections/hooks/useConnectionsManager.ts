import { useState, useEffect, useCallback, useRef } from 'react';
import { log } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useEvolutionApi } from '@/hooks/useEvolutionApi';
import { evaluateAutoRefresh } from '@/hooks/connections/qrAutoRefresh';
import { whatsappConnectionRepository } from '@/features/connections/data-access/whatsappConnectionRepository';
import { whatsappConnectionService } from '@/features/connections/services/whatsappConnectionService';


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
  updated_at?: string;
  /** 'evolution' = não-oficial (QR Code via Evolution/Baileys); 'official' = WhatsApp Cloud API (Meta, sem QR). */
  api_type?: string;
  battery_level?: number | null;
  is_plugged?: boolean | null;
  retry_count?: number | null;
  max_retries?: number | null;
  health_status?: string | null;
  health_response_ms?: number | null;
  last_health_check?: string | null;
  health_reason?: string | null;
  owner_jid?: string | null;
}


/** Origem do TTL do QR atual — útil para diagnóstico (telemetria/UI). */
export type QrTtlSource = 'detected' | 'default' | 'clamped';

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
  /** TTL em segundos detectado (ou padrão) na última geração. null quando não pending. */
  ttlSeconds: number | null;
  /** Como o TTL foi obtido (detectado da API, padrão de fallback, ou clamped por estar fora dos limites). */
  ttlSource: QrTtlSource | null;
}

const INITIAL_QR_STATE: QrCodeDialogState = {
  open: false,
  connectionId: '',
  connectionName: '',
  qrCode: null,
  status: 'loading',
  expiresAt: null,
  attemptId: null,
  ttlSeconds: null,
  ttlSource: null,
};

/** Default fallback TTL when the upstream API doesn't report one. Evolution typically rotates the QR ~60s. */
const QR_TTL_DEFAULT_MS = 60_000;
/** Sane bounds to clamp suspicious upstream values (e.g. 0, negative, or absurdly long). */
const QR_TTL_MIN_MS = 15_000;
const QR_TTL_MAX_MS = 5 * 60_000;
const QR_STORAGE_KEY = 'zapp:qrDialog:v1';

/**
 * Detects the QR rotation TTL from the Evolution API response. Evolution returns
 * the lifetime in seconds in either `count` or `qrcode.count` (varies by version);
 * we check both and clamp to sane bounds. Returns the TTL in **milliseconds** plus
 * the source so the UI/telemetry can distinguish detected vs. fallback values.
 */
function detectQrTtlMs(result: unknown): { ttlMs: number; source: QrTtlSource } {
  if (!result || typeof result !== 'object') return { ttlMs: QR_TTL_DEFAULT_MS, source: 'default' };
  const r = result as Record<string, unknown> & { qrcode?: Record<string, unknown> };
  const candidates: unknown[] = [
    r.count,
    r.qrcode?.count,
    (r as { ttl?: unknown }).ttl,
    r.qrcode?.ttl,
    (r as { expires_in?: unknown }).expires_in,
  ];
  for (const raw of candidates) {
    const seconds = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
    if (Number.isFinite(seconds) && seconds > 0) {
      const ms = seconds * 1000;
      const clamped = Math.min(QR_TTL_MAX_MS, Math.max(QR_TTL_MIN_MS, ms));
      return { ttlMs: clamped, source: clamped !== ms ? 'clamped' : 'detected' };
    }
  }
  return { ttlMs: QR_TTL_DEFAULT_MS, source: 'default' };
}

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
      ttlSeconds: persisted.expiresAt ? Math.round((persisted.expiresAt - Date.now()) / 1000) : null,
      ttlSource: persisted.expiresAt ? 'detected' : null,
    };
  });
  const [newConnection, setNewConnection] = useState<{ name: string; phone_number: string; api_type: WhatsAppApiType }>({ name: '', phone_number: '', api_type: 'evolution' });
  const [isCreating, setIsCreating] = useState(false);
  const [syncingHistory, setSyncingHistory] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  // Sentinela monotônica: incrementa a cada `closeQrDialog`. Operações
  // assíncronas (network requests, setTimeouts) capturam o valor no início e
  // comparam ao concluir — se mudou, o usuário fechou o diálogo no meio do
  // caminho e qualquer setState/refresh deve ser silenciosamente descartado
  // para evitar polling/auto-refresh não intencional após o close.
  const dialogGenRef = useRef(0);

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
                  expiresAt: prev.expiresAt ?? Date.now() + QR_TTL_DEFAULT_MS,
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

    // ⛔ Prevent duplicate phone numbers
    const { isSamePhone } = await import("@/lib/phoneUtils");
    const duplicate = connections.find((c) => isSamePhone(c.phone_number, newConnection.phone_number));
    if (duplicate) {
      toast({ title: "Número já conectado", description: `O número ${newConnection.phone_number} já está vinculado à conexão "${duplicate.name}". Cada número só pode ter uma conexão.`, variant: "destructive" });
      setIsCreating(false);
      return;
    }
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

  /**
   * Status polling do pareamento WhatsApp.
   *
   * No-op: o polling agora é gerenciado por um `useEffect` declarativo abaixo
   * que só dispara quando `qrCodeDialog.open === true` E
   * `qrCodeDialog.status === 'pending'`. Isso garante que:
   *   - fechamos o intervalo automaticamente quando o usuário fecha a modal;
   *   - retomamos quando a modal reabre com QR ainda válido;
   *   - paramos imediatamente quando o status sai de `pending` (loading/error/connected).
   *
   * Mantemos a função como stub (compatibilidade com chamadas existentes) para
   * não exigir refactor sincronizado em todos os call-sites.
   */
  const startStatusPolling = useCallback((_instanceName: string, _connectionId: string) => {
    // intencionalmente vazio — ver useEffect "QR status polling" abaixo.
  }, []);

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
      ttlSeconds: null,
      ttlSource: null,
    });
    if (connection.status !== 'connected') {
      const attemptId = await logQrAttempt(connection);
      try {
        const result = await requestConnectionQr(connection.instance_id);
        const { ttlMs, source: ttlSource } = detectQrTtlMs(result);
        const ttlSeconds = Math.round(ttlMs / 1000);
        const expiresAt = Date.now() + ttlMs;
        log.info('[qr-ttl] detected', { ttlSeconds, source: ttlSource, connectionId: connection.id });
        if (result?.qrcode?.base64) {
          setQrCodeDialog((prev) => ({
            ...prev,
            qrCode: result.qrcode.base64,
            status: 'pending',
            expiresAt,
            attemptId,
            ttlSeconds,
            ttlSource,
          }));
        } else {
          setQrCodeDialog((prev) => ({ ...prev, expiresAt, attemptId, ttlSeconds, ttlSource }));
        }
        startStatusPolling(connection.instance_id, connection.id);
        // Auto-mark expired using the upstream TTL (falls back to default when missing).
        setTimeout(() => {
          setQrCodeDialog((prev) => {
            if (prev.connectionId === connection.id && prev.status === 'pending') {
              updateQrAttempt(prev.attemptId, { status: 'expired' });
              return { ...prev, status: 'error', errorMessage: 'QR Code expirado. Gere um novo.', expiresAt: null };
            }
            return prev;
          });
        }, ttlMs);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erro ao gerar QR Code';
        await updateQrAttempt(attemptId, { status: 'error', error_message: errorMessage });
        setQrCodeDialog((prev) => ({ ...prev, status: 'error', errorMessage, expiresAt: null }));
      }
    }
  };

  // Hard lock against concurrent QR refreshes — prevents a second invocation
  // from firing while the first one is still awaiting Evolution's response,
  // even if it comes from a non-button source (auto-refresh timer, keyboard
  // shortcut, double-click slipping past the button's `disabled` attribute).
  const refreshInFlightRef = useRef(false);

  const handleRefreshQrCode = async () => {
    if (refreshInFlightRef.current) {
      log.info('[qr-auto-refresh] blocked', { reason: 'in_flight' });
      return;
    }
    const connection = connections.find((c) => c.id === qrCodeDialog.connectionId);
    if (!connection?.instance_id) {
      log.info('[qr-auto-refresh] blocked', { reason: 'no_instance', connectionId: qrCodeDialog.connectionId });
      return;
    }
    log.info('[qr-auto-refresh] started', { connectionId: connection.id, instance: connection.instance_id });
    refreshInFlightRef.current = true;
    // Snapshot da geração: se o usuário fechar o diálogo durante o request,
    // dialogGenRef.current avança e nós abortamos no callback.
    const generation = dialogGenRef.current;
    const isStale = () => dialogGenRef.current !== generation;
    setQrCodeDialog((prev) => ({ ...prev, status: 'loading', qrCode: null, expiresAt: null, attemptId: null }));
    const attemptId = await logQrAttempt(connection);
    if (isStale()) { refreshInFlightRef.current = false; return; }
    try {
      const result = await requestConnectionQr(connection.instance_id);
      if (isStale()) return;
      const { ttlMs, source: ttlSource } = detectQrTtlMs(result);
      const ttlSeconds = Math.round(ttlMs / 1000);
      const expiresAt = Date.now() + ttlMs;
      log.info('[qr-ttl] detected', { ttlSeconds, source: ttlSource, connectionId: connection.id });
      if (result?.qrcode?.base64) {
        setQrCodeDialog((prev) => ({
          ...prev,
          qrCode: result.qrcode.base64,
          status: 'pending',
          expiresAt,
          attemptId,
          ttlSeconds,
          ttlSource,
        }));
      } else {
        setQrCodeDialog((prev) => ({ ...prev, expiresAt, attemptId, ttlSeconds, ttlSource }));
      }
      setTimeout(() => {
        if (isStale()) return;
        setQrCodeDialog((prev) => {
          if (prev.connectionId === connection.id && prev.status === 'pending') {
            updateQrAttempt(prev.attemptId, { status: 'expired' });
            return { ...prev, status: 'error', errorMessage: 'QR Code expirado. Gere um novo.', expiresAt: null };
          }
          return prev;
        });
      }, ttlMs);
    } catch (error: unknown) {
      if (isStale()) return;
      const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar QR Code';
      log.warn('[qr-auto-refresh] network_error', { connectionId: connection.id, error: errorMessage });
      await updateQrAttempt(attemptId, { status: 'error', error_message: errorMessage });
      if (isStale()) return;
      setQrCodeDialog((prev) => ({ ...prev, status: 'error', errorMessage, expiresAt: null }));
    } finally {
      // Always release the lock so the next user-initiated retry can proceed,
      // regardless of whether the request succeeded or failed.
      refreshInFlightRef.current = false;
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
    // Invalida toda operação assíncrona em vôo: handlers que capturaram a
    // geração anterior vão detectar o mismatch e abortar antes de tocar no
    // estado, garantindo que NENHUM polling/auto-refresh dispare após o close.
    log.info('[qr-auto-refresh] cancelled', { reason: 'dialog_closed', generation: dialogGenRef.current });
    dialogGenRef.current += 1;
    refreshInFlightRef.current = false;
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
      : QR_TTL_DEFAULT_MS;
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

  // QR status polling — checa a cada 3s se a instância foi pareada.
  // Estritamente gated: SÓ roda enquanto a modal está aberta E o status é
  // 'pending'. Qualquer outra transição (modal fechada, status virou
  // loading/error/connected, troca de connectionId) limpa o intervalo
  // automaticamente via cleanup do effect.
  useEffect(() => {
    if (!qrCodeDialog.open) return;
    if (qrCodeDialog.status !== 'pending') return;
    const conn = connections.find((c) => c.id === qrCodeDialog.connectionId);
    if (!conn?.instance_id) return;

    const instanceName = conn.instance_id;
    const connectionId = conn.id;
    let cancelled = false;

    const interval = setInterval(async () => {
      if (cancelled) return;
      try {
        const result = await getInstanceStatus(instanceName);
        if (cancelled) return;
        if (result?.state === 'open' || result?.status === 'connected') {
          setQrCodeDialog((prev) =>
            prev.connectionId === connectionId && prev.status === 'pending'
              ? { ...prev, status: 'connected', qrCode: null, expiresAt: null }
              : prev,
          );
          // Anúncio dedup pra não duplicar com o UPDATE realtime.
          setConnections((prev) => {
            const c = prev.find((x) => x.id === connectionId);
            if (c) announceConnected({ id: c.id, name: c.name });
            return prev;
          });
        }
      } catch (error) {
        log.error('Status polling error:', error);
      }
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [
    qrCodeDialog.open,
    qrCodeDialog.status,
    qrCodeDialog.connectionId,
    connections,
    getInstanceStatus,
    announceConnected,
  ]);

  // Reconcile com a fonte de verdade: assina realtime da linha em `qr_attempts`
  // correspondente ao QR atualmente exibido e propaga o status do banco
  // (pending → connected/error) para o estado local. Isso garante que o
  // auto-refresh, o anúncio de "conectado" e o feedback de erro sejam
  // disparados pela MESMA fonte usada pelo backend (qr_attempts.status), e não
  // por uma estimativa otimista do cliente, evitando drift entre UI e servidor.
  useEffect(() => {
    if (!qrCodeDialog.open) return;
    if (!qrCodeDialog.attemptId) return;

    const attemptId = qrCodeDialog.attemptId;
    const channel = supabase
      .channel(`qr-attempts-truth-${attemptId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'qr_attempts', filter: `id=eq.${attemptId}` },
        (payload) => {
          const row = payload.new as { status?: string; error_message?: string | null };
          const dbStatus = row?.status;
          if (!dbStatus) return;
          // Map DB truth → UI status (pending|approved|failure → pending|connected|error)
          setQrCodeDialog((prev) => {
            if (prev.attemptId !== attemptId) return prev;
            if (dbStatus === 'connected' && prev.status !== 'connected') {
              return { ...prev, status: 'connected', qrCode: null, expiresAt: null };
            }
            if ((dbStatus === 'error' || dbStatus === 'expired') && prev.status !== 'error') {
              return {
                ...prev,
                status: 'error',
                errorMessage: row.error_message ?? prev.errorMessage ?? 'QR Code inválido. Gere um novo.',
                expiresAt: null,
              };
            }
            // dbStatus === 'pending' → mantém estado atual (UI já está pending)
            return prev;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qrCodeDialog.open, qrCodeDialog.attemptId]);

  // Auto-refresh: regenerate the QR ~5s before it expires (at 55s of the 60s TTL)
  // so the user never has to manually click "Atualizar" mid-scan.
  //
  // Strict guard: only schedules and only fires while the dialog is OPEN and the
  // current status is 'pending' (status local já reconciliado com a fonte de
  // verdade `qr_attempts.status` pelo effect acima). Se o status no banco virar
  // `connected`/`error`/`expired`, o effect de reconciliação atualiza
  // `qrCodeDialog.status`, fazendo este effect re-rodar e cancelar o timer
  // pendente via cleanup — assim o auto-refresh nunca dispara contra um QR já
  // aprovado ou falho no servidor.
  useEffect(() => {
    const decision = evaluateAutoRefresh({
      open: qrCodeDialog.open,
      status: qrCodeDialog.status,
      expiresAt: qrCodeDialog.expiresAt,
    });
    if (decision.schedule === false) {
      log.debug('[qr-auto-refresh] not_scheduled', { reason: decision.reason, status: qrCodeDialog.status });
      return;
    }
    const delay = decision.delayMs;

    log.info('[qr-auto-refresh] scheduled', {
      delayMs: delay,
      leadTimeMs: decision.leadTimeMs,
      ttlSeconds: qrCodeDialog.ttlSeconds,
      ttlSource: qrCodeDialog.ttlSource,
      attemptId: qrCodeDialog.attemptId,
    });
    const scheduledForAttempt = qrCodeDialog.attemptId;
    const generationAtSchedule = dialogGenRef.current;
    const timer = setTimeout(() => {
      // Defesa extra contra race condition: se o usuário fechou o diálogo
      // entre o agendamento e o disparo, dialogGenRef avançou — abortar.
      if (dialogGenRef.current !== generationAtSchedule) {
        log.info('[qr-auto-refresh] fire_aborted', { reason: 'dialog_closed_before_fire', attemptId: scheduledForAttempt });
        return;
      }
      // Re-check the latest dialog state at fire time — the props captured in
      // closure may be stale if the user already closed the dialog or another
      // refresh raced ahead. We use the functional setter to read the freshest
      // state without adding it to the dependency array.
      setQrCodeDialog((current) => {
        if (
          current.open &&
          current.status === 'pending' &&
          current.attemptId === scheduledForAttempt
        ) {
          log.info('[qr-auto-refresh] firing', { attemptId: scheduledForAttempt });
          void handleRefreshQrCode();
        } else {
          log.info('[qr-auto-refresh] fire_skipped', {
            reason: !current.open ? 'dialog_closed' : current.status !== 'pending' ? 'status_changed' : 'attempt_changed',
            currentStatus: current.status,
            currentAttemptId: current.attemptId,
            scheduledForAttempt,
          });
        }
        return current;
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
