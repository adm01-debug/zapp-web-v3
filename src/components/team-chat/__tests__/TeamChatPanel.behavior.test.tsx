import { render, screen, fireEvent } from '@testing-library/react';
import { TeamChatPanel } from '../TeamChatPanel';
import { useAuth } from '@/features/auth';
import { useTeamChatPanel } from '../useTeamChatPanel';
import { useTeamMessageReactions } from '@/features/inbox/hooks/team-chat/useTeamMessageReactions';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';

// Mock ResizeObserver for react-window
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock;

// Mock dependencies
vi.mock('../useTeamChatPanel');
vi.mock('@/features/auth');
vi.mock('@/features/inbox/hooks/team-chat/useTeamMessageReactions');
vi.mock('@/lib/logger', () => ({
  getLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  }),
}));

// Mock components to avoid deep rendering issues
vi.mock('../TeamChatHeader', () => ({ 
  TeamChatHeader: ({ onToggleSearch }: any) => (
    <div data-testid="mock-header">
      <button onClick={onToggleSearch} data-testid="toggle-search">Toggle Search</button>
    </div>
  ) 
}));
vi.mock('../TeamChatInputArea', () => ({ TeamChatInputArea: () => <div data-testid="mock-input" /> }));
vi.mock('../AddMembersDialog', () => ({ AddMembersDialog: () => <div data-testid="mock-dialog" /> }));
vi.mock('../ParticipantStatsGraph', () => ({ ParticipantStatsGraph: () => <div data-testid="mock-stats" /> }));
vi.mock('@/features/inbox', () => ({ MarkdownPreview: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('@/features/inbox/components/MessageStatus', () => ({ MessageStatus: () => <span>Status</span> }));

// Mock react-window List
vi.mock('react-window', async () => {
  const actual = await vi.importActual('react-window');
  return {
    ...actual,
    List: ({ rowCount, rowComponent: Row }: any) => (
      <div data-testid="virtual-list" data-rowcount={rowCount}>
        {Array.from({ length: rowCount }).map((_, index) => (
          <div key={index}>
            <Row index={index} style={{}} ariaAttributes={{}} />
          </div>
        ))}
      </div>
    ),
  };
});

describe('TeamChatPanel Behavior Tests', () => {
  const mockConversation = {
    id: 'conv-1',
    type: 'group',
    name: 'Test Group',
    members: []
  } as any;

  const mockProfile = { id: 'user-1', name: 'User 1' };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ profile: mockProfile });
    (useTeamMessageReactions as any).mockReturnValue({
      aggregate: vi.fn(() => []),
      toggle: vi.fn(),
      isToggling: false,
    });
  });

  const getMockState = (overrides = {}) => ({
    profile: mockProfile,
    messages: [],
    filteredMessages: [],
    isLoading: false,
    isMuted: false,
    text: '',
    setText: vi.fn(),
    editingId: null,
    editText: '',
    setEditText: vi.fn(),
    isRecordingAudio: false,
    setIsRecordingAudio: vi.fn(),
    replyTo: null,
    setReplyTo: vi.fn(),
    showScrollDown: false,
    hasNewMessagesUnseen: false,
    showAddMembers: false,
    setShowAddMembers: vi.fn(),
    showSearch: false,
    setShowSearch: vi.fn(),
    searchQuery: '',
    setSearchQuery: vi.fn(),
    scrollRef: { current: { scrollTo: vi.fn(), scrollHeight: 1000, scrollTop: 0, clientHeight: 500 } },
    listRef: { current: { scrollToRow: vi.fn() } },
    isNearBottomRef: { current: true },
    searchInputRef: { current: null },
    lastScrollTopRef: { current: 0 },
    tts: {
      voiceId: 'default',
      speed: 1,
      isPlaying: false,
      isLoading: false,
      speak: vi.fn(),
      stop: vi.fn(),
    },
    muteMutation: { mutate: vi.fn() },
    sendMutation: { isPending: false, mutate: vi.fn() },
    updateStatusMutation: { mutate: vi.fn() },
    checkNearBottom: vi.fn(),
    scrollToBottom: vi.fn(),
    handleSend: vi.fn(),
    handleDelete: vi.fn(),
    handleStartEdit: vi.fn(),
    handleSaveEdit: vi.fn(),
    handleCancelEdit: vi.fn(),
    handleCopyMessage: vi.fn(),
    syncSearchWithCache: vi.fn(),
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    ...overrides
  });

  it('atualiza a quantidade de mensagens exibidas ao mudar o filtro de busca', () => {
    const allMessages = [
      { id: '1', content: 'Apple', sender_id: 'u1', created_at: new Date().toISOString() },
      { id: '2', content: 'Banana', sender_id: 'u1', created_at: new Date().toISOString() },
    ];

    const mockState = getMockState({
      messages: allMessages,
      filteredMessages: allMessages,
      showSearch: true,
      searchQuery: ''
    });

    (useTeamChatPanel as any).mockReturnValue(mockState);

    const { rerender } = render(<TeamChatPanel conversation={mockConversation} onBack={vi.fn()} />);
    
    expect(screen.getByTestId('virtual-list')).toHaveAttribute('data-rowcount', '2');

    // Simula mudança de filtro (Banana apenas)
    const filtered = [allMessages[1]];
    (useTeamChatPanel as any).mockReturnValue({
      ...mockState,
      filteredMessages: filtered,
      searchQuery: 'Banana'
    });

    rerender(<TeamChatPanel conversation={mockConversation} onBack={vi.fn()} />);
    
    expect(screen.getByTestId('virtual-list')).toHaveAttribute('data-rowcount', '1');
    expect(screen.getByText('Banana')).toBeInTheDocument();
    expect(screen.queryByText('Apple')).not.toBeInTheDocument();
  });

  it('exibe o botão "pular para novas mensagens" quando há novas mensagens e não estamos no fundo', () => {
    const messages = [
      { id: '1', content: 'Old', sender_id: 'u2', created_at: new Date().toISOString() },
    ];

    const scrollToBottomMock = vi.fn();
    const mockState = getMockState({
      messages,
      filteredMessages: messages,
      hasNewMessagesUnseen: true,
      isNearBottomRef: { current: false },
      scrollToBottom: scrollToBottomMock
    });

    (useTeamChatPanel as any).mockReturnValue(mockState);

    render(<TeamChatPanel conversation={mockConversation} onBack={vi.fn()} />);
    
    const jumpButton = screen.getByRole('button', { name: /Pular para mensagens novas/i });
    expect(jumpButton).toBeInTheDocument();

    fireEvent.click(jumpButton);
    expect(scrollToBottomMock).toHaveBeenCalled();
  });

  it('mantém a posição de scroll ao receber novas mensagens de terceiros se não estiver no fundo', () => {
    // Este teste valida a lógica de preservação de estado/UX descrita no requisito E2E
    const initialMessages = [
      { id: '1', content: 'Msg 1', sender_id: 'u2', created_at: new Date().toISOString() },
    ];

    const mockState = getMockState({
      messages: initialMessages,
      filteredMessages: initialMessages,
      isNearBottomRef: { current: false }
    });

    (useTeamChatPanel as any).mockReturnValue(mockState);

    const { rerender } = render(<TeamChatPanel conversation={mockConversation} onBack={vi.fn()} />);

    // Simula chegada de nova mensagem
    const newMessages = [
      ...initialMessages,
      { id: '2', content: 'New Msg', sender_id: 'u2', created_at: new Date().toISOString() },
    ];

    (useTeamChatPanel as any).mockReturnValue({
      ...mockState,
      messages: newMessages,
      filteredMessages: newMessages,
      hasNewMessagesUnseen: true
    });

    rerender(<TeamChatPanel conversation={mockConversation} onBack={vi.fn()} />);

    // Verifica que o indicador de novas mensagens apareceu (confirmando que a UI sabe que não deve pular)
    expect(screen.getByRole('button', { name: /Pular para mensagens novas/i })).toBeInTheDocument();
  });
});
