import { log } from '@/lib/logger';

/**
 * Global error handlers for unhandled promise rejections and runtime errors.
 * 
 * Call `initGlobalErrorHandlers()` once at app startup (e.g., in main.tsx)
 * to catch errors that escape component boundaries.
 * 
 * This prevents the app from silently failing when:
 * - A Supabase query rejects without a .catch()
 * - An async event handler throws
 * - A third-party library (Evolution API, SIP.js) throws unexpectedly
 */

let initialized = false;

export function initGlobalErrorHandlers() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  // Catch unhandled promise rejections (forgotten .catch() calls)
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason instanceof Error
      ? reason.message
      : typeof reason === 'string'
        ? reason
        : 'Unknown rejection';

    log.error('[GlobalError] Unhandled promise rejection:', message);

    // Prevent the browser from logging a duplicate error
    event.preventDefault();

    // Don't show toast for network errors (offline) or auth errors (redirect)
    const isNetworkError = message.includes('fetch') || message.includes('network');
    const isAuthError = message.includes('JWT') || message.includes('401') || message.includes('refresh_token');

    if (!isNetworkError && !isAuthError) {
      // Import toast lazily to avoid circular deps
      import('@/hooks/use-toast').then(({ toast }) => {
        toast({
          title: 'Erro inesperado',
          description: 'Ocorreu um erro em segundo plano. Se persistir, recarregue a página.',
          variant: 'destructive',
        });
      }).catch(() => {
        // Toast import failed — silently ignore
      });
    }
  });

  // Catch global runtime errors not caught by Error Boundaries
  window.addEventListener('error', (event) => {
    // Ignore script errors from third-party origins (CORS)
    if (event.message === 'Script error.' && !event.filename) return;
    // Ignore ResizeObserver loop errors (benign browser noise)
    if (event.message?.includes('ResizeObserver')) return;

    log.error('[GlobalError] Runtime error:', event.message, 'at', event.filename, ':', event.lineno);
  });

  log.info('[GlobalError] Global error handlers initialized');
}

/**
 * Lightweight performance observer for tracking long tasks and layout shifts.
 * 
 * Logs warnings when:
 * - A JavaScript task blocks the main thread for >100ms (long task)
 * - A layout shift occurs with score > 0.1 (CLS issue)
 * 
 * These help identify performance regressions in the Inbox and CRM modules
 * where large conversation lists or CRM forms can cause jank.
 */
export function initPerformanceMonitoring() {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') return;

  try {
    // Track long tasks (>50ms, warn at >100ms)
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 100) {
          log.warn(`[Perf] Long task: ${Math.round(entry.duration)}ms`, {
            startTime: Math.round(entry.startTime),
            duration: Math.round(entry.duration),
          });
        }
      }
    });
    longTaskObserver.observe({ type: 'longtask', buffered: true });

    // Track layout shifts (CLS > 0.1 is poor)
    let clsScore = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const layoutShift = entry as any;
        if (!layoutShift.hadRecentInput) {
          clsScore += layoutShift.value;
          if (clsScore > 0.1) {
            log.warn(`[Perf] CLS threshold exceeded: ${clsScore.toFixed(3)}`);
          }
        }
      }
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });

    log.info('[Perf] Performance monitoring initialized');
  } catch {
    // PerformanceObserver not supported — silently ignore
  }
}

/**
 * Track component render time for debugging slow renders.
 * Usage: const end = startRenderTimer('InboxList'); ... end();
 */
export function startRenderTimer(componentName: string): () => void {
  const start = performance.now();
  return () => {
    const duration = performance.now() - start;
    if (duration > 16) { // > 1 frame at 60fps
      log.warn(`[Perf] Slow render: ${componentName} took ${Math.round(duration)}ms`);
    }
  };
}
