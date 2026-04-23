import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createScrollLoaderController } from '../scrollLoaderController';

/**
 * Tests for ChatMessagesArea's scroll-to-top loader controller.
 * Garante:
 *   1. Multiplos disparos durante scroll rapido nao geram chamadas duplicadas.
 *   2. Cancelamento (reverse scroll) limpa o savedScrollHeight para evitar
 *      o "pulo" de scroll quando o anchor effect for executado depois.
 */

describe('createScrollLoaderController', () => {
  let nowMs: number;
  const advance = (ms: number) => { nowMs += ms; };

  function setup(overrides: Partial<Parameters<typeof createScrollLoaderController>[0]> = {}) {
    const onLoadOlder = vi.fn(() => Promise.resolve());
    const onCancelLoadOlder = vi.fn();
    const ctrl = createScrollLoaderController({
      hasMoreOlder: () => true,
      isLoadingOlder: () => false,
      onLoadOlder,
      onCancelLoadOlder,
      getScrollHeight: () => 5000,
      now: () => nowMs,
      triggerThrottleMs: 250,
      reverseCancelPx: 50,
      ...overrides,
    });
    return { ctrl, onLoadOlder, onCancelLoadOlder };
  }

  beforeEach(() => { nowMs = 1_000; });

  describe('throttle / dedupe durante scroll rapido', () => {
    it('100 eventos de scroll consecutivos resultam em apenas 1 chamada de onLoadOlder', () => {
      const { ctrl, onLoadOlder } = setup();
      // Simula 100 ticks de scroll com top abaixo do threshold (preload=600).
      for (let i = 0; i < 100; i++) ctrl.onScroll(120, 600);
      expect(onLoadOlder).toHaveBeenCalledTimes(1);
      expect(ctrl.isFetching()).toBe(true);
    });

    it('triggerLoad direto chamado em rajada nao gera chamadas extras enquanto in-flight', () => {
      const { ctrl, onLoadOlder } = setup();
      for (let i = 0; i < 20; i++) ctrl.triggerLoad();
      expect(onLoadOlder).toHaveBeenCalledTimes(1);
    });

    it('apos resolver, novo trigger so passa quando ultrapassa o throttle window', async () => {
      const { ctrl, onLoadOlder } = setup();
      ctrl.triggerLoad();
      expect(onLoadOlder).toHaveBeenCalledTimes(1);
      // Aguarda a Promise interna resolver (libera isFetching).
      await Promise.resolve();
      await Promise.resolve();
      // Ainda dentro da janela de throttle (0ms passados): nada.
      ctrl.triggerLoad();
      expect(onLoadOlder).toHaveBeenCalledTimes(1);
      // Ainda dentro: 249ms.
      advance(249);
      ctrl.triggerLoad();
      expect(onLoadOlder).toHaveBeenCalledTimes(1);
      // Ultrapassou: 251ms.
      advance(2);
      ctrl.triggerLoad();
      expect(onLoadOlder).toHaveBeenCalledTimes(2);
    });

    it('respeita hasMoreOlder=false', () => {
      const { ctrl, onLoadOlder } = setup({ hasMoreOlder: () => false });
      for (let i = 0; i < 10; i++) ctrl.onScroll(50, 600);
      expect(onLoadOlder).not.toHaveBeenCalled();
    });

    it('respeita isLoadingOlder=true (loader externo ja ativo)', () => {
      const { ctrl, onLoadOlder } = setup({ isLoadingOlder: () => true });
      for (let i = 0; i < 10; i++) ctrl.onScroll(50, 600);
      expect(onLoadOlder).not.toHaveBeenCalled();
    });

    it('top >= preloadPx nao dispara', () => {
      const { ctrl, onLoadOlder } = setup();
      ctrl.onScroll(700, 600);
      expect(onLoadOlder).not.toHaveBeenCalled();
    });
  });

  describe('cancelamento previne pulo de scroll', () => {
    it('reverse-scroll DOWN > reverseCancelPx E alem da zona de preload aborta o fetch', () => {
      const { ctrl, onCancelLoadOlder } = setup();
      // Estabelece baseline de scroll dentro da zona de preload.
      ctrl.onScroll(100, 600); // dispara loadOlder + salva scrollHeight=5000
      expect(ctrl.isFetching()).toBe(true);
      expect(ctrl.savedScrollHeight()).toBe(5000);

      // Usuario rola para FORA da zona de preload (top=800 > preload=600).
      ctrl.onScroll(800, 600);
      expect(onCancelLoadOlder).toHaveBeenCalledTimes(1);
      expect(ctrl.wasCancelled()).toBe(true);
      // savedScrollHeight zerado => prepend-anchor effect NAO vai reposicionar
      // o scroll, evitando o "pulo" visual quando a resposta cancelada chegar.
      expect(ctrl.savedScrollHeight()).toBeNull();
      expect(ctrl.isFetching()).toBe(false);
    });

    it('movimento DOWN dentro da zona de preload NAO cancela (anti-jitter)', () => {
      const { ctrl, onCancelLoadOlder } = setup();
      ctrl.onScroll(100, 600);
      // Delta = 100 (>50) MAS top=200 ainda dentro da zona de preload (<600).
      ctrl.onScroll(200, 600);
      expect(onCancelLoadOlder).not.toHaveBeenCalled();
      expect(ctrl.savedScrollHeight()).toBe(5000);
    });

    it('movimento DOWN <= reverseCancelPx (mesmo fora do topo) NAO cancela', () => {
      const { ctrl, onCancelLoadOlder } = setup();
      ctrl.onScroll(700, 600); // fora da zona, sem disparo (top >= preload)
      ctrl.onScroll(740, 600); // delta = 40, abaixo do limite de 50
      expect(onCancelLoadOlder).not.toHaveBeenCalled();
    });

    it('sem onCancelLoadOlder, nao tenta cancelar nem zera savedScrollHeight', () => {
      const { ctrl } = setup({ onCancelLoadOlder: undefined });
      ctrl.onScroll(100, 600);
      ctrl.onScroll(800, 600); // mesmo cruzando a zona, sem callback
      expect(ctrl.isFetching()).toBe(true);
      expect(ctrl.savedScrollHeight()).toBe(5000);
    });

    it('continuar rolando para CIMA enquanto in-flight nao cancela', () => {
      const { ctrl, onCancelLoadOlder } = setup();
      ctrl.onScroll(500, 600); // dispara
      ctrl.onScroll(300, 600); // continua subindo
      ctrl.onScroll(100, 600);
      expect(onCancelLoadOlder).not.toHaveBeenCalled();
      expect(ctrl.savedScrollHeight()).toBe(5000);
    });

    it('apos cancelar, novo trigger eh permitido (passado o throttle)', () => {
      const { ctrl, onLoadOlder } = setup();
      ctrl.onScroll(100, 600);              // load #1
      ctrl.onScroll(800, 600);              // cancel (fora da zona)
      advance(300);                          // passa throttle
      ctrl.onScroll(50, 600);               // load #2
      expect(onLoadOlder).toHaveBeenCalledTimes(2);
    });
  });
});
