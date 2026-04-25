import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';

interface RefreshQrButtonProps {
  /** Callback que efetivamente dispara a regeneração do QR. */
  onRefresh: () => void | Promise<void>;
  /** Loading externo (request em vôo no hook). */
  loading: boolean;
  /** Texto a exibir quando habilitado. */
  label: string;
  /** Cooldown em segundos após cada clique manual. Default: 5. */
  cooldownSeconds?: number;
}

/**
 * Botão "Gerar novo QR" com cooldown visual decrescente.
 *
 * Evita que o usuário pressione repetidamente em sequência (spam de requests
 * para a Evolution API) e dá feedback claro de quanto tempo falta para
 * habilitar de novo. O contador é puramente visual — a defesa real contra
 * concorrência continua sendo o `refreshInFlightRef` no hook.
 */
export function RefreshQrButton({
  onRefresh,
  loading,
  label,
  cooldownSeconds = 5,
}: RefreshQrButtonProps) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1_000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const handleClick = useCallback(() => {
    if (loading || secondsLeft > 0) return;
    setSecondsLeft(cooldownSeconds);
    void onRefresh();
  }, [loading, secondsLeft, cooldownSeconds, onRefresh]);

  const onCooldown = secondsLeft > 0;
  const disabled = loading || onCooldown;

  return (
    <Button
      variant="outline"
      onClick={handleClick}
      disabled={disabled}
      aria-busy={loading}
      aria-live="polite"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Gerando…
        </>
      ) : onCooldown ? (
        <>
          <RefreshCw className="w-4 h-4 mr-2 opacity-60" />
          Aguarde {secondsLeft}s
        </>
      ) : (
        <>
          <RefreshCw className="w-4 h-4 mr-2" />
          {label}
        </>
      )}
    </Button>
  );
}
