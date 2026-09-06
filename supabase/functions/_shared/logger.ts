/**
 * Logger estruturado para Edge Functions.
 *
 * Saída: JSON newline-delimited (compatível com Loki/CloudWatch/Datadog).
 * Nunca lança erro — log falho não deve quebrar o hot path.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  requestId?: string;
  service?: string;
  action?: string;
  instanceName?: string;
  durationMs?: number;
  [key: string]: unknown;
}

export interface Logger {
  debug(message: string, ctx?: LogContext): void;
  info(message: string, ctx?: LogContext): void;
  warn(message: string, ctx?: LogContext): void;
  error(message: string, ctx?: LogContext): void;
  child(ctx: LogContext): Logger;
}

function emit(level: LogLevel, message: string, ctx: LogContext): void {
  try {
    const entry = {
      ts: new Date().toISOString(),
      level,
      message,
      ...ctx,
    };
    if (level === 'error' || level === 'warn') {
      console.error(JSON.stringify(entry));
    } else {
      console.info(JSON.stringify(entry));
    }
  } catch {
    // silencioso — log nunca deve quebrar o caller
  }
}

function createLogger(baseCtx: LogContext = {}): Logger {
  return {
    debug: (msg, ctx) => emit('debug', msg, { ...baseCtx, ...ctx }),
    info:  (msg, ctx) => emit('info',  msg, { ...baseCtx, ...ctx }),
    warn:  (msg, ctx) => emit('warn',  msg, { ...baseCtx, ...ctx }),
    error: (msg, ctx) => emit('error', msg, { ...baseCtx, ...ctx }),
    child: (ctx) => createLogger({ ...baseCtx, ...ctx }),
  };
}

/**
 * Cria um logger raiz para uma edge function.
 *
 * @example
 * const log = makeLogger({ service: 'send-message', requestId: req.headers.get('x-request-id') ?? crypto.randomUUID() });
 * log.info('Iniciando envio', { instanceName });
 * log.error('Falha ao enviar', { error: err.message, durationMs: Date.now() - t0 });
 */
export function makeLogger(ctx: LogContext = {}): Logger {
  return createLogger(ctx);
}

/** Logger singleton para uso em módulos sem contexto de request. */
export const rootLogger = createLogger({ service: 'edge-function' });

/**
 * Compat: `getLogger(service)` era a API anterior a este arquivo (rewrite em
 * 20260906 via PR #1533) — 77 arquivos em supabase/functions/_shared ainda
 * chamam `getLogger('nome-do-servico')` no top-level do módulo. Sem este
 * export, o import falha com SyntaxError no boot do main worker das edge
 * functions (achado do Gate 6 — todo módulo com `import { getLogger }`
 * quebra o boot inteiro, não só o próprio módulo).
 */
export function getLogger(service: string): Logger {
  return makeLogger({ service });
}
