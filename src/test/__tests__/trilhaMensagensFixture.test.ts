import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEdgeEvents } from '../realtimeFanoutEvents.test';

/**
 * Snapshot/fixture test: protege os rótulos REAIS do diagrama
 * TRILHA_MENSAGENS_NAVEGAVEL.mmd contra mudanças silenciosas na regex de
 * `parseEdgeEvents`. Qualquer alteração no parser que reinterprete um rótulo
 * existente faz o snapshot quebrar — forçando revisão consciente.
 *
 * Estratégia:
 *   1. Lê o .mmd uma vez.
 *   2. Extrai todos os rótulos de aresta `|...|` (Mermaid edge label).
 *   3. Roda parseEdgeEvents em cada um e congela o mapa label -> events[].
 */

const MMD_PATH = resolve(__dirname, '../fixtures/TRILHA_MENSAGENS_NAVEGAVEL.mmd');
const RAW = readFileSync(MMD_PATH, 'utf8');

// Mermaid edge labels: -->|texto|, ==>|texto|, -.->|texto|, etc.
// Captura conteúdo entre o primeiro e o último '|' do par.
function extractEdgeLabels(src: string): string[] {
  const out = new Set<string>();
  const re = /\|([^|\n]+)\|/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const label = m[1].trim();
    if (label) out.add(label);
  }
  return [...out].sort();
}

const LABELS = extractEdgeLabels(RAW);

describe('TRILHA_MENSAGENS_NAVEGAVEL.mmd — snapshot dos rótulos de aresta', () => {
  it('extrai pelo menos 1 rótulo do fixture (sanity)', () => {
    expect(LABELS.length).toBeGreaterThan(0);
  });

  it('snapshot: parseEdgeEvents(label) -> [eventos] congelado', () => {
    const map: Record<string, string[]> = {};
    for (const label of LABELS) {
      map[label] = [...parseEdgeEvents(label)].sort();
    }
    expect(map).toMatchSnapshot();
  });

  it('nenhum rótulo do fixture casa evento por substring acidental', () => {
    // Garantia explícita: se um rótulo NÃO contém a palavra "INSERT" como token
    // (cercada por fronteira de palavra), ele NUNCA deve produzir INSERT — e
    // simétrico para UPDATE/DELETE. Protege contra regex sem \b.
    for (const label of LABELS) {
      const events = parseEdgeEvents(label);
      for (const evt of ['INSERT', 'UPDATE', 'DELETE'] as const) {
        const hasToken = new RegExp(`(^|[^A-Z])${evt}([^A-Z]|$)`).test(label);
        const hasWildcard = label.includes('*');
        if (events.has(evt)) {
          expect(
            hasToken || hasWildcard,
            `Rótulo "${label}" produziu ${evt} sem conter o token nem '*'`,
          ).toBe(true);
        }
      }
    }
  });
});
