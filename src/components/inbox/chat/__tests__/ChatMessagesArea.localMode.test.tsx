import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Message } from '@/types/chat';

/**
 * "Modo local" do ChatMessagesArea = sem prop `onLoadOlder`.
 *
 * Contrato verificado neste arquivo:
 *   1. Nenhum listener de scroll/wheel/touch e registrado no container.
 *   2. A UI de carregamento/cancelamento (badge "Carregamento cancelado",
 *      spinner "Carregando mensagens anteriores…", "Inicio da conversa",
 *      botao "Tentar carregar de novo") nao e renderizada.
 *   3. `onCancelLoadOlder`, mesmo se passado por engano, NUNCA e chamado —
 *      pois o efeito que faria a chamada nao roda sem `onLoadOlder`.
 */

// ---- Mocks pesados/irrelevantes ao foco do teste -------------------------
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ update: () => ({ eq: () => Promise.resolve({}) }) }) },
}));
vi.mock('@/lib/logger', () => ({
  getLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));
vi.mock('../loadOlderMetrics', () => ({
  recordLoadOlderStarted: vi.fn(() => Date.now()),
  recordLoadOlderCancelled: vi.fn(),
  recordLoadOlderCompleted: vi.fn(),
}));
vi.mock('../MessageBubble', () => ({ MessageBubble: () => null }));
vi.mock('../TypingIndicator', () => ({ TypingIndicator: () => null }));
vi.mock('../ChatWatermark', () => ({ ChatWatermark: () => null }));
vi.mock('@/components/ui/motion', () => ({
  motion: { div: (p: any) => <div {...p} />, span: (p: any) => <span {...p} /> },
  StaggeredList: ({ children }: any) => <div>{children}</div>,
  StaggeredItem: ({ children }: any) => <div>{children}</div>,
}));

const { ChatMessagesArea } = await import('../ChatMessagesArea');

function baseProps() {
  return {
    messages: [] as Message[],
    isContactTyping: false,
    typingUserName: '',
    ttsLoading: false,
    ttsPlaying: false,
    ttsMessageId: null,
    contactJid: 'jid-1',
    onSpeak: vi.fn(),
    onStop: vi.fn(),
    onReply: vi.fn(),
    onForward: vi.fn(),
    onCopy: vi.fn(),
    onScrollToMessage: vi.fn(),
    onInteractiveButtonClick: vi.fn(),
  };
}

function renderArea(extra: Record<string, unknown> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ChatMessagesArea {...baseProps()} {...extra} />
    </QueryClientProvider>,
  );
}

describe('ChatMessagesArea — modo local (sem onLoadOlder)', () => {
  let addSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Espionamos a chamada no proprio prototype, mas filtramos pelo target
    // (this) para considerar somente o container do chat (role="log").
    addSpy = vi.spyOn(HTMLDivElement.prototype, 'addEventListener');
  });
  afterEach(() => {
    addSpy.mockRestore();
    vi.clearAllMocks();
  });


  it('nao registra listeners de scroll/wheel/touch no container', () => {
    const { container } = renderArea({});
    const scrollDiv = container.querySelector('[role="log"]') as HTMLElement;
    // Filtra apenas chamadas onde o "this" foi o container do chat.
    const eventsOnContainer = addSpy.mock.calls
      .filter((_call, i) => addSpy.mock.instances[i] === scrollDiv)
      .map((c) => c[0] as string);
    expect(eventsOnContainer).not.toContain('scroll');
    expect(eventsOnContainer).not.toContain('wheel');
    expect(eventsOnContainer).not.toContain('touchstart');
    expect(eventsOnContainer).not.toContain('touchmove');
  });

  it('nao renderiza nenhuma UI de carregamento/cancelamento (com lista vazia, tampouco fallback)', () => {
    renderArea({});
    expect(screen.queryByTestId('load-older-cancelled')).toBeNull();
    expect(screen.queryByTestId('load-older-retry')).toBeNull();
    expect(screen.queryByText(/Carregando mensagens anteriores/i)).toBeNull();
    expect(screen.queryByText(/Carregamento cancelado/i)).toBeNull();
    expect(screen.queryByText(/Carregamento interrompido/i)).toBeNull();
    // Lista vazia: nem o fallback "Inicio da conversa" do modo local aparece.
    expect(screen.queryByTestId('chat-local-mode-top')).toBeNull();
    expect(screen.queryByText(/Inicio da conversa|Início da conversa/)).toBeNull();
  });

  it('com mensagens, exibe APENAS o fallback estatico "Inicio da conversa" do modo local', () => {
    const messages = [
      {
        id: 'm1', content: 'oi', timestamp: new Date('2026-04-01T10:00:00Z'),
        fromMe: false, status: 'delivered', type: 'text',
      },
    ] as unknown as Message[];
    renderArea({ messages });

    // Fallback estatico presente, com marcador semantico data-mode="local".
    const topEl = screen.getByTestId('chat-local-mode-top');
    expect(topEl).toBeTruthy();
    expect(topEl.getAttribute('data-mode')).toBe('local');
    expect(topEl.textContent ?? '').toMatch(/Início da conversa/);

    // Garantia explicita: NENHUM indicador de carregamento/cancelamento.
    expect(screen.queryByTestId('load-older-cancelled')).toBeNull();
    expect(screen.queryByTestId('load-older-retry')).toBeNull();
    expect(screen.queryByText(/Carregando mensagens anteriores/i)).toBeNull();
    expect(screen.queryByText(/Carregamento cancelado/i)).toBeNull();
    expect(screen.queryByText(/Carregamento interrompido/i)).toBeNull();
    // Sem aria-live no fallback (nao e atualizacao dinamica).
    expect(topEl.getAttribute('aria-live')).toBeNull();
  });

  it('disparar scroll programatico no container nao chama onCancelLoadOlder', () => {
    const onCancelLoadOlder = vi.fn();
    const { container } = renderArea({ onCancelLoadOlder });
    const scrollDiv = container.querySelector('[role="log"]') as HTMLDivElement;
    expect(scrollDiv).toBeTruthy();
    // Mesmo simulando movimento brusco, sem onLoadOlder o efeito nao roda.
    act(() => {
      scrollDiv.dispatchEvent(new Event('scroll'));
      scrollDiv.dispatchEvent(new Event('wheel'));
    });
    expect(onCancelLoadOlder).not.toHaveBeenCalled();
  });

  it('trocar de contato com onCancelLoadOlder presente nao dispara cancel', () => {
    const onCancelLoadOlder = vi.fn();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const props1 = { ...baseProps(), contactJid: 'jid-1', onCancelLoadOlder };
    const props2 = { ...baseProps(), contactJid: 'jid-2', onCancelLoadOlder };
    const { rerender } = render(
      <QueryClientProvider client={client}>
        <ChatMessagesArea {...props1} />
      </QueryClientProvider>,
    );
    rerender(
      <QueryClientProvider client={client}>
        <ChatMessagesArea {...props2} />
      </QueryClientProvider>,
    );
    expect(onCancelLoadOlder).not.toHaveBeenCalled();
  });

  it('controle: com onLoadOlder, listeners SAO registrados (sanity check)', () => {
    const { container } = renderArea({ onLoadOlder: vi.fn(), onCancelLoadOlder: vi.fn() });
    const scrollDiv = container.querySelector('[role="log"]') as HTMLElement;
    const eventsOnContainer = addSpy.mock.calls
      .filter((_call, i) => addSpy.mock.instances[i] === scrollDiv)
      .map((c) => c[0] as string);
    expect(eventsOnContainer).toContain('scroll');
    expect(eventsOnContainer).toContain('wheel');
  });
});
