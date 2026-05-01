import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Wifi, WifiOff, Save, Eye, EyeOff, RefreshCw, CheckCircle2, XCircle,
  Loader2, ShieldCheck, Server, Key, ExternalLink,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface EvolutionConfig {
  evolution_api_url: string;
  evolution_api_key: string;
}

const DEFAULT_URL = 'https://evolution.atomicabr.com.br';
const SETTINGS_KEY = 'evolution_api_config';

export function EvolutionApiIntegrationView() {
  const [config, setConfig] = useState<EvolutionConfig>({
    evolution_api_url: DEFAULT_URL,
    evolution_api_key: '',
  });
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [testMessage, setTestMessage] = useState('');
  const [loaded, setLoaded] = useState(false);

  // Load saved config
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', SETTINGS_KEY)
          .maybeSingle();
        if (data?.value) {
          const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
          setConfig({
            evolution_api_url: parsed.evolution_api_url || DEFAULT_URL,
            evolution_api_key: parsed.evolution_api_key || '',
          });
        }
      } catch (err) {
        console.warn('[evo-config] Failed to load config:', err);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const handleSave = useCallback(async () => {
    if (!config.evolution_api_url.trim() || !config.evolution_api_key.trim()) {
      toast.error('Preencha a URL e a Chave de API');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert(
          {
            key: SETTINGS_KEY,
            value: JSON.stringify(config),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        );

      if (error) throw error;
      toast.success('Configura\u00e7\u00f5es da Evolution API salvas com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + (err?.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  }, [config]);

  const handleTest = useCallback(async () => {
    if (!config.evolution_api_url.trim() || !config.evolution_api_key.trim()) {
      toast.error('Preencha a URL e a Chave de API antes de testar');
      return;
    }

    setTesting(true);
    setTestResult(null);
    setTestMessage('');

    try {
      const url = config.evolution_api_url.replace(/\/+$/, '');
      const response = await fetch(`${url}/instance/fetchInstances`, {
        method: 'GET',
        headers: { apikey: config.evolution_api_key },
      });

      if (response.ok) {
        const data = await response.json();
        const instances = Array.isArray(data) ? data : [];
        const connected = instances.filter((i: any) => i.connectionStatus === 'open').length;
        setTestResult('success');
        setTestMessage(`Conex\u00e3o OK! ${instances.length} inst\u00e2ncia(s) encontrada(s), ${connected} online.`);
        toast.success('Conex\u00e3o com a Evolution API estabelecida!');
      } else if (response.status === 401) {
        setTestResult('error');
        setTestMessage('Chave de API inv\u00e1lida. Verifique e tente novamente.');
        toast.error('Chave de API inv\u00e1lida');
      } else {
        setTestResult('error');
        setTestMessage(`Erro HTTP ${response.status}: ${response.statusText}`);
        toast.error(`Erro: HTTP ${response.status}`);
      }
    } catch (err: any) {
      setTestResult('error');
      setTestMessage(err?.message?.includes('fetch') 
        ? 'N\u00e3o foi poss\u00edvel conectar. Verifique se a URL est\u00e1 correta e acess\u00edvel.'
        : err?.message || 'Erro desconhecido');
      toast.error('Falha na conex\u00e3o');
    } finally {
      setTesting(false);
    }
  }, [config]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-whatsapp/20 flex items-center justify-center">
            <Wifi className="w-5 h-5 text-whatsapp" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">Evolution API</h2>
            <p className="text-sm text-muted-foreground">Configure a conex\u00e3o com sua inst\u00e2ncia Evolution API</p>
          </div>
        </div>
      </motion.div>

      {/* Main config card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="w-4 h-4" />
              Configura\u00e7\u00e3o do Servidor
            </CardTitle>
            <CardDescription>
              Informe a URL e a chave de API da sua inst\u00e2ncia Evolution API.
              Essas credenciais s\u00e3o usadas para conectar WhatsApp, gerar QR Codes e enviar mensagens.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* URL */}
            <div className="space-y-2">
              <Label htmlFor="evo-url" className="flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5" />
                URL da Evolution API
              </Label>
              <Input
                id="evo-url"
                type="url"
                placeholder="https://evolution.seudominio.com.br"
                value={config.evolution_api_url}
                onChange={(e) => setConfig(prev => ({ ...prev, evolution_api_url: e.target.value }))}
                className="font-mono text-sm"
              />
              <p className="text-[11px] text-muted-foreground">Exemplo: https://evolution.atomicabr.com.br</p>
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label htmlFor="evo-key" className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" />
                Chave de API (API Key)
              </Label>
              <div className="relative">
                <Input
                  id="evo-key"
                  type={showKey ? 'text' : 'password'}
                  placeholder="429683C4C977415CAAFCCE10F7D57E11"
                  value={config.evolution_api_key}
                  onChange={(e) => setConfig(prev => ({ ...prev, evolution_api_key: e.target.value }))}
                  className="font-mono text-sm pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Encontre no arquivo .env da Evolution API: AUTHENTICATION_API_KEY
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button onClick={handleTest} variant="outline" disabled={testing || !config.evolution_api_key}>
                {testing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
                Testar Conex\u00e3o
              </Button>
              <Button onClick={handleSave} disabled={saving || !config.evolution_api_key}>
                {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
                Salvar
              </Button>
            </div>

            {/* Test result */}
            {testResult && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-start gap-2 p-3 rounded-lg border ${
                  testResult === 'success'
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : 'bg-red-500/5 border-red-500/20'
                }`}
              >
                {testResult === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                )}
                <span className={`text-xs ${testResult === 'success' ? 'text-emerald-300' : 'text-red-300'}`}>
                  {testMessage}
                </span>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Info card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="border-primary/10 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Seguran\u00e7a</p>
                <p className="text-xs text-muted-foreground">
                  A chave de API \u00e9 armazenada de forma segura no banco de dados e nunca \u00e9 exposta no c\u00f3digo-fonte.
                  Apenas usu\u00e1rios autenticados com permiss\u00e3o de administrador podem visualizar ou alterar essas configura\u00e7\u00f5es.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
