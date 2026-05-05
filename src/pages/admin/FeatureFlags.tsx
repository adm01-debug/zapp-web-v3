import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ShieldAlert, History, Activity, Terminal } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface FeatureConfig {
  enabled: boolean;
  percentage?: number;
  segments?: string[];
  killSwitch?: boolean;
}

interface Flag {
  key: string;
  value: FeatureConfig;
  description: string;
}

export function FeatureFlagsAdmin() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const fetchFlags = useCallback(async () => {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .like('key', 'feature_%');
    
    if (!error && data) {
      setFlags(data.map(f => {
        let val: FeatureConfig = { enabled: false };
        try {
          val = typeof f.value === 'string' ? JSON.parse(f.value) : (typeof f.value === 'boolean' ? { enabled: f.value } : f.value);
        } catch (e) {
          val = { enabled: !!f.value };
        }
        return {
          key: f.key,
          value: val,
          description: f.description || ''
        };
      }));
    }
    setLoading(false);
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(15);
    
    if (!error && data) setAuditLogs(data);
  }, []);

  useEffect(() => {
    fetchFlags();
    fetchAuditLogs();
  }, [fetchFlags, fetchAuditLogs]);

  const updateFlag = async (key: string, newConfig: FeatureConfig) => {
    const { error } = await supabase
      .from('app_settings')
      .update({ 
        value: JSON.stringify(newConfig), 
        updated_at: new Date().toISOString() 
      })
      .eq('key', key);

    if (error) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    } else {
      toast({ title: "Configuração salva", description: `${key.replace('feature_', '')} atualizado com sucesso.` });
      fetchFlags();
      fetchAuditLogs();
    }
  };

  const killSwitch = async () => {
    const criticalFlags = ['feature_v2_audio_recorder', 'feature_message_queue_retry'];
    setLoading(true);
    
    for (const key of criticalFlags) {
      await supabase.from('app_settings').update({ 
        value: JSON.stringify({ enabled: false, killSwitch: true }),
        updated_at: new Date().toISOString()
      }).eq('key', key);
    }
    
    toast({ 
      title: "EMERGÊNCIA: KILL-SWITCH ATIVADO", 
      description: "Funcionalidades críticas bloqueadas permanentemente via killSwitch: true.", 
      variant: "destructive" 
    });
    fetchFlags();
    fetchAuditLogs();
    setLoading(false);
  };

  if (loading) return <div className="p-8 text-center animate-pulse">Carregando infraestrutura de controle...</div>;

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter flex items-center gap-3">
            <Terminal className="w-10 h-10 text-primary" /> Admin Panel: Feature Management
          </h1>
          <p className="text-muted-foreground font-medium">Controle granular de rollout, segmentação e segurança.</p>
        </div>
        <Button 
          variant="destructive" 
          size="lg"
          onClick={killSwitch} 
          className="gap-2 font-black uppercase tracking-widest shadow-2xl shadow-destructive/40 hover:scale-105 transition-transform"
        >
          <ShieldAlert className="w-6 h-6 animate-pulse" /> Kill-Switch de Emergência
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {flags.map(flag => (
            <Card key={flag.key} className={`border-2 transition-all ${flag.value.killSwitch ? 'border-destructive bg-destructive/5' : 'hover:border-primary/40'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
                      {flag.key.replace('feature_', '')}
                      {flag.value.killSwitch && <span className="text-[10px] bg-destructive text-white px-2 py-0.5 rounded-full">LOCKED</span>}
                    </CardTitle>
                    <CardDescription className="text-sm">{flag.description || 'Controle esta funcionalidade.'}</CardDescription>
                  </div>
                  <Switch 
                    disabled={flag.value.killSwitch}
                    checked={flag.value.enabled} 
                    onCheckedChange={(val) => updateFlag(flag.key, { ...flag.value, enabled: val })}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6 pt-2 border-t border-border/50 mt-2">
                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Rollout Progressivo (%)</Label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        step="5"
                        disabled={flag.value.killSwitch || !flag.value.enabled}
                        value={flag.value.percentage || 0}
                        onChange={(e) => updateFlag(flag.key, { ...flag.value, percentage: parseInt(e.target.value) })}
                        className="flex-1 accent-primary"
                      />
                      <span className="font-mono font-bold w-8">{flag.value.percentage || 0}%</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Segmentos (IDs separados por vírgula)</Label>
                    <input 
                      type="text"
                      placeholder="user-123, tenant-abc"
                      disabled={flag.value.killSwitch || !flag.value.enabled}
                      defaultValue={flag.value.segments?.join(', ') || ''}
                      onBlur={(e) => {
                        const segments = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                        updateFlag(flag.key, { ...flag.value, segments });
                      }}
                      className="w-full bg-muted/50 border-none rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 ring-primary/20 outline-none"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-6">
          <Card className="border-2 border-primary/10 sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="w-5 h-5 text-primary" /> Audit Trail
              </CardTitle>
              <CardDescription>Rastreabilidade total de alterações.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto px-4 pb-4 space-y-3">
                {auditLogs.map((log, i) => (
                  <div key={i} className="group p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-primary">{new Date(log.created_at).toLocaleString()}</span>
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 rounded uppercase font-bold">{log.action}</span>
                    </div>
                    <div className="text-[11px] font-mono break-all line-clamp-2">
                      <span className="font-bold text-foreground">{(log.new_data as any)?.key?.replace('feature_', '')}</span>
                      <p className="text-muted-foreground mt-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        {JSON.stringify(log.new_data?.value)}
                      </p>
                    </div>
                  </div>
                ))}
                {auditLogs.length === 0 && (
                  <div className="py-12 text-center space-y-2">
                    <Activity className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                    <p className="text-xs text-muted-foreground">Nenhuma atividade registrada.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

