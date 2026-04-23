/**
 * Componente headless: monta o `useFailedMessageAlerts` no shell para
 * que o agente receba toast quando uma mensagem dele cair em `abandoned`
 * mesmo sem a conversa aberta. Não renderiza nada.
 */
import { useFailedMessageAlerts } from '@/hooks/realtime/useFailedMessageAlerts';

export function FailedMessageAlertsMount(): null {
  useFailedMessageAlerts(true);
  return null;
}
