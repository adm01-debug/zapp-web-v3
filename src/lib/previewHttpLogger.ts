/**
 * previewHttpLogger.ts
 *
 * Intercepta `window.fetch` para capturar respostas HTTP problemáticas
 * (foco em 412 Precondition Failed, mas registra qualquer 4xx/5xx) e
 * disparar:
 *   - eventos `preview-http-log` (consumidos pelo painel flutuante)
 *   - eventos `preview-precondition-error` / `recovered`
 *     (já consumidos pelo PreviewPreconditionBanner)
 *
 * Mantém um buffer circular em memória dos últimos 50 eventos para o
 * painel poder renderizar histórico sem perder nada.
 *
 * Ativado APENAS no preview do Lovable (lovable.app / lovableproject.com)
 * ou quando `VITE_ENABLE_PREVIEW_HTTP_LOGGER === 'true'`.
 */

export interface PreviewHttpLogEntry {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  status: number;
  statusText: string;
  durationMs: number;
  /** Headers de request relevantes (sem secrets). */
  requestHeaders: Record<string, string>;
  /** Headers de response. */
  responseHeaders: Record<string, string>;
  /** Primeiros 2000 chars do body de resposta (best-effort). */
  responseBodyPreview: string | null;
  /** True se foi 412 (foco do logger). */
  isPrecondition: boolean;
}

const MAX_ENTRIES = 50;
const buffer: PreviewHttpLogEntry[] = [];
let installed = false;
let preconditionStreak = 0;

const SENSITIVE_HEADER_RE = /authorization|apikey|api-key|cookie|set-cookie|x-supabase-auth|token/i;
const RELEVANT_REQUEST_HEADERS = [
  'content-type',
  'accept',
  'x-client-info',
  'x-supabase-client-platform',
  'x-supabase-client-platform-version',
  'x-supabase-client-runtime',
  'x-supabase-client-runtime-version',
  'x-correlation-id',
  'x-requested-with',
  'origin',
  'referer',
];

function shouldInstall(): boolean {
  if (typeof window === 'undefined') return false;
  if (installed) return false;
  const flag = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_ENABLE_PREVIEW_HTTP_LOGGER;
  if (flag === 'true') return true;
  const host = window.location.hostname;
  return /(^|\.)lovable\.app$/.test(host) || /(^|\.)lovableproject\.com$/.test(host);
}

function maskHeaderValue(name: string, value: string): string {
  if (SENSITIVE_HEADER_RE.test(name)) {
    if (!value) return '';
    return `${value.slice(0, 4)}…${value.slice(-4)} (masked)`;
  }
  return value;
}

function pickRequestHeaders(init?: RequestInit, input?: RequestInfo | URL): Record<string, string> {
  const out: Record<string, string> = {};
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (RELEVANT_REQUEST_HEADERS.includes(k) || SENSITIVE_HEADER_RE.test(k)) {
      out[k] = maskHeaderValue(k, value);
    }
  });
  return out;
}

function pickResponseHeaders(res: Response): Record<string, string> {
  const out: Record<string, string> = {};
  res.headers.forEach((value, key) => {
    out[key.toLowerCase()] = maskHeaderValue(key, value);
  });
  return out;
}

function pushEntry(entry: PreviewHttpLogEntry) {
  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES) buffer.splice(0, buffer.length - MAX_ENTRIES);
  try {
    document.dispatchEvent(new CustomEvent('preview-http-log', { detail: entry }));
  } catch {
    /* noop */
  }
}

export function getPreviewHttpLogs(): PreviewHttpLogEntry[] {
  return buffer.slice();
}

export function clearPreviewHttpLogs(): void {
  buffer.length = 0;
  preconditionStreak = 0;
  try {
    document.dispatchEvent(new CustomEvent('preview-http-log-cleared'));
  } catch {
    /* noop */
  }
}

export function installPreviewHttpLogger(): void {
  if (!shouldInstall()) return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async function patchedFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const start = performance.now();
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET') ?? 'GET').toUpperCase();
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    let response: Response;
    try {
      response = await originalFetch(input as RequestInfo, init);
    } catch (err) {
      // Network-level failure (Failed to fetch). Log como status 0.
      const entry: PreviewHttpLogEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
        method,
        url,
        status: 0,
        statusText: err instanceof Error ? err.message : 'Network error',
        durationMs: Math.round(performance.now() - start),
        requestHeaders: pickRequestHeaders(init, input as RequestInfo),
        responseHeaders: {},
        responseBodyPreview: null,
        isPrecondition: false,
      };
      pushEntry(entry);
      throw err;
    }

    if (!response.ok) {
      // Clona para não consumir o body do consumidor original.
      let bodyPreview: string | null = null;
      try {
        const cloned = response.clone();
        const text = await cloned.text();
        bodyPreview = text.slice(0, 2000);
      } catch {
        bodyPreview = null;
      }

      const isPrecondition = response.status === 412;
      const entry: PreviewHttpLogEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
        method,
        url,
        status: response.status,
        statusText: response.statusText,
        durationMs: Math.round(performance.now() - start),
        requestHeaders: pickRequestHeaders(init, input as RequestInfo),
        responseHeaders: pickResponseHeaders(response),
        responseBodyPreview: bodyPreview,
        isPrecondition,
      };
      pushEntry(entry);

      if (isPrecondition) {
        preconditionStreak += 1;
        try {
          document.dispatchEvent(new CustomEvent('preview-precondition-error', { detail: entry }));
        } catch {
          /* noop */
        }
      }
    } else if (preconditionStreak > 0 && response.ok) {
      preconditionStreak = 0;
      try {
        document.dispatchEvent(new CustomEvent('preview-precondition-recovered'));
      } catch {
        /* noop */
      }
    }

    return response;
  };
}
