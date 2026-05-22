// @ts-nocheck
import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Listens for the `sw-update-available` event dispatched by useServiceWorker
 * when a new bundle is detected. Prompts the user to reload to avoid the
 * "two frontends" symptom (different tabs/devices serving different bundle hashes).
 */
export function ServiceWorkerUpdateBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onUpdate = () => setVisible(true);
    document.addEventListener('sw-update-available', onUpdate);
    return () => document.removeEventListener('sw-update-available', onUpdate);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] max-w-md w-[calc(100%-1rem)] rounded-lg border border-primary/40 bg-card text-card-foreground shadow-lg p-3 flex items-start gap-3"
    >
      <RefreshCw className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Nova versão disponível</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Recarregue para evitar inconsistências entre abas e dispositivos.
        </p>
        <div className="flex gap-2 mt-2">
          <Button
            size="sm"
            variant="default"
            onClick={() => window.location.reload()}
            className="gap-1.5 h-7"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Recarregar agora
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setVisible(false)}
            className="h-7"
          >
            Depois
          </Button>
        </div>
      </div>
      <button
        type="button"
        aria-label="Dispensar aviso"
        onClick={() => setVisible(false)}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
