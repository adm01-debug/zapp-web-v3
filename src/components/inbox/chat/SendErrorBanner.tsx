import { AlertCircle, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SendErrorBannerProps {
  error: string | null;
  isRetrying?: boolean;
  onRetry: () => void;
  onDismiss: () => void;
}

export function SendErrorBanner({ error, isRetrying, onRetry, onDismiss }: SendErrorBannerProps) {
  if (!error) return null;
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="mx-3 mb-2 flex items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive animate-in fade-in slide-in-from-bottom-1"
    >
      <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="font-medium leading-tight">Falha ao enviar mensagem</p>
        <p className="text-xs opacity-80 truncate">{error}</p>
      </div>
      <Button
        size="sm"
        variant="destructive"
        onClick={onRetry}
        disabled={isRetrying}
        className="h-8 gap-1.5"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
        {isRetrying ? 'Reenviando...' : 'Reenviar'}
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={onDismiss}
        className="h-8 w-8 text-destructive hover:bg-destructive/20"
        aria-label="Dispensar erro"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
