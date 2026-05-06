import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUserRole } from '@/features/auth';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link2, Plug, Database } from 'lucide-react';
import { ConnectionsView } from '@/components/connections/ConnectionsView';
import { IntegrationsHub } from '@/components/integrations/IntegrationsHub';
import { BridgeSupabaseView } from '@/components/connections/BridgeSupabaseView';

type HubTab = 'connections' | 'integrations' | 'bridge';

/**
 * Hub unificado de Conexões + Integrações.
 * Substitui as duas entradas separadas no sidebar por uma única view com abas.
 */
export function ConnectionsIntegrationsHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isDev } = useUserRole();
  
  // Inicializa a aba baseada no query param 'tab' se existir
  const [tab, setTab] = useState<HubTab>(() => {
    const t = searchParams.get('tab') as HubTab;
    if (t === 'bridge' && !isDev) return 'connections';
    if (['connections', 'integrations', 'bridge'].includes(t)) return t;
    return 'connections';
  });

  // Sincroniza query param ao mudar aba
  useEffect(() => {
    const current = searchParams.get('tab');
    if (current !== tab) {
      setSearchParams(prev => {
        prev.set('tab', tab);
        return prev;
      }, { replace: true });
    }
  }, [tab, searchParams, setSearchParams]);

  // Sincroniza aba se query param mudar externamente
  useEffect(() => {
    const t = searchParams.get('tab') as HubTab;
    if (t && t !== tab && ['connections', 'integrations', 'bridge'].includes(t)) {
      if (t === 'bridge' && !isDev) return;
      setTab(t);
    }
  }, [searchParams, tab, isDev]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-2 border-b border-border/40">
        <h1 className="font-display text-2xl font-bold text-foreground mb-1">
          Conexões & Integrações
        </h1>
        <p className="text-muted-foreground text-sm mb-4">
          Gerencie canais de WhatsApp, integrações externas e a ponte Supabase ↔ Evolution API.
        </p>

        <Tabs value={tab} onValueChange={(v) => setTab(v as HubTab)} className="w-full">
          <TabsList>
            <TabsTrigger value="connections" className="gap-2">
              <Link2 className="w-4 h-4" />
              Conexões
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2">
              <Plug className="w-4 h-4" />
              Integrações
            </TabsTrigger>
            {isDev && (
              <TabsTrigger value="bridge" className="gap-2">
                <Database className="w-4 h-4" />
                Ponte Supabase
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-auto">
        {tab === 'connections' && <ConnectionsView />}
        {tab === 'integrations' && <IntegrationsHub />}
        {tab === 'bridge' && isDev && <BridgeSupabaseView />}
      </div>
    </div>
  );
}
