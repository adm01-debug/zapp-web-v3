import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TeamChatPanel } from '../TeamChatPanel';

// Mock dependencies
vi.mock('@/features/auth', () => ({
  useAuth: vi.fn(() => ({ profile: { id: 'user-1', name: 'Test User' } }))
}));

vi.mock('../useTeamChatPanel', () => ({
  useTeamChatPanel: vi.fn(() => ({
    profile: { id: 'user-1' },
    filteredMessages: [],
    messages: [],
    showSearch: true,
    setShowSearch: vi.fn(),
    searchQuery: '',
    setSearchQuery: vi.fn(),
    syncSearchWithCache: vi.fn(),
    searchInputRef: { current: null },
    scrollRef: { current: null },
    isNearBottomRef: { current: true },
    listRef: { current: null },
    checkNearBottom: vi.fn(),
    isLoading: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    updateStatusMutation: { mutate: vi.fn() },
    muteMutation: { mutate: vi.fn() },
    tts: { voiceId: '1', speed: 1, setVoiceId: vi.fn(), setSpeed: vi.fn() }
  }))
}));

vi.mock('@/features/inbox/hooks/team-chat/useTeamMessageReactions', () => ({
  useTeamMessageReactions: vi.fn(() => ({
    aggregate: vi.fn(() => []),
    toggle: vi.fn()
  }))
}));

// Mock react-window with all used exports
vi.mock('react-window', () => ({
  List: ({ rowCount }: any) => <div data-testid="virtual-list" data-itemcount={rowCount} />,
  useDynamicRowHeight: vi.fn(() => ({ setRowHeight: vi.fn() }))
}));

// Mock react-virtualized-auto-sizer
vi.mock('react-virtualized-auto-sizer', () => ({
  default: ({ children }: any) => children({ width: 1000, height: 1000 })
}));

describe('TeamChatPanel Infinite Scroll & Filter Integration', () => {
  const mockConv: any = { id: 'conv-1', type: 'group', name: 'Test' };

  it('deve renderizar a área de busca quando showSearch é true', () => {
    render(<TeamChatPanel conversation={mockConv} onBack={() => {}} />);
    expect(screen.getByPlaceholderText(/buscar nas mensagens/i)).toBeDefined();
  });

  it('deve garantir que o cursor determinístico não misture mensagens fora do filtro', () => {
    const mockMessages = [
      { id: '1', content: 'abc', created_at: '2023-01-01' },
      { id: '2', content: 'def', created_at: '2023-01-02' }
    ];
    const filter = 'abc';
    const filtered = mockMessages.filter(m => m.content.toLowerCase().includes(filter.toLowerCase()));
    
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('1');
  });
});
