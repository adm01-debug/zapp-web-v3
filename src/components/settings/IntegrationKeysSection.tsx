import { useState, useEffect } from 'react';
import { useGlobalSettings } from '@/hooks/useGlobalSettings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Plug, Eye, EyeOff, Save, CheckCircle2, AlertCircle, RefreshCw, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { useEvolutionApi } from '@/hooks/useEvolutionApi';

interface KeyField {
  key: string;
  label: string;
  description: string;
  placeholder: string;
}

const INTEGRATION_KEYS: KeyField[] = [
  {
    key: 'evolution_api_url',
    label: 'Evolution API URL',
    description: 'URL base da sua instância Evolution API (ex: https://api.evolution.com)',
    placeholder: 'https://...',
  },
  {
    key: 'evolution_api_token',
    label: 'Evolution Global Apikey',
    description: 'Token global de autenticação (Global Apikey) do seu servidor Evolution',
    placeholder: '...',
  },
  {
    key: 'elevenlabs_api_key',
    label: 'ElevenLabs API Key',
    description: 'Chave para geração de voz (TTS), efeitos sonoros e conversão de voz',
    placeholder: 'xi-...',
  },
];

export function IntegrationKeysSection() {
  const { isLoading, getSetting, addSetting, refetch } = useGlobalSettings();
  const { listInstances, isLoading: evolutionLoading } = useEvolutionApi();
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Sync with localStorage for direct mode
  useEffect(() => {
    const url = getSetting('evolution_api_url');
    const token = getSetting('evolution_api_token');
    if (url && token) {
      localStorage.setItem('zapp_evolution_config', JSON.stringify({
        evolution_api_url: url,
        evolution_api_key: token
      }));
    }
  }, [getSetting]);

  const toggleVisibility = (key: string) => {
    setVisibleKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChange = (key: string, value: string) => {
    setEditValues(prev => ({ ...prev, [key]: value }));
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      // Test by listing instances - simple GET call that requires authentication
      const result = await listInstances();
      if (Array.isArray(result) || (result && typeof result === 'object')) {
        const count = Array.isArray(result) ? result.length : 0;
        setTestResult({ 
          success: true, 
          message: `Conexão estabelecida com sucesso! ${count} instâncias encontradas.` 
        });
        toast.success('Teste de conexão bem sucedido!');
      } else {
        throw new Error('Resposta inválida da API');
      }
    } catch (error: any) {
      const msg = error.message || 'Falha na conexão';
      setTestResult({ success: false, message: msg });
      toast.error(`Falha no teste: ${msg}`);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSave = async (key: string) => {
    const value = editValues[key];
    if (!value || value.trim() === '') {
      toast.error('Insira um valor válido');
      return;
    }
    setSavingKey(key);
    try {
      await addSetting(key, value.trim(), INTEGRATION_KEYS.find(k => k.key === key)?.description);
      setEditValues(prev => ({ ...prev, [key]: '' }));
      toast.success('Chave salva com sucesso');
    } catch {
      toast.error('Erro ao salvar chave');
    } finally {
      setSavingKey(null);
    }
  };

  if (isLoading) {
    return (
      <Card className="border border-secondary/20 bg-card">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-secondary/20 bg-card hover:border-secondary/30 transition-all">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plug className="w-5 h-5 text-primary" />
          Chaves de Integração
        </CardTitle>
        <CardDescription>
          Gerencie as API Keys de serviços externos integrados ao sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {INTEGRATION_KEYS.map(({ key, label, description, placeholder }) => {
          const currentValue = getSetting(key);
          const isConfigured = !!currentValue && currentValue.trim() !== '';
          const editValue = editValues[key] ?? '';
          const isVisible = visibleKeys[key];
          const isSaving = savingKey === key;

          return (
            <div key={key} className="p-4 rounded-lg border border-border/30 space-y-3 hover:bg-muted/10 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">{label}</Label>
                  {isConfigured ? (
                    <Badge variant="outline" className="text-xs gap-1 text-success border-success/30">
                      <CheckCircle2 className="w-3 h-3" />
                      Configurada
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs gap-1 text-warning border-warning/30">
                      <AlertCircle className="w-3 h-3" />
                      Não configurada
                    </Badge>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{description}</p>

              {isConfigured && (
                <div className="flex items-center gap-2">
                  <Input
                    type={isVisible ? 'text' : 'password'}
                    value={currentValue}
                    readOnly
                    className="h-8 text-sm font-mono bg-muted/30"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => toggleVisibility(key)}
                  >
                    {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Input
                  type="password"
                  value={editValue}
                  onChange={e => handleChange(key, e.target.value)}
                  placeholder={isConfigured ? 'Nova chave para substituir...' : placeholder}
                  className="h-8 text-sm"
                />
                <Button
                  size="sm"
                  className="h-8 gap-1 shrink-0"
                  disabled={!editValue.trim() || isSaving}
                  onClick={() => handleSave(key)}
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          );
        <div className="pt-4 border-t border-border/30">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="text-sm font-medium">Diagnóstico de Conexão</h4>
                <p className="text-xs text-muted-foreground">Valide se a plataforma consegue se comunicar com o servidor Evolution</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={handleTestConnection}
                disabled={testingConnection || !getSetting('evolution_api_url') || !getSetting('evolution_api_token')}
              >
                {testingConnection ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                Testar Evolution
              </Button>
            </div>
            
            {testResult && (
              <div className={cn(
                "p-3 rounded-lg border text-xs flex items-start gap-2 animate-in fade-in slide-in-from-top-1",
                testResult.success 
                  ? "bg-success/10 border-success/30 text-success" 
                  : "bg-destructive/10 border-destructive/30 text-destructive"
              )}>
                {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                <div>
                  <p className="font-semibold">{testResult.success ? 'Sucesso' : 'Erro na Conexão'}</p>
                  <p className="opacity-90">{testResult.message}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
