import { memo } from 'react';
import { WifiOff, Loader2 } from 'lucide-react';

interface ConnectionStatusBannerProps {
  isOnline: boolean;
  isConnected: boolean;
  queueLength: number;
  latency: number | null;
}

/**
 * Banner that shows connection status at the top of the app.
 *
 * States:
 * - Offline (red): No internet connection
 * - Reconnecting (yellow): Internet is up but Supabase is unreachable
 * - High latency (yellow): Connected but >2s latency
 * - Queue pending (blue): Actions waiting to be sent
 * - Connected (hidden): Normal operation, no banner
 */
export const ConnectionStatusBanner = memo(function ConnectionStatusBanner({
  isOnline,
  isConnected,
  queueLength,
  latency,
}: ConnectionStatusBannerProps) {
  // Fully connected, no queue — hide banner
  if (isOnline && isConnected && queueLength === 0 && (latency === null || latency < 2000)) {
    return null;
  }

  // Offline
  if (!isOnline) {
    return (
      <div
        role="alert"
        className="flex items-center gap-2 px-4 py-2 text-xs font-medium bg-destructive text-destructive-foreground"
      >
        <WifiOff className="h-3.5 w-3.5" />
        <span>
          Sem conexão com a internet.
          {queueLength > 0 && ` ${queueLength} ${queueLength === 1 ? 'ação pendente' : 'ações pendentes'} na fila.`}
        </span>
      </div>
    );
  }

  // Online but Supabase unreachable
  if (!isConnected) {
    return (
      <div
        role="alert"
        className="flex items-center gap-2 px-4 py-2 text-xs font-medium bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-b border-yellow-500/20"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Reconectando ao servidor...</span>
      </div>
    );
  }

  // High latency warning
  if (latency !== null && latency > 2000) {
    return (
      <div
        role="status"
        className="flex items-center gap-2 px-4 py-1.5 text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-500/5 border-b border-yellow-500/10"
      >
        <span>Latência alta: {Math.round(latency)}ms</span>
      </div>
    );
  }

  // Queue pending
  if (queueLength > 0) {
    return (
      <div
        role="status"
        className="flex items-center gap-2 px-4 py-1.5 text-xs text-blue-700 dark:text-blue-400 bg-blue-500/5 border-b border-blue-500/10"
      >
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Enviando {queueLength} {queueLength === 1 ? 'ação' : 'ações'} pendentes...</span>
      </div>
    );
  }

  return null;
});
