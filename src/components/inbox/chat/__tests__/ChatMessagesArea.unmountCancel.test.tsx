import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Message } from '@/types/chat';

/**
 * Cobertura de unmount/cancel no MODO LOCAL (sem `onLoadOlder`):
 *
 * Garante que ao desmontar o componente — incluindo cenarios apos o usuario
 * rolar o container — nenhum efeito colateral de `onCancelLoadOlder` ocorre:
 *   1. Desmontar imediatamente nao chama onCancelLoadOlder nem registra
 *      metricas de cancelamento.
 *   2. Rolar e depois desmontar continua sem chamar onCancelLoadOlder.
 *   3. Rolar, trocar de contato e desmontar tambem nao dispara cancel.
 *   4. Sanity check: no MODO EXTERNO com fetch em andamento, o unmount
 *      DEVE chamar onCancelLoadOlder com reason='unmount'.
 */

vi.mock('@/integrations/supabase/client', () => {
  const channel = {
    on: () => channel,
    subscribe: () => channel,
    unsubscribe: () => Promise.resolve('ok'),
  };
  return {
    supabase: {
      from: () => ({
        update: () => ({ eq: () => Promise.resolve({}) }),
        select: () => ({ eq: () => ({ in: () => Promise.resolve({ data: [], error: null }) }) }),
      }),
      channel: () => channel,
      removeChannel: () => Promise.resolve('ok'),
    },
  };
});
vi.mock('@/lib/logger', () => ({
  getLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));
const metrics = {
  recordLoadOlderStarted: vi.fn(() => Date.now()),
  recordLoadOlderCancelled: vi.fn(),
  recordLoadOlderCompleted: vi.fn(),
};
vi.mock('./loadOlderMetrics', () => metrics);
vi.mock('../MessageBubble', () => ({
  MessageBubble: ({ message }: { message: { id: string } }) => (
    <div data-testid={`bubble-${message.id}`} />
  ),
}));
vi.mock('../TypingIndicator', () => ({ TypingIndicator: () => null }));
vi.mock('./ChatWatermark', () => ({ ChatWatermark: () => null }));
vi.mock('@/components/ui/motion', () => ({
  motion: { div: (p: any) => <div {...p} />, span: (p: any) => <span {...p} /> },
  StaggeredList: ({ children }: any) => <div>{children}</div>,
  StaggeredItem: ({ children }: any) => <div>{children}</div>,
}));

import { ChatMessagesArea } from '../ChatMessagesArea';

function makeMsg(id: string): Message {
  return {
    id,
    content: 'oi',
    timestamp: new Date('2026-04-01T10:00:00Z'),
    fromMe: false,
    status: 'delivered',
    type: 'text',
  } as unknown as Message;
}

function baseProps(extra: Record<string, unknown> = {}) {
  return {
    messages: [makeMsg('m1'), makeMsg('m2')] as Message[],
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
    ...extra,
  };
}

function renderArea(extra: Record<string, unknown> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const utils = render(
    <QueryClientProvider client={client}>
      <ChatMessagesArea {...baseProps(extra)} />
    </QueryClientProvider>,
  );
  return { ...utils, client };
}

describe('ChatMessagesArea — unmount/cancel no modo local', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('unmount imediato (modo local) nao chama onCancelLoadOlder nem registra metrica', () => {
    const onCancelLoadOlder = vi.fn();
    const { unmount } = renderArea({ onCancelLoadOlder });
    act(() => { unmount(); });
    expect(onCancelLoadOlder).not.toHaveBeenCalled();
    expect(metrics.recordLoadOlderCancelled).not.toHaveBeenCalled();
    expect(metrics.recordLoadOlderStarted).not.toHaveBeenCalled();
  });

  it('rolagem seguida de unmount (modo local) nao chama onCancelLoadOlder', () => {
    const onCancelLoadOlder = vi.fn();
    const { container, unmount } = renderArea({ onCancelLoadOlder });
    const scrollDiv = container.querySelector('[role="log"]') as HTMLDivElement;
    expect(scrollDiv).toBeTruthy();
    // Mesmo simulando rolagens variadas, sem onLoadOlder o efeito nao roda
    // — entao nao ha listeners para responder e nem cleanup que cancele.
    act(() => {
      scrollDiv.scrollTop = 0;
      scrollDiv.dispatchEvent(new Event('scroll'));
      scrollDiv.scrollTop = 800;
      scrollDiv.dispatchEvent(new Event('scroll'));
      scrollDiv.dispatchEvent(new Event('wheel'));
      scrollDiv.dispatchEvent(new Event('touchstart'));
      scrollDiv.dispatchEvent(new Event('touchmove'));
    });
    act(() => { unmount(); });
    expect(onCancelLoadOlder).not.toHaveBeenCalled();
    expect(metrics.recordLoadOlderCancelled).not.toHaveBeenCalled();
  });

  it('rolagem + troca de contato + unmount (modo local) nao dispara cancel', () => {
    const onCancelLoadOlder = vi.fn();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container, rerender, unmount } = render(
      <QueryClientProvider client={client}>
        <ChatMessagesArea {...baseProps({ contactJid: 'jid-1', onCancelLoadOlder })} />
      </QueryClientProvider>,
    );
    const scrollDiv = container.querySelector('[role="log"]') as HTMLDivElement;
    act(() => {
      scrollDiv.scrollTop = 500;
      scrollDiv.dispatchEvent(new Event('scroll'));
    });
    // Troca de contato (com onCancelLoadOlder ainda presente, mas em modo local)
    rerender(
      <QueryClientProvider client={client}>
        <ChatMessagesArea {...baseProps({ contactJid: 'jid-2', onCancelLoadOlder })} />
      </QueryClientProvider>,
    );
    act(() => {
      scrollDiv.scrollTop = 1200;
      scrollDiv.dispatchEvent(new Event('scroll'));
    });
    act(() => { unmount(); });
    expect(onCancelLoadOlder).not.toHaveBeenCalled();
    expect(metrics.recordLoadOlderCancelled).not.toHaveBeenCalled();
  });

  it('sanity (modo externo): unmount com fetch em andamento DISPARA cancel com reason=unmount', async () => {
    // Promise nunca resolvida -> simula loadOlder em andamento ate o unmount.
    let resolveLoad: (() => void) | null = null;
    const onLoadOlder = vi.fn(
      () => new Promise<void>((res) => { resolveLoad = res; }),
    );
    const onCancelLoadOlder = vi.fn();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container, unmount } = render(
      <QueryClientProvider client={client}>
        <ChatMessagesArea
          {...baseProps({
            onLoadOlder,
            onCancelLoadOlder,
            hasMoreOlder: true,
            loadingOlder: false,
          })}
        />
      </QueryClientProvider>,
    );
    const scrollDiv = container.querySelector('[role="log"]') as HTMLDivElement;
    // Forca scrollTop=0 e dispara wheel para garantir trigger imediato.
    Object.defineProperty(scrollDiv, 'clientHeight', { value: 800, configurable: true });
    Object.defineProperty(scrollDiv, 'scrollHeight', { value: 5000, configurable: true });
    scrollDiv.scrollTop = 0;
    act(() => {
      const wheel = new Event('wheel') as WheelEvent;
      Object.defineProperty(wheel, 'deltaY', { value: -100 });
      scrollDiv.dispatchEvent(wheel);
    });
    expect(onLoadOlder).toHaveBeenCalledTimes(1);

    act(() => { unmount(); });

    expect(onCancelLoadOlder).toHaveBeenCalledTimes(1);
    // Diagnostico: started deve ter sido chamado pela trigger inicial.
    expect(metrics.recordLoadOlderStarted).toHaveBeenCalled();
    expect(metrics.recordLoadOlderCancelled).toHaveBeenCalled();
    const cancelCalls = metrics.recordLoadOlderCancelled.mock.calls;
    const reasons = cancelCalls.map((c) => (c[1] as { reason?: string })?.reason);
    expect(reasons).toContain('unmount');

    // Resolve a promise pendente para limpar microtasks.
    resolveLoad?.();
  });
});
