import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { whatsappConnectionService } from '@/features/connections/services/whatsappConnectionService';
import { getLogger } from '@/lib/logger';

const log = getLogger('useConnectionsActions');

export function useConnectionsActions(connections: any[], fetchData: () => void, handleShowQrCode: (conn: any) => void) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newConnection, setNewConnection] = useState({ name: '', phone_number: '', api_type: 'evolution' });

  const handleCreateConnection = useCallback(async () => {
    if (!newConnection.name) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }
    
    const isOfficial = newConnection.api_type === 'official';
    const instanceName = isOfficial ? `official_${Date.now().toString(36)}` : whatsappConnectionService.generateInstanceName(newConnection.name);
    
    try {
      const { data, error } = await (supabase.from('whatsapp_connections' as any).insert({
        name: newConnection.name,
        phone_number: newConnection.phone_number,
        instance_id: instanceName,
        status: 'disconnected',
        is_default: connections.length === 0,
        api_type: newConnection.api_type as any,
      }) as any).select().single();
      
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
      fetchData();
    } catch (error: any) {
      log.error('Error creating connection:', error);
      toast({ title: 'Erro ao criar conexão', description: error.message, variant: 'destructive' });
    }
  }, [newConnection, connections, fetchData, handleShowQrCode, toast]);

  const handleDeleteConnection = useCallback(async (id: string) => {
    const { error } = await supabase.from('whatsapp_connections' as any).delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao deletar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Conexão removida' });
      fetchData();
    }
  }, [fetchData, toast]);

  return {
    isAddDialogOpen,
    setIsAddDialogOpen,
    newConnection,
    setNewConnection,
    handleCreateConnection,
    handleDeleteConnection,
  };
}
