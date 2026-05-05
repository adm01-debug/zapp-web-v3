import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertCircle, ShieldAlert, History, Activity, Terminal } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

interface Flag {
  key: string;
  value: boolean | number;
  description: string;
}

export function FeatureFlagsAdmin() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchFlags();
    fetchAuditLogs();
  }, []);

  const fetchFlags = useCallback(async () => {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .like('key', 'feature_%');
    
    if (!error && data) {
      setFlags(data.map(f => ({
        key: f.key,
        value: typeof f.value === 'boolean' || typeof f.value === 'number' ? f.value : false,
        description: f.description || ''
      })));
    }
    setLoading(false);
  };

  const fetchAuditLogs = async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (!error && data) setAuditLogs(data);
  };

  const toggleFlag = async (key: string, currentValue: boolean) => {
    const newValue = !currentValue;
    const { error } = await supabase
      .from('app_settings')
      .update({ value: newValue, updated_at: new Date().toISOString() })
      .eq('key', key);

    if (error) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    } else {
      toast({ title: "Configuração salva", description: `${key} agora está ${newValue ? 'ligado' : 'desligado'}` });
      fetchFlags();
      fetchAuditLogs();
    }
  };

  const killSwitch = async () => {
    const flagsToDisable = ['feature_v2_audio_recorder', 'feature_message_queue_retry'];
    setLoading(true);
    
    for (const key of flagsToDisable) {
      await supabase.from('app_settings').update({ value: false }).eq('key', key);
    }
    
    toast({ title: "KILL-SWITCH ATIVADO", description: "Módulos críticos desligados imediatamente.", variant: "destructive" });
    fetchFlags();
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tighter flex items-center gap-2">
          <Terminal className="w-8 h-8 text-primary" /> Admin Panel: Feature Flags
        </h1>
        <Button variant="destructive" onClick={killSwitch} className="gap-2 font-black uppercase tracking-widest shadow-xl shadow-destructive/20">
          <ShieldAlert className="w-5 h-5" /> Kill-Switch Imediato
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" /> Controle de Rollout
            </CardTitle>
            <CardDescription>Habilite novas funcionalidades por segmento ou porcentagem.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {flags.map(flag => (
              <div key={flag.key} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50">
                <div className="space-y-1">
                  <Label className="text-sm font-bold uppercase tracking-wider">{flag.key.replace('feature_', '')}</Label>
                  <p className="text-xs text-muted-foreground">{flag.description || 'Nenhuma descrição disponível.'}</p>
                </div>
                <Switch 
                  checked={!!flag.value} 
                  onCheckedChange={() => toggleFlag(flag.key, !!flag.value)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-2 border-primary/10 bg-primary/[0.02]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" /> Auditoria & Logs
            </CardTitle>
            <CardDescription>Histórico recente de mudanças no sistema.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {auditLogs.map((log, i) => (
              <div key={i} className="text-[11px] font-mono p-2 border-b border-primary/5 last:border-none">
                <span className="text-primary font-bold">[{new Date(log.created_at).toLocaleTimeString()}]</span>{' '}
                <span className="text-muted-foreground">{log.action}:</span>{' '}
                <span className="font-bold">{log.new_data?.key || 'N/A'}</span> {'->'} {JSON.stringify(log.new_data?.value)}
              </div>
            ))}
            {auditLogs.length === 0 && <p className="text-center text-muted-foreground text-xs py-8">Nenhuma mudança auditada.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
