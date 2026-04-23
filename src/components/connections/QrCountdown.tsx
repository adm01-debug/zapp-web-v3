import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface QrCountdownProps {
  /** Unix ms when the current QR expires. */
  expiresAt: number;
}

/**
 * Live countdown shown under the QR code while it is pending.
 * Re-derives the remaining seconds each tick from `expiresAt`, so it stays
 * accurate even if the page is reloaded mid-window (the parent restores
 * `expiresAt` from sessionStorage on mount).
 */
export function QrCountdown({ expiresAt }: QrCountdownProps) {
  const [remaining, setRemaining] = useState(() => Math.max(0, expiresAt - Date.now()));

  useEffect(() => {
    setRemaining(Math.max(0, expiresAt - Date.now()));
    const id = setInterval(() => {
      setRemaining(Math.max(0, expiresAt - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const seconds = Math.ceil(remaining / 1000);
  const isLow = seconds <= 10;

  return (
    <div
      className={
        'flex items-center justify-center gap-1.5 text-xs font-medium ' +
        (isLow ? 'text-destructive' : 'text-muted-foreground')
      }
      aria-live="polite"
    >
      <Clock className="w-3 h-3" />
      {seconds > 0 ? `Expira em ${seconds}s` : 'QR Code expirado'}
    </div>
  );
}
