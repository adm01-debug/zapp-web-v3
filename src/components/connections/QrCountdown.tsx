import { useEffect, useState } from 'react';
import { Clock, RefreshCw } from 'lucide-react';

interface QrCountdownProps {
  /** Unix ms when the current QR expires. */
  expiresAt: number;
  /**
   * How many ms before `expiresAt` the auto-refresh fires.
   * Must match the value used in `useConnectionsManager` (default 5s).
   */
  autoRefreshLeadMs?: number;
}

/**
 * Live countdown shown under the QR code while it is pending.
 *
 * Shows two phases:
 *  1. Time until the next automatic refresh (`expiresAt - autoRefreshLeadMs`).
 *  2. Once the auto-refresh window opens, falls back to the raw expiry timer
 *     so the user still sees how long the current QR remains scannable.
 *
 * Re-derives the remaining seconds each tick from `expiresAt`, so it stays
 * accurate even if the page is reloaded mid-window (the parent restores
 * `expiresAt` from sessionStorage on mount).
 */
export function QrCountdown({ expiresAt, autoRefreshLeadMs = 5_000 }: QrCountdownProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const refreshAt = expiresAt - autoRefreshLeadMs;
  const msToRefresh = refreshAt - now;
  const msToExpiry = expiresAt - now;

  // Phase 1 — counting down to the automatic refresh.
  if (msToRefresh > 0) {
    const seconds = Math.ceil(msToRefresh / 1000);
    const isLow = seconds <= 10;
    return (
      <div
        className={
          'flex items-center justify-center gap-1.5 text-xs font-medium ' +
          (isLow ? 'text-primary' : 'text-muted-foreground')
        }
        aria-live="polite"
      >
        <RefreshCw className={'w-3 h-3 ' + (isLow ? 'animate-spin-slow' : '')} />
        Atualização automática em {seconds}s
      </div>
    );
  }

  // Phase 2 — refresh window reached; show remaining QR validity.
  if (msToExpiry > 0) {
    const seconds = Math.ceil(msToExpiry / 1000);
    return (
      <div
        className="flex items-center justify-center gap-1.5 text-xs font-medium text-destructive"
        aria-live="polite"
      >
        <Clock className="w-3 h-3" />
        Atualizando… expira em {seconds}s
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center gap-1.5 text-xs font-medium text-destructive"
      aria-live="polite"
    >
      <Clock className="w-3 h-3" />
      QR Code expirado
    </div>
  );
}
