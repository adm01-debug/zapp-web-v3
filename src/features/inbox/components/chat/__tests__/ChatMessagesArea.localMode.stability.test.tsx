import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Message } from '@/types/chat';

/**
 * Estabilidade da UI no MODO LOCAL (sem onLoadOlder):
 *
 * Garante que ao atualizar a lista de mensagens (simulando merges entre
 * externalMsgs e localMsgs):
 *   1. Nenhuma UI/badge de cancelamento aparece em momento algum
 *      (sem flicker entre renders).
 *   2. Nenhum listener de scroll/wheel/touch e (re)registrado no container
 *      em re-renders subsequentes — confirma ausencia de churn de efeitos.
 *   3. O componente memoizado nao re-renderiza quando os props nao mudam
 *      por referencia (controle: passar mesmo array novamente).
 *   4. onCancelLoadOlder permanece NUNCA chamado durante a sequencia.
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

const hoisted = vi.hoisted(() => ({ count: 0 }));
vi.mock('../MessageBubble', () => ({
  MessageBubble: ({ message }: { message: { id: string } }) => {
    hoisted.count++;
    return <div data-testid={`bubble-${message.id}`} />;
  },
}));
vi.mock('../TypingIndicator', () => ({ TypingIndicator: () => null }));
vi.mock('./ChatWatermark', () => ({ ChatWatermark: () => null }));
vi.mock('@/components/ui/motion', () => ({
  motion: { div: (p: any) => <div {...p} />, span: (p: any) => <span {...p} /> },
  StaggeredList: ({ children }: any) => <div>{children}</div>,
  StaggeredItem: ({ children }: any) => <div>{children}</div>,
}));

import { ChatMessagesArea } from '@/features/inbox/components/chat/ChatMessagesArea';

function makeMsg(id: string, content = 'oi'): Message {
  return {
    id,
    content,
    timestamp: new Date('2026-04-01T10:00:00Z'),
    fromMe: false,
    status: 'delivered',
    type: 'text',
  } as unknown as Message;
}

function baseProps(messages: Message[], onCancelLoadOlder?: () => void) {
  return {
    messages,
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
    ...(onCancelLoadOlder ? { onCancelLoadOlder } : {}),
  };
}

describe('ChatMessagesArea — estabilidade no modo local', () => {
  let addSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    hoisted.count = 0;
    addSpy = vi.spyOn(HTMLDivElement.prototype, 'addEventListener');
  });
  afterEach(() => {
    addSpy.mockRestore();
    vi.clearAllMocks();
  });

  function countContainerListeners(scrollDiv: HTMLElement, evt: string) {
    return addSpy.mock.calls
      .filter((_c, i) => addSpy.mock.instances[i] === scrollDiv && (_c[0] as string) === evt)
      .length;
  }

  it('updates sucessivos de messages nao introduzem listeners nem badge de cancelamento', () => {
    const onCancelLoadOlder = vi.fn();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    // Simula externalMsgs iniciais
    let messages: Message[] = [makeMsg('m1'), makeMsg('m2')];
    const props = baseProps(messages, onCancelLoadOlder);
    const { container, rerender, queryByTestId, queryByText } = render(
      <QueryClientProvider client={client}>
        <ChatMessagesArea {...props} />
      </QueryClientProvider>,
    );

    const scrollDiv = container.querySelector('[role="log"]') as HTMLElement;
    expect(scrollDiv).toBeTruthy();

    const initialScrollListeners = countContainerListeners(scrollDiv, 'scroll');
    const initialWheelListeners = countContainerListeners(scrollDiv, 'wheel');
    expect(initialScrollListeners).toBe(0);
    expect(initialWheelListeners).toBe(0);

    // Simula chegada de localMsg (otimista) -> nova referencia de array
    const sequence: Message[][] = [
      [...messages, makeMsg('m3', 'enviando...')],
      // troca otimista por mensagem confirmada (mesmo id, novo objeto)
      [makeMsg('m1'), makeMsg('m2'), makeMsg('m3-confirmed', 'enviado')],
      // chega externalMsg adicional
      [makeMsg('m1'), makeMsg('m2'), makeMsg('m3-confirmed', 'enviado'), makeMsg('m4')],
      // re-merge simulando dedupe (nova ref, conteudo igual)
      [makeMsg('m1'), makeMsg('m2'), makeMsg('m3-confirmed', 'enviado'), makeMsg('m4')],
    ];

    for (const next of sequence) {
      messages = next;
      act(() => {
        rerender(
          <QueryClientProvider client={client}>
            <ChatMessagesArea {...baseProps(messages, onCancelLoadOlder)} />
          </QueryClientProvider>,
        );
      });
      // Em nenhum momento o badge de cancelamento aparece
      expect(queryByTestId('load-older-cancelled')).toBeNull();
      expect(queryByTestId('load-older-retry')).toBeNull();
      expect(queryByText(/Carregamento cancelado/i)).toBeNull();
      expect(queryByText(/Carregamento interrompido/i)).toBeNull();
    }

    // Listeners de scroll/wheel continuam zerados — sem churn de efeitos.
    expect(countContainerListeners(scrollDiv, 'scroll')).toBe(0);
    expect(countContainerListeners(scrollDiv, 'wheel')).toBe(0);
    expect(countContainerListeners(scrollDiv, 'touchstart')).toBe(0);
    expect(countContainerListeners(scrollDiv, 'touchmove')).toBe(0);

    // onCancelLoadOlder nunca foi acionado durante toda a sequencia.
    expect(onCancelLoadOlder).not.toHaveBeenCalled();

    // Metrica de cancelamento nunca foi registrada.
    expect(metrics.recordLoadOlderCancelled).not.toHaveBeenCalled();
    expect(metrics.recordLoadOlderStarted).not.toHaveBeenCalled();
  });

  it('rerender com a MESMA referencia de messages nao re-renderiza bubbles (memo estavel)', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const stableMessages: Message[] = [makeMsg('a'), makeMsg('b'), makeMsg('c')];
    const props = baseProps(stableMessages);

    const { rerender } = render(
      <QueryClientProvider client={client}>
        <ChatMessagesArea {...props} />
      </QueryClientProvider>,
    );
    const after1 = hoisted.count;
    expect(after1).toBe(3);

    // Mesmo objeto de props (mesmas refs) — memo deve barrar re-render.
    rerender(
      <QueryClientProvider client={client}>
        <ChatMessagesArea {...props} />
      </QueryClientProvider>,
    );
    expect(hoisted.count).toBe(after1);
  });

  it('toggle de isContactTyping nao re-monta o container nem cria listeners de scroll', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const messages: Message[] = [makeMsg('x')];
    const { container, rerender } = render(
      <QueryClientProvider client={client}>
        <ChatMessagesArea {...baseProps(messages)} />
      </QueryClientProvider>,
    );
    const scrollDiv = container.querySelector('[role="log"]') as HTMLElement;
    const before = countContainerListeners(scrollDiv, 'scroll');

    for (const typing of [true, false, true, false]) {
      rerender(
        <QueryClientProvider client={client}>
          <ChatMessagesArea {...baseProps(messages)} isContactTyping={typing} typingUserName="X" />
        </QueryClientProvider>,
      );
    }
    expect(countContainerListeners(scrollDiv, 'scroll')).toBe(before);
    expect(countContainerListeners(scrollDiv, 'scroll')).toBe(0);
  });
});
