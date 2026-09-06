/**
 * Wrapper tipado para supabase.functions.invoke com propagação automática de
 * W3C traceparent (Dim-10) e x-correlation-id.
 *
 * Uso:
 *   const { data, error } = await invokeEdge('send-message', { body: { ... } });
 *
 * O traceparent gerado automaticamente pode ser inspecionado nos logs da edge
 * function via req.headers.get('traceparent') e encaminhado para chamadas
 * downstream (Evolution API, banco, etc.).
 */

import { supabase } from '@/integrations/supabase/client';
import { generateCorrelationId, CORRELATION_HEADER } from '@/lib/correlationId';
import { makeTraceHeaders, TraceContext } from '@/lib/tracing';
import type { FunctionsResponse } from '@supabase/functions-js';

export interface EdgeInvokeOptions {
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  /** Contexto de rastreamento existente — omita para gerar automaticamente. */
  traceCtx?: TraceContext;
  /** Método HTTP (padrão POST). */
  method?: 'POST' | 'GET' | 'PUT' | 'DELETE' | 'PATCH';
}

/**
 * Invoca uma edge function com headers de rastreamento injetados automaticamente:
 *   - traceparent (W3C Trace Context)
 *   - x-trace-id (atalho para filtros de log)
 *   - x-correlation-id (compatibilidade retroativa)
 *
 * Headers adicionais passados em `options.headers` têm precedência e podem
 * sobrescrever os gerados (ex.: para continuar um trace externo).
 */
export async function invokeEdge<T = unknown>(
  functionName: string,
  options: EdgeInvokeOptions = {}
): Promise<FunctionsResponse<T>> {
  const { body, headers: extraHeaders, traceCtx, method } = options;

  const traceHeaders = makeTraceHeaders(traceCtx);
  const correlationId = generateCorrelationId();

  const mergedHeaders: Record<string, string> = {
    [CORRELATION_HEADER]: correlationId,
    ...traceHeaders,
    ...extraHeaders,
  };

  return supabase.functions.invoke<T>(functionName, {
    body,
    headers: mergedHeaders,
    method,
  });
}
