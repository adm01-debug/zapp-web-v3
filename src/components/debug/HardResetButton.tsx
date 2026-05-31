import { useState } from 'react';
import { RotateCcw, Loader2 } from 'lucide-react';
import { getLogger } from '@/lib/logger';

const log = getLogger('HardReset');

/**
 * Dev-only "Hard Reset" button.
 * Unregisters all service workers, clears Cache Storage + storages, and reloads.
 * Renders nothing in production builds.
 */
export function HardResetButton() {
  const [busy, setBusy] = useState(false);

  if (!import.meta.env.DEV) return null;

  const handleReset = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if (typeof caches !== 'undefined') {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      try { sessionStorage.clear(); } catch { /* no-op */ }
      try { localStorage.clear(); } catch { /* no-op */ }
    } catch (err) {
      log.error('Hard reset failed', err);
    } finally {
      window.location.reload();
    }
  };

  return (
    <button
      type="button"
      onClick={handleReset}
      disabled={busy}
      aria-label="Hard Reset (dev)"
      title="Limpa service workers, caches e storages, e recarrega"
      className="fixed bottom-3 left-3 z-[9998] flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground shadow-md backdrop-blur hover:bg-muted disabled:opacity-60"
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <RotateCcw className="h-3.5 w-3.5" />
      )}
      Hard Reset
    </button>
  );
}
