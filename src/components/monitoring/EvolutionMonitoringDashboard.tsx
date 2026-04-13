import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Wifi, Webhook, RefreshCw, Loader2, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEvolutionMonitoring } from './hooks/useEvolutionMonitoring';
import { MonitoringStatsCards } from './MonitoringStatsCards';
import { MonitoringMessageChart } from './MonitoringMessageChart';
import { MonitoringConnectionsList } from './MonitoringConnectionsList';
import { MonitoringWebhookPanel } from './MonitoringWebhookPanel';
import { MonitoringHealthLogs } from './MonitoringHealthLogs';
import { MonitoringDiagnosticPanel } from './MonitoringDiagnosticPanel';

export function EvolutionMonitoringDashboard() {
  const {
    connections, healthLogs, loading, refreshing, webhookTest, webhookConfig,
    messageStats, reconfiguring, diagnostic, diagnosing,
    runHealthCheck, testWebhookDelivery, checkWebhookConfig, reconfigureWebhook,
    runDiagnostic,
  } = useEvolutionMonitoring();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Monitoramento Evolution API</h1>
            <p className="text-sm text-muted-foreground">Status, webhook e health checks em tempo real</p>
          </div>
        </div>
        <Button onClick={runHealthCheck} disabled={refreshing} variant="outline" size="sm">
          <RefreshCw className={cn('w-4 h-4 mr-2', refreshing && 'animate-spin')} />
          {refreshing ? 'Verificando...' : 'Health Check'}
        </Button>
      </div>

      <MonitoringStatsCards connections={connections} messageStats={messageStats} />
      <MonitoringMessageChart messageStats={messageStats} />

      <Tabs defaultValue="connections" className="space-y-4">
        <TabsList>
          <TabsTrigger value="connections"><Wifi className="w-4 h-4 mr-1.5" />Conexões</TabsTrigger>
          <TabsTrigger value="webhook"><Webhook className="w-4 h-4 mr-1.5" />Webhook</TabsTrigger>
          <TabsTrigger value="diagnostic"><Stethoscope className="w-4 h-4 mr-1.5" />Diagnóstico</TabsTrigger>
          <TabsTrigger value="health-logs"><Activity className="w-4 h-4 mr-1.5" />Health Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="connections">
          <MonitoringConnectionsList
            connections={connections}
            webhookTest={webhookTest}
            onCheckWebhook={checkWebhookConfig}
            onTestWebhook={testWebhookDelivery}
          />
        </TabsContent>

        <TabsContent value="webhook">
          <MonitoringWebhookPanel
            connections={connections}
            webhookTest={webhookTest}
            webhookConfig={webhookConfig}
            reconfiguring={reconfiguring}
            onTest={testWebhookDelivery}
            onReconfigure={reconfigureWebhook}
          />
        </TabsContent>

        <TabsContent value="diagnostic">
          <MonitoringDiagnosticPanel
            diagnostic={diagnostic}
            diagnosing={diagnosing}
            onRunDiagnostic={runDiagnostic}
          />
        </TabsContent>

        <TabsContent value="health-logs">
          <MonitoringHealthLogs healthLogs={healthLogs} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
