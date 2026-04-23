import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DisconnectedInstance {
  id: string;
  instance_id: string;
  phone_number: string | null;
  status: string;
}

export function EvolutionDisconnectBanner() {
  const [disconnected, setDisconnected] = useState<DisconnectedInstance[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [reconnecting, setReconnecting] = useState<string | null>(null);

  const fetchStatus = async () => {
    const { data } = await supabase
      .from('whatsapp_connections')
      .select('id, instance_id, phone_number, status')
      .eq('status', 'disconnected');
    if (data && data.length > 0) {
      setDisconnected(data as DisconnectedInstance[]);
      setDismissed(false); // Re-show if new disconnections
    } else {
      setDisconnected([]);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Real-time updates on connection status changes
    const channel = supabase
      .channel('disconnect-banner')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'whatsapp_connections' },
        () => { fetchStatus(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleReconnect = async (conn: DisconnectedInstance) => {
    setReconnecting(conn.instance_id);
    try {
      // banner usa `connect` (gera QR novo); a edge function lida com instância
      // ausente (404) recriando automaticamente, e devolve erro estruturado em
      // caso de 401/403 (autenticação) — que NÃO deve disparar fallback.
      const { data, error } = await supabase.functions.invoke('evolution-api', {
        body: { action: 'connect', instanceName: conn.instance_id },
      });

      if (error) throw new Error(error.message || 'Falha ao invocar evolution-api');

      if (data?.error === true) {
        const code = typeof data?.code === 'string' ? data.code : null;
        const message = data?.message || 'Evolution API retornou erro';
        if (code === 'EVOLUTION_AUTH_ERROR') {
          toast.error(`Integração sem autorização: ${message}`, { duration: 8000 });
          return;
        }
        throw new Error(message);
      }

      toast.success(`Reconectando ${conn.instance_id}... Abrindo tela de conexões para escanear o QR Code.`);
      window.dispatchEvent(new CustomEvent('navigate-view', { detail: 'connections' }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido';
      toast.error(`Erro ao reconectar ${conn.instance_id}: ${msg}`);
    } finally {
      setReconnecting(null);
    }
  };

  if (disconnected.length === 0 || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -40 }}
        className="fixed top-0 left-0 right-0 z-[90] bg-destructive text-destructive-foreground shadow-lg"
      >
        <div className="flex items-center justify-center gap-3 py-2.5 px-4 max-w-screen-xl mx-auto">
          <WifiOff className="w-5 h-5 shrink-0 animate-pulse" />
          <span className="text-sm font-semibold">
            {disconnected.length === 1
              ? `⚠️ Conexão "${disconnected[0].instance_id}" está desconectada!`
              : `⚠️ ${disconnected.length} conexões estão desconectadas!`}
          </span>
          <span className="text-xs opacity-80 hidden sm:inline">
            Mensagens não serão enviadas/recebidas.
          </span>
          {disconnected.length === 1 && (
            <button
              onClick={() => handleReconnect(disconnected[0])}
              disabled={reconnecting === disconnected[0].instance_id}
              className="ml-2 px-3 py-1 bg-destructive-foreground/20 hover:bg-destructive-foreground/30 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={cn('w-3 h-3', reconnecting && 'animate-spin')} />
              Reconectar
            </button>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="ml-auto p-1 rounded hover:bg-destructive-foreground/20 transition-colors shrink-0"
            aria-label="Fechar alerta"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
