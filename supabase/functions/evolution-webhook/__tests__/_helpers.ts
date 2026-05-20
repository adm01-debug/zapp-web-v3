/**
 * Helpers de teste do evolution-webhook (mesmo padrão de evolution-api).
 * Reusa o test-helpers compartilhado para leitura/extração de blocos do source.
 */
import {
  extractBlock as _extractBlock,
  type ExtractBlockOptions as _ExtractBlockOptions,
  hasMarker as _hasMarker,
  readSourceFrom,
} from "../../_shared/test-helpers.ts";

export async function readSource(): Promise<string> {
  return await readSourceFrom(import.meta.url, "../index.ts");
}

export type ExtractBlockOptions = _ExtractBlockOptions;
export const extractBlock = _extractBlock;
export const hasMarker = _hasMarker;
