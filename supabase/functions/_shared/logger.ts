/**
 * Logger estruturado JSON para edge functions.
 * Todos os campos emitidos para stdout são parseable por Loki/Prometheus.
 * Uso: import { getLogger } from '../_shared/logger.ts'
 *      const log = getLogger('nome-da-function')
 *      log.info('mensagem', { chave: 'valor' })
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  ts: string;
  level: LogLevel;
  fn: string;
  msg: string;
  requestId?: string;
  [key: string]: unknown;
}

function emit(level: LogLevel, fn: string, msg: string, ctx?: Record<string, unknown>, requestId?: string): void {
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    fn,
    msg,
    ...(requestId ? { requestId } : {}),
    ...ctx,
  };
  const line = JSON.stringify(entry);
  if (level === 'error' || level === 'warn') {
    console.error(line);
  } else {
    Deno.stdout.writeSync(new TextEncoder().encode(line + '\n'));
  }
}

export class EdgeLogger {
  constructor(private readonly fn: string, private readonly requestId?: string) {}

  debug(msg: string, ctx?: Record<string, unknown>): void {
    if (Deno.env.get('LOG_LEVEL') === 'debug') {
      emit('debug', this.fn, msg, ctx, this.requestId);
    }
  }

  info(msg: string, ctx?: Record<string, unknown>): void {
    emit('info', this.fn, msg, ctx, this.requestId);
  }

  warn(msg: string, ctx?: Record<string, unknown>): void {
    emit('warn', this.fn, msg, ctx, this.requestId);
  }

  error(msg: string, ctx?: Record<string, unknown>): void {
    emit('error', this.fn, msg, ctx, this.requestId);
  }

  withRequestId(requestId: string): EdgeLogger {
    return new EdgeLogger(this.fn, requestId);
  }
}

const loggers = new Map<string, EdgeLogger>();

export function getLogger(fnName: string): EdgeLogger {
  if (!loggers.has(fnName)) {
    loggers.set(fnName, new EdgeLogger(fnName));
  }
  return loggers.get(fnName)!;
}
