import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { RefreshQrButton } from '../RefreshQrButton';

describe('RefreshQrButton — proteção contra cliques múltiplos', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  /**
   * Avança o relógio fake o suficiente para o status `pending` estabilizar
   * (default `stabilizationMs = 400`). Sem isso o botão fica disabled por
   * `awaiting_stabilization` e nenhum clique passa.
   */
  const stabilize = async () => {
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
  };

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
    const button = screen.getByRole('button');

    // 5 cliques em sequência imediata (mesmo tick).
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('cliques durante o cooldown são ignorados e logados como click_ignored', async () => {
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
    const button = screen.getByRole('button');

    fireEvent.click(button); // primeiro: passa
    expect(onRefresh).toHaveBeenCalledTimes(1);

    // Avança 1s — ainda em cooldown (5s).
    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });

    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('data-block-reason', 'cooldown');
  });

  it('após o cooldown expirar, o botão volta a aceitar exatamente um clique', async () => {
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
    const button = screen.getByRole('button');

    fireEvent.click(button);
    expect(onRefresh).toHaveBeenCalledTimes(1);

    // Avança além do cooldown.
    await act(async () => {
      vi.advanceTimersByTime(3_500);
    });

    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    // Apenas o segundo "ciclo" passou — total = 2.
    expect(onRefresh).toHaveBeenCalledTimes(2);
  });

  it('cliques são ignorados enquanto loading externo está ativo (in_flight)', async () => {
    const onRefresh = vi.fn();
    const { rerender } = render(
      <RefreshQrButton
        onRefresh={onRefresh}
        loading={true}
        status="loading"
        label="Gerar novo QR"
      />,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    expect(onRefresh).not.toHaveBeenCalled();
    expect(button).toHaveAttribute('data-block-reason', 'in_flight');

    // Quando a request termina e volta a pending, o botão precisa estabilizar antes.
    rerender(
      <RefreshQrButton
        onRefresh={onRefresh}
        loading={false}
        status="pending"
        label="Gerar novo QR"
      />,
    );
    fireEvent.click(button); // ainda bloqueado por awaiting_stabilization
    expect(onRefresh).not.toHaveBeenCalled();

    await stabilize();
    fireEvent.click(button);
    fireEvent.click(button);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('cliques durante a janela de estabilização são bloqueados (awaiting_stabilization)', async () => {
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

    const button = screen.getByRole('button');
    // Mount → pending mas não estabilizado ainda.
    fireEvent.click(button);
    fireEvent.click(button);
    expect(onRefresh).not.toHaveBeenCalled();
    expect(button).toHaveAttribute('data-block-reason', 'awaiting_stabilization');

    await stabilize();
    fireEvent.click(button);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
