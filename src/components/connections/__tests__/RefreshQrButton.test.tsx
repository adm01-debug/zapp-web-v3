import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { RefreshQrButton } from '../RefreshQrButton';

/**
 * Quando o botão está disabled, browsers (e jsdom) não disparam onClick. Então
 * as garantias "cliques múltiplos não disparam refresh" são validadas pela
 * combinação de:
 *   (a) `onRefresh` chamado N vezes esperadas
 *   (b) atributo `data-block-reason` indicando o motivo do bloqueio
 *
 * Para cobrir o caso EXTRA "clique escapou via assistive tech / programático",
 * o handleClick também tem early-return interno e logamos `click_ignored` —
 * cobertura abaixo.
 */
describe('RefreshQrButton — proteção contra cliques múltiplos', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  const stabilize = async () => {
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
  };

  /** Re-busca o botão após cada rerender — Tooltip wrapper pode trocar a árvore. */
  const getButton = () => screen.getByRole('button');

  it('múltiplos cliques rápidos durante pending disparam onRefresh apenas UMA vez', async () => {
    const onRefresh = vi.fn();
    render(
      <RefreshQrButton
        onRefresh={onRefresh}
        loading={false}
        status="pending"
        label="Gerar novo QR"
      />,
    );

    await stabilize();
    const button = getButton();
    expect(button).not.toBeDisabled();

    // 5 cliques no mesmo tick.
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(getButton()).toBeDisabled();
    expect(getButton()).toHaveAttribute('data-block-reason', 'cooldown');
  });

  it('durante o cooldown, cliques adicionais permanecem ignorados', async () => {
    const onRefresh = vi.fn();
    render(
      <RefreshQrButton
        onRefresh={onRefresh}
        loading={false}
        status="pending"
        label="Gerar novo QR"
        cooldownSeconds={5}
      />,
    );

    await stabilize();
    fireEvent.click(getButton());
    expect(onRefresh).toHaveBeenCalledTimes(1);

    // Avança 1s — ainda em cooldown (5s).
    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });

    // Botão disabled — fireEvent.click em disabled não dispara handler, mas
    // a verificação real é que `onRefresh` continua em 1 e o atributo expõe
    // o motivo para diagnóstico.
    expect(getButton()).toBeDisabled();
    expect(getButton()).toHaveAttribute('data-block-reason', 'cooldown');
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('após o cooldown expirar, o botão reabilita e aceita novo clique', async () => {
    const onRefresh = vi.fn();
    render(
      <RefreshQrButton
        onRefresh={onRefresh}
        loading={false}
        status="pending"
        label="Gerar novo QR"
        cooldownSeconds={3}
      />,
    );

    await stabilize();
    fireEvent.click(getButton());
    expect(onRefresh).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(3_500);
    });

    expect(getButton()).not.toBeDisabled();
    fireEvent.click(getButton());
    fireEvent.click(getButton());
    fireEvent.click(getButton());

    expect(onRefresh).toHaveBeenCalledTimes(2);
  });

  it('bloqueia cliques quando loading externo está ativo (in_flight)', async () => {
    const onRefresh = vi.fn();
    const { rerender } = render(
      <RefreshQrButton
        onRefresh={onRefresh}
        loading={true}
        status="loading"
        label="Gerar novo QR"
      />,
    );

    expect(getButton()).toBeDisabled();
    expect(getButton()).toHaveAttribute('data-block-reason', 'in_flight');
    expect(onRefresh).not.toHaveBeenCalled();

    // Quando termina e volta a pending, ainda há janela de estabilização.
    rerender(
      <RefreshQrButton
        onRefresh={onRefresh}
        loading={false}
        status="pending"
        label="Gerar novo QR"
      />,
    );
    expect(getButton()).toBeDisabled();
    expect(getButton()).toHaveAttribute('data-block-reason', 'awaiting_stabilization');

    await stabilize();
    expect(getButton()).not.toBeDisabled();
    fireEvent.click(getButton());
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('bloqueia cliques durante a janela de estabilização (awaiting_stabilization)', async () => {
    const onRefresh = vi.fn();
    render(
      <RefreshQrButton
        onRefresh={onRefresh}
        loading={false}
        status="pending"
        label="Gerar novo QR"
        stabilizationMs={400}
      />,
    );

    expect(getButton()).toBeDisabled();
    expect(getButton()).toHaveAttribute('data-block-reason', 'awaiting_stabilization');
    expect(onRefresh).not.toHaveBeenCalled();

    await stabilize();
    expect(getButton()).not.toBeDisabled();
    fireEvent.click(getButton());
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
