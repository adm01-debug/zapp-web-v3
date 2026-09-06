/**
 * W3C Trace Context (traceparent) propagation.
 *
 * Formato: 00-<trace-id-32hex>-<parent-id-16hex>-<flags-2hex>
 * spec: https://www.w3.org/TR/trace-context/
 *
 * Cada chamada frontend → edge function carrega traceparent para que:
 *   - Edge function encaminhe o mesmo trace-id para chamadas downstream
 *   - Logs estruturados do edge e do DB possam ser correlacionados
 *   - Ferramentas de APM visualizem a cadeia completa da request
 *
 * A integração com x-correlation-id (correlationId.ts) é mantida separada
 * para compatibilidade retroativa — traceparent é adicional.
 */

const TRACEPARENT_VERSION = '00';
const TRACE_FLAGS_SAMPLED = '01';

/** Gera 32 chars hex para trace-id (128 bits). */
function randomHex32(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return Array.from({ length: 4 }, () =>
    Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0')
  ).join('');
}

/** Gera 16 chars hex para parent-id (64 bits). */
function randomHex16(): string {
  return randomHex32().slice(0, 16);
}

/** Contexto de rastreamento propagado pelo frontend. */
export interface TraceContext {
  traceId: string;       // 32 hex chars — identifica a req lógica ponta-a-ponta
  spanId: string;        // 16 hex chars — identifica este "hop" (frontend)
  traceparent: string;   // header W3C completo: 00-<traceId>-<spanId>-01
}

/**
 * Cria um novo contexto de rastreamento.
 * Cada chamada a edge function deve criar seu próprio span (mesmo traceId,
 * novo spanId) se a rastreabilidade intra-request for necessária.
 */
export function newTraceContext(): TraceContext {
  const traceId = randomHex32();
  const spanId = randomHex16();
  return {
    traceId,
    spanId,
    traceparent: `${TRACEPARENT_VERSION}-${traceId}-${spanId}-${TRACE_FLAGS_SAMPLED}`,
  };
}

/**
 * Extrai TraceContext de um traceparent W3C existente.
 * Útil para continuar um trace iniciado por outro hop.
 * Retorna null se o header for inválido.
 */
export function parseTraceparent(header: string): TraceContext | null {
  const parts = header.split('-');
  if (parts.length !== 4) return null;
  const [version, traceId, spanId, flags] = parts;
  if (version !== TRACEPARENT_VERSION) return null;
  if (traceId.length !== 32 || spanId.length !== 16) return null;
  return {
    traceId,
    spanId,
    traceparent: `${version}-${traceId}-${spanId}-${flags}`,
  };
}

/**
 * Retorna headers prontos para injetar em supabase.functions.invoke:
 *   { traceparent: '00-...', x-trace-id: '...' }
 *
 * x-trace-id é redundante mas facilita filtros em logs que não leem traceparent.
 */
export function makeTraceHeaders(ctx?: TraceContext): Record<string, string> {
  const trace = ctx ?? newTraceContext();
  return {
    traceparent: trace.traceparent,
    'x-trace-id': trace.traceId,
  };
}
