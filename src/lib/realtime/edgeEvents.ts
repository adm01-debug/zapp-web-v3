/**
 * Utilitários de parsing de eventos realtime usados pelos testes do diagrama
 * TRILHA_MENSAGENS_NAVEGAVEL e por consumidores de postgres_changes.
 *
 * Mantido em src/lib (não em src/test) para evitar acoplamento entre suites
 * de teste — qualquer teste pode importar daqui sem puxar um arquivo .test.ts.
 */

export type Evt = 'INSERT' | 'UPDATE' | 'DELETE';
export const ALL_EVENTS: Evt[] = ['INSERT', 'UPDATE', 'DELETE'];

/**
 * Extrai eventos realtime declarados em um rótulo de aresta Mermaid.
 *
 * Regras:
 *   - '*' expande para INSERT, UPDATE, DELETE.
 *   - Cada token (INSERT/UPDATE/DELETE) só casa em fronteira de palavra (\b),
 *     evitando falsos positivos em substrings (ex: "UPDATED", "INSERTION").
 *   - Texto descritivo após o evento é ignorado (ex: "UPDATE status").
 */
export function parseEdgeEvents(label: string): Set<Evt> {
  const out = new Set<Evt>();
  if (/\*/.test(label)) ALL_EVENTS.forEach((e) => out.add(e));
  for (const e of ALL_EVENTS) if (new RegExp(`\\b${e}\\b`).test(label)) out.add(e);
  return out;
}
