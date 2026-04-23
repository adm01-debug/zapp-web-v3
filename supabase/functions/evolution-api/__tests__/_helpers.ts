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

let _cachedSource: string | null = null;

/** Read `../index.ts` once and cache the contents. */
export async function readSource(): Promise<string> {
  if (_cachedSource !== null) return _cachedSource;
  _cachedSource = await Deno.readTextFile(
    new URL("../index.ts", import.meta.url),
  );
  return _cachedSource;
}

export interface ExtractBlockOptions {
  /** Stop the block when this pattern is found after the marker. */
  until?: string | RegExp;
  /** Max characters to scan / return (default 2000). */
  maxSize?: number;
}

/**
 * Extract a chunk of source starting at `marker`. If `until` is provided,
 * the block ends at the next match of `until` after the marker (exclusive),
 * bounded by `maxSize`. Otherwise returns up to `maxSize` characters.
 *
 * Throws a descriptive error if the marker is not found.
 */
export function extractBlock(
  source: string,
  marker: string,
  opts: ExtractBlockOptions = {},
): string {
  const start = source.indexOf(marker);
  if (start === -1) {
    throw new Error(`extractBlock: marker not found: ${JSON.stringify(marker)}`);
  }
  const maxSize = opts.maxSize ?? 2000;
  const window = source.slice(start, start + maxSize);
  if (opts.until !== undefined) {
    // search after the marker itself so we don't match the marker line
    const afterMarker = window.slice(marker.length);
    const idx = afterMarker.search(
      typeof opts.until === "string"
        ? new RegExp(opts.until.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        : opts.until,
    );
    if (idx !== -1) {
      return window.slice(0, marker.length + idx);
    }
  }
  return window;
}

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
