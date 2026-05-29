import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle2, Clock, MessageSquare, ArrowRight, 
  AlertCircle, ShieldAlert, Timer
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function TransferTicketsPanel() {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransfers = async () => {
    try {
      const { data, error } = await supabase
        .from('v_pending_transfers')
        .select('*')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransfers(data || []);
    } catch (error: any) {
      console.error('Error fetching transfers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('pending_transfers_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversation_transfers' },
        () => fetchTransfers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAccept = async (transferId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: success, error } = await supabase.rpc('fn_accept_transfer', {
        p_transfer_id: transferId,
        p_agent_id: user.id
      });

      if (error) throw error;
      if (success) {
        toast.success('Transferência aceita com sucesso!');
        fetchTransfers();
      } else {
        toast.error('Não foi possível aceitar a transferência. Ela pode já ter sido aceita.');
      }
    } catch (error: any) {
      toast.error('Erro ao aceitar transferência: ' + error.message);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'P1': return 'bg-red-500 hover:bg-red-600';
      case 'P2': return 'bg-orange-500 hover:bg-orange-600';
      case 'P3': return 'bg-blue-500 hover:bg-blue-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Clock className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="h-full border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-primary" />
              Transferências Pendentes
            </CardTitle>
            <CardDescription>
              Fila de chats aguardando novos atendentes
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            {transfers.length} Pendente(s)
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <ScrollArea className="h-[calc(100vh-250px)] pr-4">
          <div className="space-y-4">
            {transfers.length === 0 ? (
              <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed">
                <CheckCircle2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Tudo limpo por aqui!</p>
              </div>
            ) : (
              transfers.map((transfer) => (
                <Card key={transfer.id} className="overflow-hidden border-l-4" style={{ borderLeftColor: getPriorityColor(transfer.priority).split(' ')[0].replace('bg-', '') }}>
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge className={cn("text-[10px] font-bold px-1.5 py-0", getPriorityColor(transfer.priority))}>
                            {transfer.priority}
                          </Badge>
                          <span className="text-xs font-mono text-muted-foreground">{transfer.ticket_number}</span>
                        </div>
                        <h3 className="font-bold text-base leading-none pt-1">
                          {transfer.contact_name || 'Contato desconhecido'}
                        </h3>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(transfer.created_at), { addSuffix: true, locale: ptBR })}
                        </div>
                        {transfer.sla_deadline && (
                          <div className={cn(
                            "flex items-center gap-1 text-[10px] font-bold mt-1",
                            new Date(transfer.sla_deadline) < new Date() ? "text-red-500" : "text-amber-500"
                          )}>
                            <Timer className="w-3 h-3" />
                            SLA: {formatDistanceToNow(new Date(transfer.sla_deadline), { addSuffix: true, locale: ptBR })}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="bg-muted/30 rounded-lg p-3 mt-2 text-sm italic text-muted-foreground border">
                      <MessageSquare className="w-3 h-3 mb-1 opacity-50" />
                      {transfer.context_summary || 'Sem mensagem de contexto.'}
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="text-[10px] text-muted-foreground">
                        De: <span className="font-medium text-foreground">{transfer.from_agent_name}</span>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleAccept(transfer.id)}
                        className="h-8 gap-2 bg-primary hover:bg-primary/90"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Aceitar Chat
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
