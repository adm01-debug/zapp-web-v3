/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MessageList } from './MessageList';

// Mocking Supabase client to avoid localStorage issues in tests
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  },
}));

// Create a mock for useMessages
const mockUseMessages = vi.fn();
vi.mock('@/hooks/useMessages', () => ({
  useMessages: (jid: string) => mockUseMessages(jid),
}));

// Create a mock for useMessageQueue
const mockUseMessageQueue = vi.fn(() => ({
  pendingMessages: [],
  enqueueMessage: vi.fn(),
  retryMessage: vi.fn(),
}));
vi.mock('@/hooks/messaging/useMessageQueue', () => ({
  useMessageQueue: () => mockUseMessageQueue(),
}));

// Mock react-virtual
const mockScrollToIndex = vi.fn();
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: vi.fn(({ count }) => ({
    getVirtualItems: () => Array.from({ length: count }).map((_, index) => ({
      index,
      key: index,
      start: index * 100,
      size: 100,
    })),
    getTotalSize: () => count * 100,
    scrollToIndex: mockScrollToIndex,
    measureElement: vi.fn(),
  })),
}));

const mockUseContactTyping = vi.fn(() => false);
vi.mock('@/hooks/useContactTyping', () => ({
  useContactTyping: () => mockUseContactTyping(),
}));

describe('Chat Integration - Flow Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock behavior
    mockUseMessages.mockReturnValue({
      messages: [],
      loading: false,
      loadingMore: false,
      hasMore: false,
      loadMore: vi.fn(),
      toggleStar: vi.fn(),
      toggleImportant: vi.fn(),
    });

    // Mock scrollIntoView on prototype
    if (typeof window !== 'undefined') {
       window.HTMLElement.prototype.scrollIntoView = vi.fn();
    }
  });

  it('exibe estado vazio quando não há mensagens', () => {
    render(<MessageList remoteJid="test@jid" />);
    expect(screen.getByText(/Nenhuma mensagem nesta conversa/i)).toBeInTheDocument();
  });

  it('exibe mensagens carregadas do hook', () => {
    mockUseMessages.mockReturnValue({
      messages: [
        { id: '1', content: 'Olá!', created_at: new Date().toISOString(), from_me: false, message_id: 'm1' },
        { id: '2', content: 'Tudo bem?', created_at: new Date().toISOString(), from_me: true, message_id: 'm2' },
      ],
      loading: false,
      loadingMore: false,
      hasMore: false,
      loadMore: vi.fn(),
      toggleStar: vi.fn(),
      toggleImportant: vi.fn(),
    });

    render(<MessageList remoteJid="test@jid" />);
    expect(screen.getByText('Olá!')).toBeInTheDocument();
    expect(screen.getByText('Tudo bem?')).toBeInTheDocument();
  });

  it('mantém o scroll no fundo ao receber novas mensagens (auto-scroll)', () => {
    const { rerender } = render(<MessageList remoteJid="test@jid" />);
    
    // Simulate new messages
    mockUseMessages.mockReturnValue({
      messages: [{ id: '1', content: 'Nova!', created_at: new Date().toISOString(), from_me: false, message_id: 'm1' }],
      loading: false,
      loadingMore: false,
      hasMore: false,
      loadMore: vi.fn(),
      toggleStar: vi.fn(),
      toggleImportant: vi.fn(),
    });

    rerender(<MessageList remoteJid="test@jid" />);
    expect(mockScrollToIndex).toHaveBeenCalled();
  });

  it('mostra indicador de "Enviando..." para mensagens na fila', () => {
    mockUseMessageQueue.mockReturnValue({
      pendingMessages: [
        { id: 'p1', remote_jid: 'test@jid', content: 'Enviando agora', status: 'sending', timestamp: Date.now() }
      ],
      enqueueMessage: vi.fn(),
      retryMessage: vi.fn(),
    });

    render(<MessageList remoteJid="test@jid" />);
    expect(screen.getByText('Enviando agora')).toBeInTheDocument();
    expect(screen.getAllByText(/Enviando.../i)[0]).toBeInTheDocument();
  });

  it('exibe o indicador de "Digitando..." quando o contato está ativo', () => {
    mockUseContactTyping.mockReturnValue(true);
    render(<MessageList remoteJid="test@jid" />);
    expect(screen.getByText(/Digitando.../i)).toBeInTheDocument();
  });


  it('deve disparar loadMore quando o topo da lista se torna visível (carregamento incremental)', async () => {
    const loadMoreMock = vi.fn().mockResolvedValue(undefined);
    mockUseMessages.mockReturnValue({
      messages: Array.from({ length: 10 }).map((_, i) => ({
        id: `${i}`, content: `Mensagem ${i}`, created_at: new Date().toISOString(), from_me: false, message_id: `m${i}`
      })),
      loading: false,
      loadingMore: false,
      hasMore: true,
      loadMore: loadMoreMock,
      toggleStar: vi.fn(),
      toggleImportant: vi.fn(),
    });

    const { container } = render(<MessageList remoteJid="test@jid" />);
    
    // Find scroll container
    const scrollContainer = container.querySelector('.overflow-y-auto');
    if (!scrollContainer) throw new Error('Scroll container not found');

    // Mock scroll properties
    Object.defineProperty(scrollContainer, 'scrollTop', { value: 50, configurable: true });
    Object.defineProperty(scrollContainer, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(scrollContainer, 'clientHeight', { value: 500, configurable: true });

    // Trigger scroll
    fireEvent.scroll(scrollContainer);
    
    expect(loadMoreMock).toHaveBeenCalled();
  });
});

