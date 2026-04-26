/**
 * Stress Test runner — orquestrador puro do loop de envios.
 *
 * Não acopla a UI nem ao Supabase: recebe `dispatch` e callbacks. Isso
 * permite testar o loop com mocks e reusar o runner em outros contextos
 * (CLI, edge function) no futuro.
 */
import type { StressResult, StressTaskType } from './types';

export interface DispatchInput {
  type: StressTaskType;
  idx: number;
  phone: string;
  instance: string;
}

export interface DispatchOutput {
  messageId?: string;
  detail?: string;
}

export interface RunOptions {
  plan: StressTaskType[];
  phone: string;
  instance: string;
  intervalMs: number;
  /** Política: 'stop_first' | 'continue' | 'stop_after_n'. */
  failurePolicy: 'stop_first' | 'continue' | 'stop_after_n';
  failureThreshold?: number;
  signal: AbortSignal;
  dispatch: (input: DispatchInput) => Promise<DispatchOutput>;
  onResult: (r: StressResult) => void;
  onProgress: (sent: number, total: number) => void;
}

export interface RunSummary {
  status: 'completed' | 'aborted' | 'failed';
  totalSent: number;
  totalFailed: number;
  abortReason?: string;
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const t = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

export async function runStressTest(opts: RunOptions): Promise<RunSummary> {
  const { plan, signal, dispatch, onResult, onProgress, intervalMs, failurePolicy, failureThreshold } = opts;
  const total = plan.length;
  let sent = 0;
  let failed = 0;
  let consecutiveFailures = 0;

  for (let i = 0; i < total; i++) {
    if (signal.aborted) {
      return { status: 'aborted', totalSent: sent, totalFailed: failed, abortReason: 'Cancelado pelo operador' };
    }
    const t0 = performance.now();
    const type = plan[i];
    try {
      const out = await dispatch({ type, idx: i, phone: opts.phone, instance: opts.instance });
      sent++;
      consecutiveFailures = 0;
      onResult({
        idx: i,
        type,
        status: 'ok',
        ms: Math.round(performance.now() - t0),
        messageId: out.messageId,
        detail: out.detail,
        ts: Date.now(),
      });
    } catch (err) {
      failed++;
      consecutiveFailures++;
      const msg = err instanceof Error ? err.message : String(err);
      onResult({
        idx: i,
        type,
        status: 'fail',
        ms: Math.round(performance.now() - t0),
        error: msg,
        ts: Date.now(),
      });

      if (failurePolicy === 'stop_first') {
        return { status: 'failed', totalSent: sent, totalFailed: failed, abortReason: `Parado na 1ª falha: ${msg}` };
      }
      if (failurePolicy === 'stop_after_n' && consecutiveFailures >= (failureThreshold ?? 5)) {
        return { status: 'failed', totalSent: sent, totalFailed: failed, abortReason: `Parado após ${consecutiveFailures} falhas seguidas` };
      }
    }
    onProgress(sent + failed, total);

    if (i < total - 1) {
      try {
        await sleep(intervalMs, signal);
      } catch {
        return { status: 'aborted', totalSent: sent, totalFailed: failed, abortReason: 'Cancelado durante o intervalo' };
      }
    }
  }

  return { status: 'completed', totalSent: sent, totalFailed: failed };
}
