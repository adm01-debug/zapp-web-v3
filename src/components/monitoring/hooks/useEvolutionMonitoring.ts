import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ConnectionInfo {
  id: string;
  instance_id: string;
  phone_number: string | null;
  status: string;
  health_status: string | null;
  health_response_ms: number | null;
  last_health_check: string | null;
  updated_at: string;
}

export interface HealthLog {
  id: string;
  instance_id: string;
  status: string;
  response_time_ms: number | null;
  error_message: string | null;
  checked_at: string;
}

export interface MessageStats {
  incoming: number;
  outgoing: number;
  total: number;
  hourlyData: { hour: string; incoming: number; outgoing: number }[];
}

export interface WebhookTestResult {
  status: 'idle' | 'testing' | 'success' | 'error';
  message?: string;
  latencyMs?: number;
}

export interface WebhookConfig {
  url?: string;
  events?: string[];
  configured: boolean;
}

export function useEvolutionMonitoring() {
  const [connections, setConnections] = useState<ConnectionInfo[]>([]);
  const [healthLogs, setHealthLogs] = useState<HealthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [webhookTest, setWebhookTest] = useState<WebhookTestResult>({ status: 'idle' });
  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig | null>(null);
  const [messageStats, setMessageStats] = useState<MessageStats>({ incoming: 0, outgoing: 0, total: 0, hourlyData: [] });
  const [reconfiguring, setReconfiguring] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const now = new Date();
      const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);

      const [connRes, logsRes, msgRes] = await Promise.all([
        supabase.from('whatsapp_connections').select('id, instance_id, phone_number, status, health_status, health_response_ms, last_health_check, updated_at'),
        supabase.from('connection_health_logs').select('*').order('checked_at', { ascending: false }).limit(100),
        supabase.from('messages').select('sender, created_at').gte('created_at', sixHoursAgo.toISOString()).order('created_at', { ascending: true }),
      ]);

      if (connRes.data) setConnections(connRes.data);
      if (logsRes.data) setHealthLogs(logsRes.data);

      if (msgRes.data) {
        const incoming = msgRes.data.filter(m => m.sender === 'contact').length;
        const outgoing = msgRes.data.filter(m => m.sender === 'agent').length;

        // Build hourly buckets
        const buckets: Record<string, { incoming: number; outgoing: number }> = {};
        for (let i = 5; i >= 0; i--) {
          const h = new Date(now.getTime() - i * 60 * 60 * 1000);
          const key = `${h.getHours().toString().padStart(2, '0')}:00`;
          buckets[key] = { incoming: 0, outgoing: 0 };
        }

        msgRes.data.forEach(m => {
          const h = new Date(m.created_at);
          const key = `${h.getHours().toString().padStart(2, '0')}:00`;
          if (buckets[key]) {
            if (m.sender === 'contact') buckets[key].incoming++;
            else buckets[key].outgoing++;
          }
        });

        const hourlyData = Object.entries(buckets).map(([hour, data]) => ({ hour, ...data }));
        setMessageStats({ incoming, outgoing, total: msgRes.data.length, hourlyData });
      }
    } catch (err) {
      console.error('Monitoring fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Realtime subscription for connections
  useEffect(() => {
    const channel = supabase
      .channel('monitoring-connections')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_connections' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const runHealthCheck = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('connection-health-check', { method: 'POST', body: {} });
      if (error) throw error;
      toast.success(`Health check: ${data?.connections?.length || 0} conexões verificadas`);
      await fetchData();
    } catch {
      toast.error('Erro ao executar health check');
    } finally {
      setRefreshing(false);
    }
  };

  const testWebhookDelivery = async (instanceId: string) => {
    setWebhookTest({ status: 'testing' });
    const testId = `MONITOR_TEST_${Date.now()}`;
    const start = performance.now();
    try {
      const { error } = await supabase.functions.invoke('evolution-webhook', {
        method: 'POST',
        body: {
          event: 'messages.upsert',
          instance: instanceId,
          data: {
            key: { remoteJid: '5500000000000@s.whatsapp.net', fromMe: false, id: testId },
            pushName: '🔧 Monitor Test',
            messageTimestamp: Math.floor(Date.now() / 1000),
            message: { conversation: `[TESTE MONITOR] ${new Date().toLocaleString('pt-BR')}` },
          },
        },
      });
      const latency = Math.round(performance.now() - start);
      if (error) throw error;

      await new Promise(r => setTimeout(r, 1000));
      const { data: msg } = await supabase.from('messages').select('id').eq('external_id', testId).maybeSingle();
      if (msg) await supabase.from('messages').delete().eq('id', msg.id);

      setWebhookTest({
        status: msg ? 'success' : 'error',
        message: msg ? `Webhook processou e persistiu em ${latency}ms` : 'Webhook respondeu OK mas mensagem não foi persistida',
        latencyMs: latency,
      });
    } catch (err) {
      setWebhookTest({ status: 'error', message: err instanceof Error ? err.message : 'Erro desconhecido' });
    }
  };

  const checkWebhookConfig = async (instanceId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('evolution-api/get-webhook', {
        method: 'POST',
        body: { instanceName: instanceId },
      });
      if (error) throw error;
      const webhook = data?.webhook || data;
      setWebhookConfig({
        url: webhook?.url || webhook?.webhookUrl,
        events: webhook?.events || [],
        configured: !!(webhook?.url || webhook?.webhookUrl),
      });
    } catch {
      setWebhookConfig({ configured: false });
      toast.error('Erro ao verificar webhook');
    }
  };

  const reconfigureWebhook = async (instanceId: string) => {
    setReconfiguring(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const webhookUrl = `${supabaseUrl}/functions/v1/evolution-webhook`;

      const { error } = await supabase.functions.invoke('evolution-api/set-webhook', {
        method: 'POST',
        body: {
          instanceName: instanceId,
          webhook: {
            url: webhookUrl,
            webhookByEvents: false,
            webhookBase64: true,
            events: [
              'MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'MESSAGES_DELETE', 'MESSAGES_SET',
              'SEND_MESSAGE', 'CONTACTS_UPSERT', 'CONTACTS_UPDATE', 'CONTACTS_SET',
              'PRESENCE_UPDATE', 'CHATS_UPSERT', 'CHATS_UPDATE', 'CHATS_DELETE', 'CHATS_SET',
              'CONNECTION_UPDATE', 'LABELS_EDIT', 'LABELS_ASSOCIATION',
              'GROUPS_UPSERT', 'GROUP_PARTICIPANTS_UPDATE',
              'CALL', 'QRCODE_UPDATED',
            ],
          },
        },
      });
      if (error) throw error;
      toast.success('Webhook reconfigurado com sucesso!');
      await checkWebhookConfig(instanceId);
    } catch (err) {
      toast.error('Erro ao reconfigurar: ' + (err instanceof Error ? err.message : 'desconhecido'));
    } finally {
      setReconfiguring(false);
    }
  };

  return {
    connections, healthLogs, loading, refreshing, webhookTest, webhookConfig,
    messageStats, reconfiguring,
    runHealthCheck, testWebhookDelivery, checkWebhookConfig, reconfigureWebhook,
    refetch: fetchData,
  };
}
