/**
 * alert-email-notify — Notificação de alertas críticos via email (E063).
 *
 * Canal independente de wpp2: envia email para ti@promobrindes.com.br
 * quando há alertas críticos/altos não resolvidos no zapp.evolution_alerts.
 *
 * Chamado por: zapp.fn_dispatch_critical_alert_emails() via pg_net (cron 5min).
 * Auth: service_role JWT (requireServiceRoleOrCron).
 * Email: Resend API (RESEND_API_KEY — mesmo secret das funções transacionais).
 *
 * Payload de entrada:
 *   { alerts: [{id, alert_type, severity, title, message, created_at}], recipient?: string }
 *
 * Resposta:
 *   { ok: true, dispatched: number, message_id: string }
 *   { ok: false, error: string }
 */
import { requireServiceRoleOrCron } from "../_shared/auth.ts";
import { handleCors, jsonResponse, errorEnvelope } from "../_shared/validation.ts";
import { Logger } from "../_shared/validation.ts";
import {
  sendTransactionalEmail,
  renderTransactionalEmailHtml,
  escapeHtml,
} from "../_shared/resend.ts";

const DEFAULT_RECIPIENT = "ti@promobrindes.com.br";

interface AlertItem {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  created_at: string;
}

function severityLabel(severity: string): string {
  switch (severity) {
    case "critical": return "🔴 CRÍTICO";
    case "high":     return "🟠 ALTO";
    case "medium":   return "🟡 MÉDIO";
    default:         return "🔵 INFO";
  }
}

function buildAlertRows(alerts: AlertItem[]): string {
  return alerts.map((a) => {
    const ts = new Date(a.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    return `
      <tr style="border-bottom:1px solid #f4f4f5;">
        <td style="padding:10px 0;font-size:13px;color:#18181b;vertical-align:top;">
          <strong>${escapeHtml(severityLabel(a.severity))}</strong><br>
          <span style="font-weight:600;">${escapeHtml(a.title)}</span><br>
          <span style="color:#71717a;font-size:12px;">${escapeHtml(a.alert_type)} &bull; ${escapeHtml(ts)}</span><br>
          <span style="color:#3f3f46;">${escapeHtml(a.message)}</span>
        </td>
      </tr>`;
  }).join("");
}

function buildEmailHtml(alerts: AlertItem[]): string {
  const critCount = alerts.filter(a => a.severity === "critical").length;
  const highCount = alerts.filter(a => a.severity === "high").length;
  const summary = [
    critCount > 0 ? `${critCount} crítico(s)` : "",
    highCount > 0 ? `${highCount} alto(s)` : "",
  ].filter(Boolean).join(", ");

  const bodyHtml = `
    <p style="margin:0 0 16px;">Há <strong>${alerts.length} alerta(s) ativos</strong> no sistema ZAPP que requerem atenção (${summary}):</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e4e4e7;">
      <tbody>
        ${buildAlertRows(alerts)}
      </tbody>
    </table>
    <p style="margin:20px 0 0;font-size:13px;color:#71717a;">
      Acesse <a href="https://zapp.atomicabr.com.br" style="color:#18181b;">zapp.atomicabr.com.br</a> para mais detalhes e para resolver os alertas.
    </p>`;

  return renderTransactionalEmailHtml({
    title: `⚠️ ${alerts.length} Alerta(s) ZAPP — Ação Necessária`,
    bodyHtml,
    footerText: "Este email foi enviado automaticamente pelo sistema ZAPP (canal independente de wpp2).",
  });
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const denied = requireServiceRoleOrCron(req);
  if (denied) return denied;

  const log = new Logger("alert-email-notify");

  try {
    let body: { alerts?: AlertItem[]; recipient?: string };
    try {
      body = await req.json();
    } catch {
      return errorEnvelope("invalid_json", "Body JSON inválido", 400, req);
    }

    const alerts: AlertItem[] = Array.isArray(body?.alerts) ? body.alerts : [];
    if (alerts.length === 0) {
      return jsonResponse({ ok: true, dispatched: 0, message: "Nenhum alerta para notificar" }, 200, req);
    }

    const recipient = typeof body?.recipient === "string" && body.recipient.includes("@")
      ? body.recipient
      : DEFAULT_RECIPIENT;

    const subject = alerts.length === 1
      ? `⚠️ Alerta ZAPP: ${alerts[0].title}`
      : `⚠️ ${alerts.length} Alertas ZAPP — Ação Necessária`;

    const html = buildEmailHtml(alerts);
    const result = await sendTransactionalEmail(recipient, subject, html);

    if (!result.ok) {
      log.error("Falha ao enviar email de alerta", { error: result.error, status: result.status });
      return errorEnvelope("email_failed", result.error, 502, req);
    }

    log.info(`E063: ${alerts.length} alerta(s) notificados para ${recipient}`, { message_id: result.messageId });
    log.done(200);
    return jsonResponse({ ok: true, dispatched: alerts.length, message_id: result.messageId }, 200, req);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    log.error("Erro interno", { error: msg });
    return errorEnvelope("internal_error", "Internal server error", 500, req);
  }
});
