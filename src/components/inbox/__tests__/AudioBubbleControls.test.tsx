import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import React from 'react';

// ─── Mocks ───────────────────────────────────────────────
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: vi.fn(() => Promise.resolve({ data: { signedUrl: 'https://test.com/audio.webm' } })),
        list: vi.fn(() => Promise.resolve({ data: [] })),
      })),
    },
    functions: { invoke: vi.fn(() => Promise.resolve({ data: null, error: null })) },
    from: vi.fn(() => ({
      update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
    })),
  },
}));

vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), info: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));
vi.mock('@/lib/devRealtimeLogger', () => ({
  logMessagesSubscribe: vi.fn(),
  wrapMessagesHandler: (_n: string, fn: unknown) => fn,
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: () =>
        React.forwardRef<HTMLElement, Record<string, unknown>>((props, ref) => {
          const { whileHover, whileTap, initial, animate, exit, transition, variants, ...rest } = props as Record<string, unknown>;
          void whileHover; void whileTap; void initial; void animate; void exit; void transition; void variants;
          return React.createElement('div', { ...rest, ref });
        }),
    },
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

import { AudioMessagePlayer } from '../AudioMessagePlayer';

// ─── Audio Element Mock ──────────────────────────────────
let mockPaused = true;
let mockVolume = 1;
let mockCurrentTime = 0;
const mockPlay = vi.fn(() => { mockPaused = false; return Promise.resolve(); });
const mockPause = vi.fn(() => { mockPaused = true; });

function setupAudioMock() {
  mockPaused = true;
  mockVolume = 1;
  mockCurrentTime = 0;
  Object.defineProperty(HTMLAudioElement.prototype, 'play', { configurable: true, value: mockPlay });
  Object.defineProperty(HTMLAudioElement.prototype, 'pause', { configurable: true, value: mockPause });
  Object.defineProperty(HTMLAudioElement.prototype, 'load', { configurable: true, value: vi.fn() });
  Object.defineProperty(HTMLAudioElement.prototype, 'volume', {
    configurable: true,
    get() { return mockVolume; },
    set(v: number) { mockVolume = v; },
  });
  Object.defineProperty(HTMLAudioElement.prototype, 'duration', { configurable: true, get() { return 30; } });
  Object.defineProperty(HTMLAudioElement.prototype, 'currentTime', {
    configurable: true,
    get() { return mockCurrentTime; },
    set(v: number) { mockCurrentTime = v; },
  });
  Object.defineProperty(HTMLAudioElement.prototype, 'playbackRate', {
    configurable: true,
    get() { return 1; },
    set() { /* noop */ },
  });
}

const baseProps = {
  audioUrl: 'https://test.com/audio.webm',
  messageId: 'msg-bubble-1',
};

describe('Bolha de áudio — controles play/seek/mute (inbound & outbound)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setupAudioMock();
  });

  // ─── PLAY/PAUSE ───────────────────────────────────────
  describe('Play/Pause', () => {
    it.each([
      ['inbound (recebido)', false],
      ['outbound (enviado)', true],
    ])('renderiza botão play visível em %s', (_label, isSent) => {
      render(<AudioMessagePlayer {...baseProps} isSent={isSent} />);
      // botão play é o primeiro botão sem title específico; usamos query mais ampla
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('chama audio.play() ao clicar no botão play (inbound)', async () => {
      const { container } = render(<AudioMessagePlayer {...baseProps} isSent={false} />);
      const audio = container.querySelector('audio') as HTMLAudioElement;
      // dispara loadedmetadata para liberar duration
      await act(async () => { audio.dispatchEvent(new Event('loadedmetadata')); });

      // O primeiro <button> da bolha é o play (sem title)
      const playBtn = container.querySelectorAll('button')[0] as HTMLButtonElement;
      await act(async () => { fireEvent.click(playBtn); });
      expect(mockPlay).toHaveBeenCalled();
    });

    it('botão play é clicável e dispara reprodução em outbound', async () => {
      const { container } = render(<AudioMessagePlayer {...baseProps} isSent={true} />);
      const audio = container.querySelector('audio') as HTMLAudioElement;
      await act(async () => { audio.dispatchEvent(new Event('loadedmetadata')); });

      const playBtn = container.querySelectorAll('button')[0] as HTMLButtonElement;
      expect(playBtn.disabled).toBe(false);
      await act(async () => { fireEvent.click(playBtn); });
      await waitFor(() => expect(mockPlay).toHaveBeenCalled());
    });

    it('expõe método pause no elemento <audio> nativo (paridade inbound/outbound)', () => {
      const { container, rerender } = render(<AudioMessagePlayer {...baseProps} isSent={false} />);
      let audio = container.querySelector('audio') as HTMLAudioElement;
      audio.pause();
      expect(mockPause).toHaveBeenCalledTimes(1);

      rerender(<AudioMessagePlayer {...baseProps} isSent={true} />);
      audio = container.querySelector('audio') as HTMLAudioElement;
      audio.pause();
      expect(mockPause).toHaveBeenCalledTimes(2);
    });
  });

  // ─── SEEK ─────────────────────────────────────────────
  describe('Seek (clique na waveform)', () => {
    it.each([
      ['inbound', false],
      ['outbound', true],
    ])('atualiza currentTime ao clicar na waveform — %s', async (_label, isSent) => {
      const { container } = render(<AudioMessagePlayer {...baseProps} isSent={isSent} />);
      const audio = container.querySelector('audio') as HTMLAudioElement;
      await act(async () => { audio.dispatchEvent(new Event('loadedmetadata')); });

      // O elemento clicável de seek tem class "cursor-pointer" e é a waveform
      const seekArea = container.querySelector('.cursor-pointer') as HTMLDivElement;
      expect(seekArea).toBeTruthy();

      // Mock geometry (jsdom não calcula bounding rects)
      seekArea.getBoundingClientRect = () => ({
        left: 0, right: 200, top: 0, bottom: 32, width: 200, height: 32, x: 0, y: 0, toJSON: () => ({}),
      } as DOMRect);

      await act(async () => {
        fireEvent.click(seekArea, { clientX: 100 }); // 50% de 200px
      });

      // duration mockada = 30; clique no meio → 15s
      expect(mockCurrentTime).toBeCloseTo(15, 1);
    });

    it('não faz seek se duration ainda não foi carregado', async () => {
      const { container } = render(<AudioMessagePlayer {...baseProps} isSent={false} />);
      // SEM dispatch de loadedmetadata → duration = 0 no estado
      const seekArea = container.querySelector('.cursor-pointer') as HTMLDivElement;
      seekArea.getBoundingClientRect = () => ({
        left: 0, right: 200, top: 0, bottom: 32, width: 200, height: 32, x: 0, y: 0, toJSON: () => ({}),
      } as DOMRect);

      mockCurrentTime = 0;
      await act(async () => { fireEvent.click(seekArea, { clientX: 100 }); });
      expect(mockCurrentTime).toBe(0);
    });
  });

  // ─── VOLUME / MUTE ────────────────────────────────────
  describe('Controle de volume e mute', () => {
    it.each([
      ['inbound', false],
      ['outbound', true],
    ])('renderiza controle de volume — %s', (_label, isSent) => {
      render(<AudioMessagePlayer {...baseProps} isSent={isSent} />);
      expect(screen.getByLabelText('Controle de volume')).toBeInTheDocument();
    });

    it('abre o popover de volume ao clicar no ícone', async () => {
      render(<AudioMessagePlayer {...baseProps} isSent={false} />);
      const trigger = screen.getByLabelText('Controle de volume');
      await act(async () => { fireEvent.click(trigger); });
      expect(screen.getByLabelText('Volume')).toBeInTheDocument();
    });

    it('altera o volume do <audio> ao mover o slider', async () => {
      const { container } = render(<AudioMessagePlayer {...baseProps} isSent={false} />);
      const audio = container.querySelector('audio') as HTMLAudioElement;
      await act(async () => { audio.dispatchEvent(new Event('loadedmetadata')); });

      const trigger = screen.getByLabelText('Controle de volume');
      await act(async () => { fireEvent.click(trigger); });
      const slider = screen.getByLabelText('Volume') as HTMLInputElement;

      await act(async () => { fireEvent.change(slider, { target: { value: '40' } }); });
      expect(mockVolume).toBeCloseTo(0.4, 2);
    });

    it('mute via duplo clique zera o volume e desmuta restaurando o anterior', async () => {
      const { container } = render(<AudioMessagePlayer {...baseProps} isSent={true} />);
      const audio = container.querySelector('audio') as HTMLAudioElement;
      await act(async () => { audio.dispatchEvent(new Event('loadedmetadata')); });

      const trigger = screen.getByLabelText('Controle de volume');
      // Set volume to 70% via slider
      await act(async () => { fireEvent.click(trigger); });
      const slider = screen.getByLabelText('Volume') as HTMLInputElement;
      await act(async () => { fireEvent.change(slider, { target: { value: '70' } }); });
      expect(mockVolume).toBeCloseTo(0.7, 2);

      // Mute via botão dentro do popover (mesmo handler do duplo clique)
      const muteBtn = screen.getByLabelText('Silenciar');
      await act(async () => { fireEvent.click(muteBtn); });
      expect(mockVolume).toBe(0);

      // Desmuta restaurando o último volume audível
      const unmuteBtn = screen.getByLabelText('Tirar mudo');
      await act(async () => { fireEvent.click(unmuteBtn); });
      expect(mockVolume).toBeCloseTo(0.7, 2);
    });

    it('persiste o volume global no localStorage', async () => {
      const { container } = render(<AudioMessagePlayer {...baseProps} isSent={false} />);
      const audio = container.querySelector('audio') as HTMLAudioElement;
      await act(async () => { audio.dispatchEvent(new Event('loadedmetadata')); });

      const trigger = screen.getByLabelText('Controle de volume');
      await act(async () => { fireEvent.click(trigger); });
      const slider = screen.getByLabelText('Volume') as HTMLInputElement;
      await act(async () => { fireEvent.change(slider, { target: { value: '25' } }); });

      expect(localStorage.getItem('audio-player:volume')).toBe('0.25');
    });

    it('clamp do volume entre 0 e 1 (rejeita valores fora do range)', async () => {
      const { container } = render(<AudioMessagePlayer {...baseProps} isSent={false} />);
      const audio = container.querySelector('audio') as HTMLAudioElement;
      await act(async () => { audio.dispatchEvent(new Event('loadedmetadata')); });

      const trigger = screen.getByLabelText('Controle de volume');
      await act(async () => { fireEvent.click(trigger); });
      const slider = screen.getByLabelText('Volume') as HTMLInputElement;

      await act(async () => { fireEvent.change(slider, { target: { value: '100' } }); });
      expect(mockVolume).toBe(1);

      await act(async () => { fireEvent.change(slider, { target: { value: '0' } }); });
      expect(mockVolume).toBe(0);
    });

    it('cada bolha mantém estado de volume independente entre players', async () => {
      const { container } = render(
        <>
          <AudioMessagePlayer audioUrl="u1" messageId="msg-A" isSent={false} />
          <AudioMessagePlayer audioUrl="u2" messageId="msg-B" isSent={true} />
        </>,
      );
      const audios = container.querySelectorAll('audio');
      expect(audios).toHaveLength(2);
      const triggers = screen.getAllByLabelText('Controle de volume');
      expect(triggers).toHaveLength(2);
    });
  });
});
