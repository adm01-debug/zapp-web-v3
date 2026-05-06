import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link2, Plug, Database } from 'lucide-react';
import { ConnectionsView } from '@/components/connections/ConnectionsView';
import { IntegrationsHub } from '@/components/integrations/IntegrationsHub';
import { BridgeSupabaseView } from '@/components/connections/BridgeSupabaseView';

/**
 * Hub unificado de Conexões + Integrações.
 * Substitui as duas entradas separadas no sidebar por uma única view com abas.
 */
export function ConnectionsIntegrationsHub() {
  const [tab, setTab] = useState<'connections' | 'integrations' | 'bridge'>('connections');

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-2 border-b border-border/40">
        <h1 className="font-display text-2xl font-bold text-foreground mb-1">
          Conexões & Integrações
        </h1>
        <p className="text-muted-foreground text-sm mb-4">
          Gerencie canais de WhatsApp, integrações externas e a ponte Supabase ↔ Evolution API.
        </p>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="w-full">
          <TabsList>
            <TabsTrigger value="connections" className="gap-2">
              <Link2 className="w-4 h-4" />
              Conexões
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2">
              <Plug className="w-4 h-4" />
              Integrações
            </TabsTrigger>
            <TabsTrigger value="bridge" className="gap-2">
              <Database className="w-4 h-4" />
              Ponte Supabase
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-auto">
        {tab === 'connections' && <ConnectionsView />}
        {tab === 'integrations' && <IntegrationsHub />}
        {tab === 'bridge' && <BridgeSupabaseView />}
      </div>
    </div>
  );
}
