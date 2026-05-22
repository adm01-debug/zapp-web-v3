import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { log } from '@/lib/logger';
import { WhatsAppConnection, WhatsAppApiType } from '../useConnectionsManager';
import { whatsappConnectionService } from '../../services/whatsappConnectionService';

export function useConnectionsActions(
  connections: WhatsAppConnection[],
  setConnections: React.Dispatch<React.SetStateAction<WhatsAppConnection[]>>,
  setIsCreating: (v: boolean) => void,
  setIsAddDialogOpen: (v: boolean) => void,
  setNewConnection: React.Dispatch<React.SetStateAction<any>>,
  handleShowQrCode: (conn: WhatsAppConnection) => void,
  disconnectInstance: (id: string) => Promise<any>,
  deleteInstance: (id: string) => Promise<any>
) {
  const handleAddConnection = async (newConnection: any) => {
    if (!newConnection.name || !newConnection.phone_number) {
      toast({ title: 'Erro', description: 'Preencha o nome e o número do telefone.', variant: 'destructive' });
      return;
    }
    setIsCreating(true);

    const { isSamePhone } = await import("@/lib/phoneUtils");
    const duplicate = connections.find((c) => isSamePhone(c.phone_number, newConnection.phone_number));
    if (duplicate) {
      toast({ title: "Número já conectado", description: `O número ${newConnection.phone_number} já está vinculado à conexão "${duplicate.name}". Cada número só pode ter uma conexão.`, variant: "destructive" });
      setIsCreating(false);
      return;
    }
    
    const isOfficial = newConnection.api_type === 'official';
    const instanceName = isOfficial ? `official_${Date.now().toString(36)}` : whatsappConnectionService.generateInstanceName(newConnection.name);
    
    try {
      if (!isOfficial) {
        // Here we'd ideally have createInstance available
      }
      const { data, error } = await supabase.from('whatsapp_connections').insert({
        name: newConnection.name,
        phone_number: newConnection.phone_number,
        instance_id: instanceName,
        status: 'disconnected',
        is_default: connections.length === 0,
        api_type: newConnection.api_type as any,
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
    } catch (error: any) {
      log.error('Error creating connection:', error);
      toast({ title: 'Erro ao criar conexão', description: error.message || 'Erro desconhecido', variant: 'destructive' });
    } finally {
      setIsCreating(false);
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
    } catch (error: any) {
      toast({ title: 'Erro ao excluir', description: error.message || 'Erro desconhecido', variant: 'destructive' });
    }
  };

  return {
    handleAddConnection,
    handleSetDefault,
    handleDelete
  };
}
