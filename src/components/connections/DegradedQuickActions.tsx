import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, QrCode, Stethoscope, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

interface DegradedConnection {
  id: string;
  instance_id?: string | null;
  name?: string | null;
  health_status?: string | null;
  health_response_ms?: number | null;
  last_health_check?: string | null;
}

interface Props {
  connections: DegradedConnection[];
  // Accept the parent's full connection shape — we just forward it.
  onShowQrCode: (connection: any) => void;
}

/** Quick-actions block for degraded instances: diagnostics link, QR regen, revalidate now. */
export function DegradedQuickActions({ connections, onShowQrCode }: Props) {
  const [revalidating, setRevalidating] = useState<string | null>(null);

  const degraded = connections.filter((c) => c.health_status === 'degraded');
  if (degraded.length === 0) return null;

  const goToDiagnostics = () => {
    window.dispatchEvent(new CustomEvent('navigate-view', { detail: 'diagnostics' }));
  };

  const handleRevalidate = async (conn: DegradedConnection) => {
    setRevalidating(conn.id);
    try {
      const { error } = await supabase.functions.invoke('connection-health-check', {
        body: { connectionId: conn.id, instanceName: conn.instance_id },
      });
      if (error) throw error;
      toast({ title: 'Status revalidado', description: `Verificação de "${conn.instance_id}" concluída.` });
    } catch (e: unknown) {
      toast({
        title: 'Falha ao revalidar',
        description: e instanceof Error ? e.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setRevalidating(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border border-warning/30 bg-warning/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <h3 className="text-sm font-semibold">
              Ações rápidas — {degraded.length === 1 ? '1 instância rebaixada' : `${degraded.length} instâncias rebaixadas`}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Estas instâncias apresentaram desempenho degradado na última verificação. Atue rapidamente para evitar perda de mensagens.
          </p>

          <ul className="divide-y divide-border/60">
            {degraded.map((conn) => (
              <li key={conn.id} className="py-2 flex flex-wrap items-center gap-2">
                <div className="flex-1 min-w-[180px]">
                  <p className="text-sm font-medium">{conn.name || conn.instance_id}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {conn.instance_id}
                    {conn.health_response_ms != null && <> · {conn.health_response_ms}ms</>}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={goToDiagnostics}>
                  <Stethoscope className="w-3.5 h-3.5 mr-1.5" />Diagnósticos
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onShowQrCode({ id: conn.id, instance_id: conn.instance_id, name: conn.name })}
                  disabled={!conn.instance_id}
                >
                  <QrCode className="w-3.5 h-3.5 mr-1.5" />Gerar QR
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleRevalidate(conn)}
                  disabled={revalidating === conn.id}
                >
                  {revalidating === conn.id
                    ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
                  Revalidar agora
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </motion.div>
  );
}