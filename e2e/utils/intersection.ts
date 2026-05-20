/**
 * Helpers compartilhados para asserts de interseção exata dos filtros admin.
 *
 * Usados pelos specs:
 *  - `admin-webhook-filters-intersection.spec.ts`
 *  - `admin-failed-messages-filters-intersection.spec.ts`
 *
 * Reduzem duplicação encapsulando as três invariantes que sempre validamos:
 *   1. count(linhas renderizadas) === results-count exposto no header;
 *   2. count filtrado <= count baseline (interseção nunca aumenta o conjunto);
 *   3. count filtrado > 0 (caso contrário o sample escolhido não era válido).
 *
 * E ainda valida que TODA linha retornada satisfaz simultaneamente cada
 * predicado fornecido (interseção EXATA, não union).
 */
import { expect, type Locator } from '@playwright/test';
import { readResultsCount, readRowAttributes } from './admin-filters';

export type RowAttrs = Record<string, string>;
export type RowPredicate = (row: RowAttrs) => void;

export interface IntersectionAssertion {
  rows: Locator;
  resultsCount: Locator;
  baselineCount: number;
  attributes: string[];
  predicates: RowPredicate[];
}

/**
 * Aplica as três invariantes de count + checa que cada linha satisfaz
 * TODOS os predicados (interseção exata).
 */
export async function assertIntersectionInvariants({
  rows,
  resultsCount,
  baselineCount,
  attributes,
  predicates,
}: IntersectionAssertion): Promise<void> {
  const filteredCount = await rows.count();
  const headerCount = await readResultsCount(resultsCount);

  // Invariante 1: contador exposto bate com nº de linhas renderizadas.
  expect(filteredCount).toBe(headerCount);
  // Invariante 2: interseção nunca aumenta o conjunto.
  expect(filteredCount).toBeLessThanOrEqual(baselineCount);
  // Invariante 3: o sample escolhido produziu pelo menos 1 linha.
  expect(filteredCount).toBeGreaterThan(0);

  // Invariante 4: TODAS as linhas casam com TODOS os predicados.
  const filteredRows = await readRowAttributes(rows, attributes);
  for (const row of filteredRows) {
    for (const predicate of predicates) {
      predicate(row);
    }
  }
}

/**
 * Procura no baseline a primeira linha que atende ao filtro fornecido,
 * útil para escolher um sample real existente no dataset visível.
 */
export async function pickSample(
  rows: Locator,
  attributes: string[],
  matcher: (row: RowAttrs) => boolean,
): Promise<RowAttrs | undefined> {
  const baseline = await readRowAttributes(rows, attributes);
  return baseline.find(matcher);
}
