import { WhatsAppConnection, QrCodeDialogState, WhatsAppApiType } from '../useConnectionsManager';

export interface UseConnectionsManagerState {
  connections: WhatsAppConnection[];
  loading: boolean;
  isAddDialogOpen: boolean;
  qrCodeDialog: QrCodeDialogState;
  newConnection: { name: string; phone_number: string; api_type: WhatsAppApiType };
  isCreating: boolean;
  syncingHistory: string | null;
}
