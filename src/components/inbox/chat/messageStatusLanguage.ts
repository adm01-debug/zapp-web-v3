/**
 * Linguagem unificada de status de mensagens (inbound + outbound).
 *
 * Convenção:
 *  - "sent"      → Enviada       (✓)         — saiu do dispositivo / entrou no servidor
 *  - "delivered" → Entregue      (✓✓ cinza) — chegou ao destinatário
 *  - "read"      → Visualizada   (✓✓ azul)  — destinatário abriu a conversa
 *  - "played"    → Reproduzida   (🎧 azul)  — áudio/vídeo executado
 *
 * Para mensagens INBOUND:
 *  - "sent"      = quando o contato enviou (timestamp da mensagem)
 *  - "delivered" = quando entrou no nosso servidor (created_at)
 *  - "read"/"Visualizada" = quando o agente leu (contact_read_at)
 *
 * Esta unificação substitui termos divergentes anteriores:
 *  - "Lido" / "Lida" / "Lida por você" / "Recebida"
 */

export type StatusLevel = 'pending' | 'sending' | 'retrying' | 'sent' | 'delivered' | 'read' | 'played' | 'failed' | 'failed_auth' | 'failed_retries';

export const STATUS_LABEL_UNIFIED: Record<StatusLevel, string> = {
  pending: 'Enviando…',
  sending: 'Enviando…',
  retrying: 'Tentando reenviar…',
  sent: 'Enviada',
  delivered: 'Entregue',
  read: 'Visualizada',
  played: 'Reproduzida',
  failed: 'Falha no envio',
  failed_auth: 'Falha de autenticação',
  failed_retries: 'Falhou após várias tentativas',
};

/** Rótulo curto usado em chips de timeline / timestamps inline. */
export const STAGE_LABEL_UNIFIED = {
  sent: 'Enviada',
  delivered: 'Entregue',
  read: 'Visualizada',
} as const;

/** Inicial usada como prefixo em chips compactos (E · E · V). */
export const STAGE_INITIAL_UNIFIED = {
  sent: 'E',
  delivered: 'E',
  read: 'V',
} as const;

/**
 * Tooltip detalhado por estado terminal — usado tanto no inline
 * quanto no painel popover, garantindo a mesma frase em ambos.
 */
export function describeStatus(level: StatusLevel, direction: 'inbound' | 'outbound'): string {
  switch (level) {
    case 'sent':
      return direction === 'outbound'
        ? 'Enviada — saiu do dispositivo'
        : 'Enviada pelo contato';
    case 'delivered':
      return direction === 'outbound'
        ? 'Entregue ao destinatário'
        : 'Entregue ao seu inbox';
    case 'read':
      return direction === 'outbound'
        ? 'Visualizada pelo destinatário'
        : 'Visualizada por você';
    case 'played':
      return direction === 'outbound'
        ? 'Reproduzida pelo destinatário'
        : 'Reproduzida por você';
    default:
      return STATUS_LABEL_UNIFIED[level] ?? '';
  }
}
