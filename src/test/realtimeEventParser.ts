/**
 * Parser estrito de eventos realtime usado pelos validadores do diagrama
 * TRILHA_MENSAGENS_NAVEGAVEL e dos hooks de postgres_changes.
 *
 * Diferente das versoes "tolerantes" em realtimeFanoutEvents.test.ts, este
 * parser COLETA erros explicitos para facilitar debug quando alguem digita
 * algo invalido como `event: "* *"`, `event: "INSERT|UPDATE"` ou caracteres
 * inesperados. Os erros sao strings prontas para serem mostradas no console
 * ou anexadas em mensagens de teste.
 */

export type Evt = 'INSERT' | 'UPDATE' | 'DELETE';
export const ALL_EVENTS: Evt[] = ['INSERT', 'UPDATE', 'DELETE'];

export interface ParseResult {
  events: Set<Evt>;
  errors: string[];
}

const VALID_TOKEN = /^(\*|INSERT|UPDATE|DELETE)$/;

/**
 * Valida o valor cru de `event:` em um bloco de hook.
 * Aceita apenas: '*', 'INSERT', 'UPDATE', 'DELETE'.
 *
 * Mensagens de erro cobrem:
 *   - string vazia
 *   - whitespace interno (ex: '* *', ' INSERT')
 *   - separadores invalidos (ex: 'INSERT|UPDATE', 'INSERT,UPDATE')
 *   - caracteres fora do alfabeto permitido (ex: 'insert', 'INSERT?')
 *   - tokens desconhecidos (ex: 'TRUNCATE', 'SELECT')
 */
export function parseHookEvent(rawValue: string): ParseResult {
  const events = new Set<Evt>();
  const errors: string[] = [];

  if (rawValue === '') {
    errors.push("event invalido: string vazia. Esperado '*', 'INSERT', 'UPDATE' ou 'DELETE'.");
    return { events, errors };
  }
  if (rawValue !== rawValue.trim()) {
    errors.push(`event invalido: "${rawValue}" contem whitespace nas bordas. Use exatamente um de '*'|'INSERT'|'UPDATE'|'DELETE'.`);
  }
  const trimmed = rawValue.trim();
  if (/\s/.test(trimmed)) {
    errors.push(`event invalido: "${rawValue}" contem whitespace interno (ex: '* *' nao e suportado pelo supabase-js). Use um unico token.`);
    return { events, errors };
  }
  if (/[|,;/+&]/.test(trimmed)) {
    errors.push(`event invalido: "${rawValue}" usa separador nao suportado. Para multiplos eventos, registre .on(...) uma vez por evento ou use '*'.`);
    return { events, errors };
  }
  if (!/^[A-Z*]+$/.test(trimmed)) {
    errors.push(`event invalido: "${rawValue}" contem caracteres inesperados. So sao aceitos A-Z e '*'.`);
    return { events, errors };
  }
  if (!VALID_TOKEN.test(trimmed)) {
    errors.push(`event invalido: "${rawValue}" nao e reconhecido. Esperado '*', 'INSERT', 'UPDATE' ou 'DELETE'.`);
    return { events, errors };
  }
  if (trimmed === '*') ALL_EVENTS.forEach((e) => events.add(e));
  else events.add(trimmed as Evt);
  return { events, errors };
}

/**
 * Valida um rotulo de aresta do diagrama Mermaid (texto entre `|...|`).
 * Diferente de parseHookEvent, rotulos podem conter texto descritivo
 * adicional (ex: "UPDATE status"), entao a validacao foca em sinalizar
 * combinacoes ambiguas e tokens proibidos.
 */
export function parseEdgeLabel(label: string): ParseResult {
  const events = new Set<Evt>();
  const errors: string[] = [];

  if (label.trim() === '') {
    errors.push('rotulo de aresta vazio: declare ao menos um evento (INSERT, UPDATE, DELETE ou *).');
    return { events, errors };
  }
  if (/[|;]/.test(label)) {
    errors.push(`rotulo "${label}" contem separador proibido (| ou ;) — use espaco ou /.`);
  }
  if (/\b(SELECT|TRUNCATE|MERGE)\b/.test(label)) {
    errors.push(`rotulo "${label}" referencia evento nao suportado por postgres_changes (SELECT/TRUNCATE/MERGE).`);
  }
  if (/\*/.test(label)) ALL_EVENTS.forEach((e) => events.add(e));
  for (const e of ALL_EVENTS) if (new RegExp(`\\b${e}\\b`).test(label)) events.add(e);
  if (events.size === 0 && errors.length === 0) {
    errors.push(`rotulo "${label}" nao contem nenhum evento reconhecivel (INSERT, UPDATE, DELETE ou *).`);
  }
  return { events, errors };
}
