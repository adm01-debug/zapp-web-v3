import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';

export type RefreshQrButtonStatus = 'loading' | 'pending' | 'connected' | 'error';

interface RefreshQrButtonProps {
  /** Callback que efetivamente dispara a regeneração do QR. */
  onRefresh: () => void | Promise<void>;
  /** Loading externo (request em vôo no hook). */
  loading: boolean;
  /** Texto a exibir quando habilitado. */
  label: string;
  /** Status atual do diálogo. Bloqueia o refresh em transições para loading/error. */
  status: RefreshQrButtonStatus;
  /** Cooldown em segundos após cada clique manual. Default: 5. */
  cooldownSeconds?: number;
  /**
   * Tempo (ms) que o status precisa permanecer estável em `pending` antes de
   * reabilitar o botão. Evita flicker em rápidas transições pending→loading→pending.
   * Default: 400ms.
   */
  stabilizationMs?: number;
}

/**
 * Botão "Gerar novo QR" com cooldown visual e bloqueio reativo a status.
 *
 * Regras de habilitação (do mais restritivo ao menos):
 * 1. `loading` externo → desabilitado, mostra "Gerando…".
 * 2. Status NÃO é `pending` (loading/error/connected) → desabilitado, sem cooldown
 *    visível. Cooldown stale é zerado para não confundir o usuário no próximo
 *    `pending`.
 * 3. Cooldown local após clique manual → desabilitado, mostra contador.
 * 4. Status acabou de virar `pending` mas ainda não estabilizou (`stabilizationMs`)
 *    → desabilitado silenciosamente para evitar reabilitação prematura.
 * 5. Caso contrário → habilitado.
 */
export function RefreshQrButton({
  onRefresh,
  loading,
  label,
  status,
  cooldownSeconds = 5,
  stabilizationMs = 400,
}: RefreshQrButtonProps) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [stabilized, setStabilized] = useState(false);
  const previousStatusRef = useRef<RefreshQrButtonStatus>(status);

  // Reage a mudanças de status: bloqueia imediatamente quando vai para
  // `loading` (refresh em vôo), e re-arma o timer de estabilização ao voltar
  // a um estado interativo (`pending` ou `error`, este último permite retry
  // manual). `connected` desabilita silenciosamente — o componente é
  // desmontado nesse caso pelo container, mas defendemos aqui também.
  useEffect(() => {
    const prev = previousStatusRef.current;
    previousStatusRef.current = status;

    if (status === 'loading' || status === 'connected') {
      setStabilized(false);
      if (prev !== status && secondsLeft > 0) setSecondsLeft(0);
      return;
    }

    // status === 'pending' | 'error': aguardar estabilização antes de reabilitar.
    setStabilized(false);
    const timer = setTimeout(() => setStabilized(true), stabilizationMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, stabilizationMs]);

  // Decremento do cooldown.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1_000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const isInteractiveStatus = status === 'pending' || status === 'error';
  const blockedByStatus = !isInteractiveStatus || !stabilized;

  const handleClick = useCallback(() => {
    if (loading || secondsLeft > 0 || blockedByStatus) return;
    setSecondsLeft(cooldownSeconds);
    void onRefresh();
  }, [loading, secondsLeft, blockedByStatus, cooldownSeconds, onRefresh]);

  const onCooldown = secondsLeft > 0 && isInteractiveStatus;
  const disabled = loading || onCooldown || blockedByStatus;

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
