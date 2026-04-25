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

/**
 * Aliases canônicos públicos (nomenclatura recomendada pelo blueprint).
 * Mantemos os nomes legados (`toPhone`, `isStatus`) para retrocompatibilidade,
 * mas todo código novo deve preferir `toNumber` / `isStatusBroadcast`.
 */
export const toNumber = toPhone;
export const isStatusBroadcast = isStatus;

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

// ────────────────────────────────────────────────────────────────────────────
// Branded types & type guards (estrito — preferir em código novo)
// ────────────────────────────────────────────────────────────────────────────

declare const __jidBrand: unique symbol;
export type Phone = string & { readonly [__jidBrand]: 'Phone' };
export type Jid = string & { readonly [__jidBrand]: 'Jid' };
export type IndividualJid = Jid & { readonly [__jidBrand]: 'IndividualJid' };
export type GroupJid = Jid & { readonly [__jidBrand]: 'GroupJid' };
export type BroadcastJid = Jid & { readonly [__jidBrand]: 'BroadcastJid' };
export type NewsletterJid = Jid & { readonly [__jidBrand]: 'NewsletterJid' };

const PHONE_RE = /^\d{8,15}$/;
const INDIVIDUAL_RE = /^\d{8,15}@s\.whatsapp\.net$/;
// Grupos do WhatsApp: <participantPhone>-<creationTs> ou ID longo (>=15 dígitos).
const GROUP_LOCAL_RE = /^\d{6,}(?:-\d{6,})?$/;

/** Type guard: valor é uma string de telefone normalizada (somente dígitos, 8-15). */
export function isValidPhone(value: unknown): value is Phone {
  return typeof value === 'string' && PHONE_RE.test(value);
}

/** Type guard: JID individual canônico `<digits>@s.whatsapp.net`. */
export function isValidIndividualJid(value: unknown): value is IndividualJid {
  return typeof value === 'string' && INDIVIDUAL_RE.test(value);
}

/** Type guard: JID de grupo canônico `<id>@g.us`. */
export function isValidGroupJid(value: unknown): value is GroupJid {
  if (typeof value !== 'string' || !value.endsWith(GROUP_SUFFIX)) return false;
  const local = value.slice(0, -GROUP_SUFFIX.length);
  return GROUP_LOCAL_RE.test(local);
}

/** Type guard: qualquer @broadcast (inclui `status@broadcast`). */
export function isValidBroadcastJid(value: unknown): value is BroadcastJid {
  return typeof value === 'string' && value.endsWith(BROADCAST_SUFFIX) && value.length > BROADCAST_SUFFIX.length;
}

/** Type guard: JID de newsletter `<id>@newsletter`. */
export function isValidNewsletterJid(value: unknown): value is NewsletterJid {
  return typeof value === 'string' && value.endsWith(NEWSLETTER_SUFFIX) && value.length > NEWSLETTER_SUFFIX.length;
}

/** Type guard agregado: qualquer JID válido reconhecido pelo sistema. */
export function isValidJid(value: unknown): value is Jid {
  return (
    isValidIndividualJid(value) ||
    isValidGroupJid(value) ||
    isValidBroadcastJid(value) ||
    isValidNewsletterJid(value)
  );
}

/** Lança se o valor não for um JID válido. Útil em fronteiras de I/O. */
export function assertValidJid(value: unknown, context = 'value'): asserts value is Jid {
  if (!isValidJid(value)) {
    throw new TypeError(`Invalid JID for ${context}: ${JSON.stringify(value)}`);
  }
}

/**
 * Variante estrita de `toPhone` — retorna `null` quando o input não produz
 * um telefone válido (8-15 dígitos), em vez de string vazia. Use em fluxos
 * que devem falhar cedo (envio de mensagem, criação de contato).
 */
export function toPhoneStrict(input: string | null | undefined): Phone | null {
  const phone = toPhone(input);
  return isValidPhone(phone) ? (phone as Phone) : null;
}

/**
 * Variante estrita de `toJid` — retorna `null` se não for possível derivar
 * um JID válido (telefone curto demais, lixo, etc.). Preferir em call sites
 * que enviam payload para Evolution API.
 */
export function toJidStrict(input: string | null | undefined): Jid | null {
  if (input == null) return null;
  const raw = String(input);
  if (isValidJid(raw)) return raw;
  const phone = toPhoneStrict(raw);
  if (!phone) return null;
  const candidate = `${phone}${INDIVIDUAL_SUFFIX}`;
  return isValidIndividualJid(candidate) ? (candidate as IndividualJid) : null;
}
