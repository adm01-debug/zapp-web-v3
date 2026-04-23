/**
 * Shared test helpers for the evolution-api edge function test suite.
 *
 * Centralizes:
 *  - Source reading (cached) for static-analysis style tests.
 *  - Robust block extraction by marker (terminates on next marker, not arbitrary size).
 *  - fetch stubbing with guaranteed restore.
 *  - leak-safe Deno.test options for proxy tests where the AbortController
 *    timeout is not cleared on synchronous fetch rejection.
 */

import {
  extractBlock as _extractBlock,
  type ExtractBlockOptions as _ExtractBlockOptions,
  readSourceFrom,
} from "../../_shared/test-helpers.ts";

/** Read `../index.ts` once and cache the contents. */
export async function readSource(): Promise<string> {
  return await readSourceFrom(import.meta.url, "../index.ts");
}

export type ExtractBlockOptions = _ExtractBlockOptions;
export const extractBlock = _extractBlock;

type FetchFn = typeof globalThis.fetch;

/**
 * Replace `globalThis.fetch` with `impl` and return a `restore()` function.
 * The original fetch is captured at call time, avoiding cross-test races.
 */
export function stubFetch(impl: FetchFn): () => void {
  const original: FetchFn = globalThis.fetch;
  globalThis.fetch = impl;
  return () => {
    globalThis.fetch = original;
  };
}

/**
 * Run `fn` with `globalThis.fetch` stubbed by `impl`, restoring it on return
 * or throw. Use this to eliminate try/finally boilerplate in tests.
 */
export async function withFetchStub<T>(
  impl: FetchFn,
  fn: () => Promise<T>,
): Promise<T> {
  const restore = stubFetch(impl);
  try {
    return await fn();
  } finally {
    restore();
  }
}

/**
 * Disable Deno's op/resource sanitizers for proxy tests.
 *
 * Why: `proxyToEvolution` arms a setTimeout-backed AbortController. When the
 * stubbed `fetch` rejects synchronously (network error / AbortError), the
 * timeout is not cleared, leaving a pending op. This is a known pre-existing
 * behavior of the proxy and not under test here — we only validate the
 * response contract, so we opt out of the sanitizer.
 */
export const leakSafeOpts = {
  sanitizeOps: false,
  sanitizeResources: false,
} as const;

/** Shared constants for proxy integration tests. */
export const CORS_DEFAULT = { "Access-Control-Allow-Origin": "*" };
export const URL_BASE = "https://evo.example.com";
export const KEY = "test-key";
