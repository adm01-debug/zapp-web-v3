/**
 * Registro central das instâncias Evolution API / partições de
 * `evolution_messages` e `evolution_conversations` no FATOR X.
 *
 * Fonte: docs/architecture/JORNADA_MENSAGEM_WHATSAPP.md (Estágio 3C).
 * Mantido em UM único lugar para evitar strings mágicas espalhadas e para
 * que validações de input no frontend rejeitem instâncias inexistentes
 * antes de bater no Realtime / RPC.
 *
 * IMPORTANTE: ao adicionar/remover uma partição no FATOR X, atualizar
 * esta lista E o trigger `pubviaroot` continua cobrindo automaticamente
 * todas as filhas — o frontend só precisa conhecer os nomes válidos.
 */

export const WHATSAPP_INSTANCES = [
  // Produção principal
  'wpp2',
  // Testes
  'wpp_pink_test',
  // Setores
  'compras',
  'diretoria',
  'financeiro',
  'logistica',
  'marketing',
  'sac',
  // Vendedores individuais
  'vendedor_01',
  'vendedor_02',
  'vendedor_03',
  'vendedor_04',
  'vendedor_05',
  'vendedor_06',
  'vendedor_07',
  // Fallback (não seleciável pelo usuário, partição default)
  'default',
] as const;

export type WhatsAppInstance = (typeof WHATSAPP_INSTANCES)[number];

/** Instância default usada em todo o app quando nenhuma é especificada. */
export const DEFAULT_WHATSAPP_INSTANCE: WhatsAppInstance = 'wpp2';

/** Instâncias selecionáveis pela UI (exclui `default`, que é fallback do PG). */
export const SELECTABLE_WHATSAPP_INSTANCES = WHATSAPP_INSTANCES.filter(
  (i) => i !== 'default',
) as readonly WhatsAppInstance[];

export function isValidWhatsAppInstance(value: unknown): value is WhatsAppInstance {
  return typeof value === 'string' && (WHATSAPP_INSTANCES as readonly string[]).includes(value);
}

/**
 * Retorna a instância validada ou cai para `DEFAULT_WHATSAPP_INSTANCE`.
 * Use em pontos de entrada (querystring, localStorage, props externas).
 */
export function coerceWhatsAppInstance(value: unknown): WhatsAppInstance {
  return isValidWhatsAppInstance(value) ? value : DEFAULT_WHATSAPP_INSTANCE;
}
