import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { 
  Activity, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Server, 
  Wifi, 
  WifiOff, 
  Zap,
  Clock,
  MessageSquare,
  ShieldCheck,
  Smartphone,
  History,
  Info
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { whatsapp } from "@/lib/whatsappAdapter";
import { getExternalSupabase, isExternalConfigured } from "@/integrations/supabase/externalClient";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type BridgeStatus = "online" | "degraded" | "offline" | "loading";

export default function BridgeStatusPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<BridgeStatus>("loading");
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  
  // Status Details
  const [lovableDb, setLovableDb] = useState<boolean | null>(null);
  const [externalDb, setExternalDb] = useState<boolean | null>(null);
  const [whatsappTransport, setWhatsappTransport] = useState<string>("...");
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [instanceCount, setInstanceCount] = useState<number>(0);
  const [recentTraffic, setRecentTraffic] = useState<{count: number, last_at: string | null}>({count: 0, last_at: null});

  const fetchIncidents = useCallback(async () => {
    const { data } = await supabase
      .from('system_health_incidents')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10);
    setIncidents(data || []);
  }, []);

  async function checkHealth() {
    setLoading(true);
    const startTime = Date.now();
    
    try {
      // 1. Check Lovable DB (Internal)
      const { error: internalError } = await supabase.from('profiles').select('count').limit(1);
      setLovableDb(!internalError);

      // 2. Check External DB (FATOR X / Evolution)
      let externalOk = false;
      if (isExternalConfigured) {
        const extSupabase = getExternalSupabase();
        if (extSupabase) {
          const { error: extError } = await extSupabase.from('instance').select('count').limit(1);
          externalOk = !extError;
          
          if (externalOk) {
            // Get some quick stats if available
            const { count } = await extSupabase.from('instance').select('*', { count: 'exact', head: true });
            setInstanceCount(count || 0);
          }
        }
      }
      setExternalDb(externalOk);

      // 3. Check WhatsApp Transport
      const transport = await whatsapp.resolveTransport();
      setWhatsappTransport(`${transport.requestedMode}${transport.degraded ? " (DEGRADED)" : ""}`);

      // 4. Check Recent Message Traffic (from internal log for proxy or external)
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { count: msgCount, data: lastMsg } = await supabase
        .from('provider_message_log')
        .select('received_at', { count: 'exact' })
        .gt('received_at', fiveMinsAgo)
        .order('received_at', { ascending: false })
        .limit(1);
      
      setRecentTraffic({
        count: msgCount || 0,
        last_at: lastMsg?.[0]?.received_at || null
      });

      // 5. Check Active Alerts (if table exists)
      try {
        const { data: alerts } = await supabase
          .from('v_alerts_active' as any)
          .select('*')
          .limit(5);
        setActiveAlerts(alerts || []);
      } catch (e) {
        setActiveAlerts([]);
      }

      // Determine Overall Status
      if (!lovableDb) setStatus("offline");
      else if (!externalOk || transport.degraded) setStatus("degraded");
      else setStatus("online");

      setLastCheck(new Date());
    } catch (error: any) {
      console.error("Health check failed:", error);
      setStatus("offline");
      toast({
        title: "Erro na verificação",
        description: error.message || "Não foi possível validar todos os serviços.",
        variant: "destructive"
      });
    } finally {
      const elapsed = Date.now() - startTime;
      const minWait = 600;
      if (elapsed < minWait) await new Promise(r => setTimeout(r, minWait - elapsed));
      setLoading(false);
    }
  }

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 60000); // Auto-refresh every minute
    return () => clearInterval(interval);
  }, []);

  const statusColors = {
    online: "bg-success text-success-foreground border-success/20",
    degraded: "bg-warning text-warning-foreground border-warning/20",
    offline: "bg-destructive text-destructive-foreground border-destructive/20",
    loading: "bg-muted text-muted-foreground border-muted/20"
  };

  const statusLabels = {
    online: "SISTEMA OPERACIONAL",
    degraded: "DESEMPENHO REDUZIDO",
    offline: "SISTEMA INDISPONÍVEL",
    loading: "VERIFICANDO..."
  };

  return (
    <div className="p-6 space-y-6 bg-background min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" /> Status da Ponte (Bridge)
          </h1>
          <p className="text-muted-foreground text-sm">
            Monitoramento em tempo real do fluxo entre Lovable Cloud e FATOR X (Self-Hosted).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Última checagem</p>
            <p className="text-xs font-mono">{lastCheck.toLocaleTimeString()}</p>
          </div>
          <Button variant="outline" size="sm" onClick={checkHealth} disabled={loading} className="gap-2">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Agora
          </Button>
        </div>
      </div>

      {/* Main Status Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }}
        className={`p-8 rounded-2xl border-2 flex flex-col items-center justify-center text-center gap-4 transition-colors duration-500 ${statusColors[status]}`}
      >
        <div className="relative">
          {status === 'online' && <CheckCircle2 className="w-16 h-16" />}
          {status === 'degraded' && <AlertTriangle className="w-16 h-16 animate-pulse" />}
          {status === 'offline' && <WifiOff className="w-16 h-16 animate-bounce" />}
          {status === 'loading' && <RefreshCw className="w-16 h-16 animate-spin" />}
          {status === 'online' && (
            <motion.div 
              initial={{ scale: 0 }} animate={{ scale: 1.5, opacity: 0 }} 
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 bg-white/30 rounded-full" 
            />
          )}
        </div>
        <div>
          <h2 className="text-3xl font-black tracking-tighter">{statusLabels[status]}</h2>
          <p className="opacity-80 text-sm font-medium max-w-md mx-auto mt-1">
            {status === 'online' && "Todos os componentes estão respondendo dentro dos limites de latência esperados."}
            {status === 'degraded' && "Um ou mais serviços estão com lentidão ou conectividade parcial."}
            {status === 'offline' && "Interrupção crítica detectada. A ponte não consegue processar mensagens."}
            {status === 'loading' && "Validando integridade dos schemas e conectividade de rede..."}
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Core Services */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="w-4 h-4" /> Serviços Críticos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${lovableDb ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Lovable Cloud (Internal DB)</p>
                    <p className="text-xs text-muted-foreground">Persistência de dados e autenticação</p>
                  </div>
                </div>
                <Badge variant={lovableDb ? "default" : "destructive"}>{lovableDb ? "ATIVO" : "ERRO"}</Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${externalDb ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">FATOR X Bridge (Self-Hosted)</p>
                    <p className="text-xs text-muted-foreground">Instância Evolution / Postgres Externo</p>
                  </div>
                </div>
                <Badge variant={externalDb ? "default" : "warning"}>{externalDb ? "CONECTADO" : "FALHA"}</Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${status === 'online' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">WhatsApp Transport</p>
                    <p className="text-xs text-muted-foreground">Canal de saída: {whatsappTransport}</p>
                  </div>
                </div>
                <Badge variant={whatsappTransport.includes("DEGRADED") ? "warning" : "default"}>
                  {whatsappTransport.includes("DEGRADED") ? "DEGRADADO" : "NOMINAL"}
                </Badge>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase text-muted-foreground">Tráfego Recente (5 min)</span>
                <span className="text-xs font-mono">{recentTraffic.count} msgs</span>
              </div>
              <Progress value={Math.min(recentTraffic.count * 2, 100)} className="h-1.5" />
              {recentTraffic.last_at && (
                <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Último evento capturado: {new Date(recentTraffic.last_at).toLocaleTimeString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats & Quick Links */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Instâncias Ativas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">{instanceCount}</div>
              <p className="text-[10px] text-muted-foreground mt-1">Sincronizadas com FATOR X</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" /> Alertas Ativos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeAlerts.length > 0 ? (
                activeAlerts.map(alert => (
                  <div key={alert.id} className="p-2 rounded bg-muted/50 border-l-2 border-warning text-[11px]">
                    <p className="font-bold">{alert.title}</p>
                    <p className="opacity-70 line-clamp-1">{alert.alert_type}</p>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-4 text-center opacity-50">
                  <CheckCircle2 className="w-8 h-8 mb-2" />
                  <p className="text-xs">Nenhum incidente crítico</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Connection Failure Advice */}
      <AnimatePresence>
        {status !== 'online' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
              <WifiOff className="h-4 w-4" />
              <AlertTitle>Guia de Recuperação</AlertTitle>
              <AlertDescription className="text-xs space-y-2">
                <p>Detectamos problemas de conectividade. Siga estes passos:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Verifique se o servidor <strong>FATOR X</strong> está ligado e o Docker está rodando.</li>
                  <li>Teste o ping para o IP do seu Supabase Self-Hosted.</li>
                  <li>Certifique-se de que o <code>external-db-proxy</code> não está bloqueado por firewall.</li>
                  <li>Tente atualizar os <strong>Secrets</strong> em Configurações → Backend.</li>
                </ul>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
