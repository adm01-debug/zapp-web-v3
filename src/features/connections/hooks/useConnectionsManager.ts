import { useState, useEffect, useCallback, useRef } from 'react';
import { log } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useEvolutionApi } from '@/hooks/useEvolutionApi';
import { evaluateAutoRefresh } from '@/hooks/connections/qrAutoRefresh';
import { whatsappConnectionRepository } from '@/features/connections/data-access/whatsappConnectionRepository';
import { whatsappConnectionService } from '@/features/connections/services/whatsappConnectionService';
import { useConnectionsState } from './parts/useConnectionsState';
import { useConnectionsRealtime } from './parts/useConnectionsRealtime';
import { useConnectionsActions } from './parts/useConnectionsActions';

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

export type QrTtlSource = 'detected' | 'default' | 'clamped';

export interface QrCodeDialogState {
  open: boolean;
  connectionId: string;
  connectionName: string;
  qrCode: string | null;
  status: 'loading' | 'pending' | 'connected' | 'error';
  errorMessage?: string;
  expiresAt: number | null;
  attemptId: string | null;
  ttlSeconds: number | null;
  ttlSource: QrTtlSource | null;
}

const QR_TTL_DEFAULT_MS = 60_000;
const QR_TTL_MIN_MS = 15_000;
const QR_TTL_MAX_MS = 5 * 60_000;
const QR_STORAGE_KEY = 'zapp:qrDialog:v1';

function loadPersistedQr(): any | null {
  try {
    const raw = sessionStorage.getItem(QR_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
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
    const payload = {
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
    // ignore storage errors
  }
}

function clearPersistedQr() {
  try { sessionStorage.removeItem(QR_STORAGE_KEY); } catch { /* noop */ }
}

export function useConnectionsManager() {
  const state = useConnectionsState();
  const { 
    connections, setConnections, loading, setLoading, isAddDialogOpen, setIsAddDialogOpen,
    qrCodeDialog, setQrCodeDialog, newConnection, setNewConnection, isCreating, setIsCreating,
    dialogGenRef, refreshInFlightRef, announceConnected, INITIAL_QR_STATE
  } = state;

  const {
    isLoading: evolutionLoading,
    createInstance,
    getInstanceStatus,
    disconnectInstance,
    deleteInstance,
  } = useEvolutionApi();

  const actions = useConnectionsActions(
    connections, setConnections, setIsCreating, setIsAddDialogOpen, setNewConnection,
    (conn) => handleShowQrCode(conn), disconnectInstance, deleteInstance
  );

  useConnectionsRealtime(setConnections, qrCodeDialog, setQrCodeDialog, announceConnected);

  useEffect(() => {
    savePersistedQr(qrCodeDialog);
  }, [qrCodeDialog]);

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    setLoading(true);
    const data = await whatsappConnectionRepository.fetchConnections();
    setConnections(data as WhatsAppConnection[]);
    setLoading(false);
  };

  const handleShowQrCode = async (connection: WhatsAppConnection) => {
    if ((connection.api_type ?? 'evolution') === 'official') {
      toast({
        title: 'QR Code não disponível',
        description: 'Esta conexão usa WhatsApp Cloud API (oficial).',
        variant: 'destructive',
      });
      return;
    }
    if (!connection.instance_id) {
      toast({ title: 'Erro', description: 'Instância não configurada.', variant: 'destructive' });
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
  };

  const closeQrDialog = () => {
    dialogGenRef.current += 1;
    refreshInFlightRef.current = false;
    clearPersistedQr();
    setQrCodeDialog(INITIAL_QR_STATE);
  };

  return {
    ...state,
    evolutionLoading,
    ...actions,
    handleShowQrCode,
    closeQrDialog
  };
}
