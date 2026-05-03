import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { log } from '@/lib/logger';
import { WhatsAppConnection, QrCodeDialogState } from '../useConnectionsManager';

export function useConnectionsRealtime(
  setConnections: React.Dispatch<React.SetStateAction<WhatsAppConnection[]>>,
  qrCodeDialog: QrCodeDialogState,
  setQrCodeDialog: React.Dispatch<React.SetStateAction<QrCodeDialogState>>,
  announceConnected: (conn: { id: string; name: string }) => void
) {
  useEffect(() => {
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
            
            if (newConn.status === 'connected' && oldConn?.status !== 'connected') {
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
                  expiresAt: prev.expiresAt ?? Date.now() + 60_000,
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
    };
  }, [qrCodeDialog.open, qrCodeDialog.connectionId, setConnections, setQrCodeDialog, announceConnected]);
}
