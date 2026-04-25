/**
 * Componente headless: monta os hooks globais de alerta de falha de envio
 * no shell para que o agente receba toasts mesmo sem a conversa aberta.
 *
 *  - `useFailedMessageAlerts`: dispara quando a DLQ marca uma mensagem como
 *    `abandoned` (caminho do reprocessador assíncrono).
 *  - `useTerminalSendFailureAlerts`: dispara quando uma mensagem outbound
 *    atinge `failed_retries` / `failed_auth` / `failed` — esgotamento das
 *    retentativas no caminho síncrono. Inclui ação "Abrir conversa".
 *
 * Não renderiza nada.
 */
import { useFailedMessageAlerts } from '@/hooks/realtime/useFailedMessageAlerts';
import { useTerminalSendFailureAlerts } from '@/hooks/realtime/useTerminalSendFailureAlerts';

export function FailedMessageAlertsMount(): null {
  useFailedMessageAlerts(true);
  useTerminalSendFailureAlerts(true);
  return null;
}
