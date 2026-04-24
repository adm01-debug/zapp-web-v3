/**
 * Canonical JID helpers — Evolution API v2 / WhatsApp.
 *
 * Centraliza todas as transformações entre número de telefone e JID
 * (`<id>@s.whatsapp.net`, `<id>@g.us`, `status@broadcast`, etc.) para que
 * cada feature pare de reimplementar a mesma regex/concatenação. Use estes
 * helpers em qualquer ponto que monte payload para Evolution ou interprete
 * webhooks.
 *
 * Convenções:
 * - `toPhone` — remove sufixos e mantém apenas dígitos.
 * - `toIndividualJid` — força `@s.whatsapp.net` (1:1).
 * - `toGroupJid` — preserva `@g.us` se já vier; caso contrário acrescenta.
 * - `isGroup` / `isBroadcast` / `isStatus` — detectores baratos para filtros
 *   de inbox (cf. broadcast-defense memo).
 */

const INDIVIDUAL_SUFFIX = '@s.whatsapp.net';
const GROUP_SUFFIX = '@g.us';
const BROADCAST_SUFFIX = '@broadcast';
const STATUS_JID = 'status@broadcast';
const NEWSLETTER_SUFFIX = '@newsletter';

/** Normaliza para apenas dígitos. Aceita JID, telefone, ou string com formatação. */
export function toPhone(input: string | null | undefined): string {
  if (!input) return '';
  const stripped = String(input).split('@')[0] ?? '';
  return stripped.replace(/\D/g, '');
}

/** Garante o JID individual canônico `<digits>@s.whatsapp.net`. */
export function toIndividualJid(input: string | null | undefined): string {
  const phone = toPhone(input);
  if (!phone) return '';
  return `${phone}${INDIVIDUAL_SUFFIX}`;
}

/** Garante JID de grupo. Se input já contiver `@g.us` mantém; senão concatena. */
export function toGroupJid(input: string | null | undefined): string {
  if (!input) return '';
  const raw = String(input);
  if (raw.endsWith(GROUP_SUFFIX)) return raw;
  const stripped = raw.split('@')[0] ?? '';
  return stripped ? `${stripped}${GROUP_SUFFIX}` : '';
}

/**
 * Resolução genérica: se o input já trouxer um sufixo conhecido, mantém;
 * caso contrário assume conversa individual. Útil para chamadas onde o
 * caller pode passar tanto telefone quanto JID.
 */
export function toJid(input: string | null | undefined): string {
  if (!input) return '';
  const raw = String(input);
  if (
    raw.endsWith(INDIVIDUAL_SUFFIX) ||
    raw.endsWith(GROUP_SUFFIX) ||
    raw.endsWith(BROADCAST_SUFFIX) ||
    raw.endsWith(NEWSLETTER_SUFFIX)
  ) {
    return raw;
  }
  return toIndividualJid(raw);
}

export function isGroup(jid: string | null | undefined): boolean {
  return !!jid && jid.endsWith(GROUP_SUFFIX);
}

export function isBroadcast(jid: string | null | undefined): boolean {
  return !!jid && jid.endsWith(BROADCAST_SUFFIX);
}

export function isStatus(jid: string | null | undefined): boolean {
  return jid === STATUS_JID;
}

export function isIndividual(jid: string | null | undefined): boolean {
  return !!jid && jid.endsWith(INDIVIDUAL_SUFFIX);
}

export function isNewsletter(jid: string | null | undefined): boolean {
  return !!jid && jid.endsWith(NEWSLETTER_SUFFIX);
}

/** Aplica o padrão DDI 55 (Brasil) quando o número vier sem código de país. */
export function ensureBrazilDDI(phone: string): string {
  const digits = toPhone(phone);
  if (!digits) return '';
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  return `55${digits}`;
}

export const JID_SUFFIXES = {
  individual: INDIVIDUAL_SUFFIX,
  group: GROUP_SUFFIX,
  broadcast: BROADCAST_SUFFIX,
  newsletter: NEWSLETTER_SUFFIX,
  status: STATUS_JID,
} as const;
