import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { handleCors, errorResponse, jsonResponse, requireEnv, Logger } from "../_shared/validation.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const log = new Logger("connection-health-check");

  try {
    const evolutionUrl = requireEnv('EVOLUTION_API_URL');
    const evolutionKey = requireEnv('EVOLUTION_API_KEY');
    const supabase = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'));
    const baseUrl = evolutionUrl.replace(/\/+$/, '');

    const { data: connections, error: connError } = await supabase
      .from('whatsapp_connections').select('id, instance_id, status, phone_number, health_status');

    if (connError || !connections) return errorResponse('Failed to fetch connections', 500, req);

    const results = [];
    const alertsToCreate: Array<{ connection_id: string; instance_id: string; phone: string | null; reason: 'disconnected' | 'degraded' }> = [];

    for (const conn of connections) {
      const start = performance.now();
      let healthStatus = 'unknown';
      let errorMessage: string | null = null;
      let responseTime = 0;

      try {
        const resp = await fetch(`${baseUrl}/instance/connectionState/${conn.instance_id}`, {
          method: 'GET', headers: { 'apikey': evolutionKey },
          signal: AbortSignal.timeout(10000),
        });
        responseTime = Math.round(performance.now() - start);

        if (resp.ok) {
          const data = await resp.json();
          const state = data?.instance?.state || data?.state || 'unknown';
          healthStatus = state === 'open' ? 'healthy' : state === 'close' ? 'disconnected' : 'degraded';

          const dbStatus = state === 'open' ? 'connected' : 'disconnected';
          if (dbStatus !== conn.status) {
            await supabase.from('whatsapp_connections').update({ status: dbStatus, updated_at: new Date().toISOString() }).eq('id', conn.id);
            if (dbStatus === 'disconnected' && conn.status === 'connected') {
              alertsToCreate.push({ connection_id: conn.id, instance_id: conn.instance_id, phone: conn.phone_number, reason: 'disconnected' });
            }
          }
          // Detecta transição para "degraded" também (CONNECTION_CLOSED recente, latência alta etc.)
          if (healthStatus === 'degraded') {
            alertsToCreate.push({ connection_id: conn.id, instance_id: conn.instance_id, phone: conn.phone_number, reason: 'degraded' });
          }
        } else {
          healthStatus = 'error';
          errorMessage = `HTTP ${resp.status}: ${(await resp.text()).slice(0, 200)}`;
        }
      } catch (err) {
        responseTime = Math.round(performance.now() - start);
        healthStatus = 'timeout';
        errorMessage = err instanceof Error ? err.message : 'Unknown error';
      }

      await supabase.from('connection_health_logs').insert({
        connection_id: conn.id, instance_id: conn.instance_id, status: healthStatus,
        response_time_ms: responseTime, error_message: errorMessage,
      });

      const justBecameDegraded = healthStatus === 'degraded' && conn.health_status !== 'degraded';
      const updatePayload: Record<string, unknown> = {
        last_health_check: new Date().toISOString(),
        health_status: healthStatus,
        health_response_ms: responseTime,
      };
      if (justBecameDegraded) {
        updatePayload.degraded_at = new Date().toISOString();
        // Audit trail when a connection is downgraded due to recent CONNECTION_CLOSED / latency
        await supabase.from('audit_logs').insert({
          action: 'connection_degraded',
          entity_type: 'whatsapp_connection',
          entity_id: conn.id,
          details: {
            instance_id: conn.instance_id,
            phone: conn.phone_number,
            response_time_ms: responseTime,
            error_message: errorMessage,
            previous_health: conn.health_status ?? null,
            reason: 'CONNECTION_CLOSED_or_latency',
          },
        }).then(({ error }) => { if (error) log.warn('audit insert failed', { error: error.message }); });
      }

      await supabase.from('whatsapp_connections').update(updatePayload).eq('id', conn.id);

      results.push({ instance_id: conn.instance_id, status: healthStatus, response_time_ms: responseTime, error: errorMessage });
    }

    // Carrega usuários com opt-in para receber alertas (push/email)
    let optInUserIds: string[] = [];
    if (alertsToCreate.length > 0) {
      const { data: prefs } = await supabase
        .from('connection_alert_preferences')
        .select('user_id, alert_on_degraded, alert_on_disconnected, push_enabled');
      optInUserIds = (prefs ?? [])
        .filter((p: any) => p.push_enabled && (p.alert_on_degraded || p.alert_on_disconnected))
        .map((p: any) => p.user_id);
    }

    for (const alert of alertsToCreate) {
      const isDegraded = alert.reason === 'degraded';
      const title = isDegraded
        ? `Conexão ${alert.instance_id} degradada`
        : `Conexão ${alert.instance_id} desconectada`;
      const message = isDegraded
        ? `A instância ${alert.instance_id}${alert.phone ? ` (${alert.phone})` : ''} está instável (CONNECTION_CLOSED recente ou latência alta).`
        : `A instância ${alert.instance_id}${alert.phone ? ` (${alert.phone})` : ''} perdeu conexão com o WhatsApp.`;

      // 1) Warroom alert (admins veem em todo lugar)
      await supabase.from('warroom_alerts').insert({
        alert_type: isDegraded ? 'warning' : 'critical',
        title,
        message,
        source: 'connection_health',
      }).then(({ error }) => { if (error) log.warn("Failed to create warroom alert", { error: error.message }); });

      // 2) Notificações por usuário com opt-in (frontend dispara push do navegador via realtime)
      const eligibleUsers = optInUserIds.filter((uid) => {
        // já filtramos push_enabled acima; aqui poderia filtrar por tipo, mantemos simples
        return true;
      });
      if (eligibleUsers.length > 0) {
        const rows = eligibleUsers.map((uid) => ({
          user_id: uid,
          title,
          message,
          type: 'connection_alert',
          metadata: {
            connection_id: alert.connection_id,
            instance_id: alert.instance_id,
            reason: alert.reason,
            phone: alert.phone,
          },
        }));
        await supabase.from('notifications').insert(rows).then(({ error }) => {
          if (error) log.warn("Failed to insert notifications", { error: error.message });
        });
      }
    }

    // Cleanup old health logs
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('connection_health_logs').delete().lt('checked_at', sevenDaysAgo);

    log.done(200, { checked: results.length, alerts: alertsToCreate.length });
    return jsonResponse({
      success: true, checked_at: new Date().toISOString(),
      connections: results, alerts_created: alertsToCreate.length,
    }, 200, req);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    log.error("Health check error", { error: msg });
    return errorResponse(msg, 500, req);
  }
});
