/**
 * Wrapper de envio para a Evolution API com exponential backoff.
 *
 * Por que existe: a Evolution API/Eco fica intermitente sob carga
 * (timeouts, 502/503/504, "fetch failed"). Sem retry, cada falha vira
 * uma mensagem `failed` no inbox e o agente precisa reenviar manualmente.
 *
 * Estratégia:
 * - 3 tentativas (1ª imediata + 2 retries).
 * - Backoff exponencial: ~1s, ~2s, com jitter.
 * - Só faz retry para erros transitórios (rede, 5xx, timeout). 4xx aborta.
 * - Reporta cada retry via `onRetry` (toast opcional).
 */
import { supabase } from '@/integrations/supabase/client';
import { withRetry } from '@/lib/retry';
import { getLogger } from '@/lib/logger';

const log = getLogger('EvolutionSendRetry');

export interface EvolutionInvokeOptions {
  body: Record<string, unknown>;
  method?: 'POST' | 'GET';
  headers?: Record<string, string>;
}

export interface EvolutionInvokeResult<T = unknown> {
  data: T | null;
  error: { message?: string; status?: number; name?: string } | null;
}

const TRANSIENT_PATTERNS = [
  'fetch', 'network', 'timeout', 'aborted', 'econnreset',
  'enotfound', '502', '503', '504', '429', 'unavailable',
  'temporarily', 'gateway',
];

function isTransient(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    const status = (err as unknown as { status?: number }).status;
    if (typeof status === 'number' && status >= 500) return true;
    return TRANSIENT_PATTERNS.some((p) => msg.includes(p));
  }
  if (typeof err === 'object') {
    const anyErr = err as { status?: number; message?: string };
    if (anyErr.status && anyErr.status >= 500) return true;
    if (anyErr.status === 429) return true;
    if (anyErr.message) return TRANSIENT_PATTERNS.some((p) => anyErr.message!.toLowerCase().includes(p));
  }
  return false;
}

/**
 * Invoca `evolution-api/<action>` com retry exponencial em falhas transitórias.
 * Lança em falha definitiva — caller atualiza UI/DB com status `failed`.
 */
export async function invokeEvolutionWithRetry<T = unknown>(
  action: string,
  opts: EvolutionInvokeOptions,
  config: {
    maxRetries?: number;
    onRetry?: (attempt: number, totalRetries: number, err: unknown) => void;
  } = {}
): Promise<EvolutionInvokeResult<T>> {
  const { maxRetries = 3, onRetry } = config;

  return withRetry(
    async () => {
      const result = await supabase.functions.invoke(`evolution-api/${action}`, {
        method: opts.method || 'POST',
        body: opts.body,
        headers: opts.headers,
      });

      // Supabase encapsula erros em result.error; também checa payload com erro
      if (result.error) {
        const err = result.error as { message?: string; status?: number };
        if (isTransient(err)) {
          throw Object.assign(new Error(err.message || 'transient'), { status: err.status });
        }
        // Erro definitivo — não retry
        return result as EvolutionInvokeResult<T>;
      }

      const payload = result.data as { error?: unknown; status?: number; message?: string } | null;
      if (payload?.error || (payload?.status && payload.status >= 500)) {
        const reason = (payload.message || JSON.stringify(payload.error)).toString();
        if (isTransient({ message: reason, status: payload.status })) {
          throw Object.assign(new Error(reason), { status: payload.status });
        }
      }

      return result as EvolutionInvokeResult<T>;
    },
    {
      maxRetries,
      baseDelayMs: 800,
      maxDelayMs: 6000,
      shouldRetry: (err) => isTransient(err),
      onRetry: (err, attempt) => {
        log.warn(`[evolution] retry ${attempt}/${maxRetries} action=${action}`, err);
        onRetry?.(attempt, maxRetries, err);
      },
    }
  );
}
