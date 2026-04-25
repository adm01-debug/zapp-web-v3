/**
 * inboxDedupeKeys — Builder canônico das chaves de dedupe usadas pelo Inbox.
 *
 * Por que existe
 * --------------
 * Antes, cada call site montava sua chave inline:
 *
 *   `inbox:initial:${jid}:${pageSize}`
 *   `inbox:poll:${jid}:${afterDate}`        ← afterDate cru: ISO string com ou sem `Z`, com ou sem `.000`, com `+00:00`…
 *   `older:${jid}:${oldest}:${pageSize}`
 *
 * Problemas observados:
 *   1. **Heterogeneidade do cursor**: `afterDate`/`oldest` vinham direto do
 *      banco como ISO string. O Postgres pode serializar o mesmo instante
 *      como `2026-04-25T22:00:00+00:00`, `2026-04-25T22:00:00.000Z` ou
 *      `2026-04-25T22:00:00Z` dependendo do driver/versão. Cada formato
 *      gerava uma chave diferente para o MESMO ponto no tempo → cache miss
 *      falso e múltiplas abas refazendo o mesmo fetch.
 *   2. **Colisão por separador**: `${jid}:${pageSize}` mistura segmentos
 *      heterogêneos. Se um dia um JID legítimo tiver `:` (já acontece no
 *      WhatsApp Web — `*@broadcast`), os segmentos colidem.
 *   3. **Falta de versionamento**: ao mudar o shape do payload (ex.: novos
 *      campos no `EvolutionMessage`), abas com cache antigo no localStorage
 *      entregavam dados incompatíveis sem nenhum sinal.
 *
 * Solução
 * -------
 *   - Cursor SEMPRE normalizado para epoch ms (`Date.parse → number`).
 *   - Segmentos escapados (encodeURIComponent) e separados por `:`.
 *   - Prefixo de schema versionado (`v2`) — se o shape mudar, basta bumpar.
 *   - Builder único e tipado: impossível esquecer um campo ou trocar a ordem.
 *
 * Formato resultante
 * ------------------
 *   inbox:v2:initial:<jid>:<pageSize>
 *   inbox:v2:poll:<jid>:<afterMs>
 *   inbox:v2:older:<jid>:<beforeMs>:<pageSize>
 *
 * `<jid>` é encodeURIComponent-escapado para tolerar qualquer caractere.
 * `<afterMs>` / `<beforeMs>` são inteiros (epoch ms) — duas representações
 * ISO equivalentes mapeiam para o MESMO número.
 */

const SCHEMA_VERSION = 'v2';
const NAMESPACE = 'inbox';

/**
 * Normaliza qualquer cursor temporal para epoch ms (string de inteiro).
 *
 * Aceita:
 *   - ISO 8601 com qualquer variação de TZ/precisão
 *   - epoch ms numérico (já normalizado — passa direto)
 *   - `Date` instance
 *
 * Garantias:
 *   - `"2026-04-25T22:00:00+00:00"` → `"1777291200000"`
 *   - `"2026-04-25T22:00:00.000Z"` → `"1777291200000"` (mesmo valor)
 *   - input inválido → string `"invalid"` (não lança — chave fica estável e
 *     trivialmente identificável em logs).
 */
export function normalizeCursorMs(cursor: string | number | Date | null | undefined): string {
  if (cursor === null || cursor === undefined || cursor === '') return 'none';
  if (cursor instanceof Date) {
    const t = cursor.getTime();
    return Number.isFinite(t) ? String(t) : 'invalid';
  }
  if (typeof cursor === 'number') {
    return Number.isFinite(cursor) ? String(Math.trunc(cursor)) : 'invalid';
  }
  // string: pode ser ISO ou já um epoch numérico em string.
  const trimmed = cursor.trim();
  if (/^-?\d+$/.test(trimmed)) {
    const n = Number(trimmed);
    return Number.isFinite(n) ? String(n) : 'invalid';
  }
  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? String(parsed) : 'invalid';
}

/** Escapa um segmento para que `:` ou caracteres exóticos no JID não colidam. */
function seg(value: string | number): string {
  return encodeURIComponent(String(value));
}

export interface InitialKeyInput {
  jid: string;
  pageSize: number;
}

export interface PollKeyInput {
  jid: string;
  afterDate: string | number | Date | null;
}

export interface OlderKeyInput {
  jid: string;
  beforeDate: string | number | Date | null;
  pageSize: number;
}

/** `inbox:v2:initial:<jid>:<pageSize>` */
export function inboxInitialKey({ jid, pageSize }: InitialKeyInput): string {
  return `${NAMESPACE}:${SCHEMA_VERSION}:initial:${seg(jid)}:${seg(pageSize)}`;
}

/** `inbox:v2:poll:<jid>:<afterMs>` — afterDate normalizado para epoch ms. */
export function inboxPollKey({ jid, afterDate }: PollKeyInput): string {
  return `${NAMESPACE}:${SCHEMA_VERSION}:poll:${seg(jid)}:${normalizeCursorMs(afterDate)}`;
}

/** `inbox:v2:older:<jid>:<beforeMs>:<pageSize>` — beforeDate normalizado. */
export function inboxOlderKey({ jid, beforeDate, pageSize }: OlderKeyInput): string {
  return `${NAMESPACE}:${SCHEMA_VERSION}:older:${seg(jid)}:${normalizeCursorMs(beforeDate)}:${seg(pageSize)}`;
}

/**
 * Sidebar é independente de cursor (janela fixa de N dias). Mantemos aqui
 * para que TODAS as chaves do inbox passem pelo mesmo módulo.
 */
export function inboxSidebarKey(daysBack: number, limit: number): string {
  return `${NAMESPACE}:${SCHEMA_VERSION}:sidebar:${seg(daysBack)}:${seg(limit)}`;
}

/**
 * Prefixo usado por subscribers cross-tab para combinar TODAS as chaves
 * de um JID (initial/poll/older) sob a mesma regex.
 */
export function inboxJidKeyPrefixes(jid: string): readonly string[] {
  const j = seg(jid);
  return [
    `${NAMESPACE}:${SCHEMA_VERSION}:initial:${j}:`,
    `${NAMESPACE}:${SCHEMA_VERSION}:poll:${j}:`,
    `${NAMESPACE}:${SCHEMA_VERSION}:older:${j}:`,
  ] as const;
}

/** Versão atual do schema — exposto para diagnósticos e testes. */
export const INBOX_DEDUPE_SCHEMA_VERSION = SCHEMA_VERSION;
