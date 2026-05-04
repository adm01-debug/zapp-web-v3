import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MessageList } from '../MessageList';

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

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

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

describe('Chat Integration - Flow Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMessages.mockReturnValue({
      messages: [],
      loading: false,
      loadingMore: false,
      hasMore: false,
      loadMore: vi.fn(),
      toggleStar: vi.fn(),
      toggleImportant: vi.fn(),
    });
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
    const scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

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
    expect(scrollIntoViewMock).toHaveBeenCalled();
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
    expect(screen.getByText(/Enviando.../i)).toBeInTheDocument();
  });
});
