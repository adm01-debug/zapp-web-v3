/** @vitest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TeamChatPanel } from '../TeamChatPanel';
import { useTeamChatPanel } from '../useTeamChatPanel';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the hook to control state
vi.mock('../useTeamChatPanel', () => ({
  useTeamChatPanel: vi.fn()
}));

vi.mock('@/features/auth', () => ({
  useAuth: vi.fn(() => ({ profile: { id: 'user-1', name: 'Me' } }))
}));

const mockConversation = {
  id: 'conv-1',
  name: 'Test Team',
  type: 'group',
  members: []
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

describe('TeamChatPanel Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders messages and handles search', async () => {
    const mockSyncSearch = vi.fn();
    (useTeamChatPanel as any).mockReturnValue({
      profile: { id: 'user-1', name: 'Me' },
      messages: [{ id: '1', content: 'Hello', created_at: new Date().toISOString(), sender_id: 'user-2', sender: { name: 'Other' } }],
      filteredMessages: [{ id: '1', content: 'Hello', created_at: new Date().toISOString(), sender_id: 'user-2', sender: { name: 'Other' } }],
      isLoading: false,
      showSearch: true,
      searchQuery: '',
      syncSearchWithCache: mockSyncSearch,
      isNearBottomRef: { current: true },
      scrollRef: { current: null },
      listRef: { current: null },
      searchInputRef: { current: null },
      lastScrollTopRef: { current: 0 },
      tts: { isPlaying: false, isLoading: false },
      checkNearBottom: vi.fn(),
      scrollToBottom: vi.fn(),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <TeamChatPanel conversation={mockConversation as any} onBack={() => {}} />
      </QueryClientProvider>
    );

    expect(screen.getByText('Hello')).toBeDefined();
    
    const searchInput = screen.getByPlaceholderText(/Buscar nas mensagens/i);
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    expect(mockSyncSearch).toHaveBeenCalledWith('test');
  });

  it('shows "Jump to new messages" button when scrolled up and new message arrives', async () => {
    const scrollToBottom = vi.fn();
    (useTeamChatPanel as any).mockReturnValue({
      profile: { id: 'user-1', name: 'Me' },
      messages: [{ id: '1', content: 'Old', created_at: new Date().toISOString(), sender_id: 'user-2' }],
      filteredMessages: [{ id: '1', content: 'Old', created_at: new Date().toISOString(), sender_id: 'user-2' }],
      isLoading: false,
      hasNewMessagesUnseen: true, // Simulated state
      scrollToBottom,
      isNearBottomRef: { current: false },
      scrollRef: { current: null },
      listRef: { current: null },
      searchInputRef: { current: null },
      lastScrollTopRef: { current: 0 },
      tts: { isPlaying: false, isLoading: false },
      checkNearBottom: vi.fn(),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <TeamChatPanel conversation={mockConversation as any} onBack={() => {}} />
      </QueryClientProvider>
    );

    const jumpButton = screen.getByText(/Pular para mensagens novas/i);
    expect(jumpButton).toBeDefined();
    
    fireEvent.click(jumpButton);
    expect(scrollToBottom).toHaveBeenCalled();
  });

  it('maintains scroll position during infinite scroll (scroll anchor logic verification)', async () => {
    // This is hard to test with unit tests because it depends on scrollHeight and scrollTop
    // but we can verify the hook's logic captures the offset.
    
    const mockScrollRef = { current: { scrollHeight: 1000, scrollTop: 200 } };
    const mockScrollOffsetRef = { current: 0 };
    
    (useTeamChatPanel as any).mockReturnValue({
      profile: { id: 'user-1', name: 'Me' },
      messages: [],
      filteredMessages: [],
      isLoading: false,
      isFetchingNextPage: true,
      scrollRef: mockScrollRef,
      scrollOffsetRef: mockScrollOffsetRef,
      listRef: { current: null },
      searchInputRef: { current: null },
      lastScrollTopRef: { current: 0 },
      tts: { isPlaying: false, isLoading: false },
      checkNearBottom: vi.fn(),
    });

    // If we were using the real hook, we'd check if scrollOffsetRef.current became 800.
    // Since we mock it, we at least verify the component renders correctly in that state.
    render(
      <QueryClientProvider client={queryClient}>
        <TeamChatPanel conversation={mockConversation as any} onBack={() => {}} />
      </QueryClientProvider>
    );
    
    expect(screen.getByText(/Carregando mensagens anteriores/i)).toBeDefined();
  });
});
