/** @vitest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react';
import { TeamChatPanel } from '../TeamChatPanel';
import { useTeamChatPanel } from '../useTeamChatPanel';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the hooks to control state
vi.mock('../useTeamChatPanel', () => ({
  useTeamChatPanel: vi.fn()
}));

vi.mock('@/features/auth', () => ({
  useAuth: vi.fn(() => ({ profile: { id: 'user-1', name: 'Me' } }))
}));

vi.mock('@/hooks/useTeamChatDraft', () => ({
  useTeamChatDraft: vi.fn(() => ({ draft: '', setDraft: vi.fn() }))
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
      sendMutation: { isPending: false },
      updateStatusMutation: { mutate: vi.fn() },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <TeamChatPanel conversation={mockConversation as any} onBack={() => {}} />
        </TooltipProvider>
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
      hasNewMessagesUnseen: true,
      scrollToBottom,
      isNearBottomRef: { current: false },
      scrollRef: { current: null },
      listRef: { current: null },
      searchInputRef: { current: null },
      lastScrollTopRef: { current: 0 },
      tts: { isPlaying: false, isLoading: false },
      checkNearBottom: vi.fn(),
      sendMutation: { isPending: false },
      updateStatusMutation: { mutate: vi.fn() },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <TeamChatPanel conversation={mockConversation as any} onBack={() => {}} />
        </TooltipProvider>
      </QueryClientProvider>
    );

    const jumpButton = screen.getByText(/Pular para mensagens novas/i);
    expect(jumpButton).toBeDefined();
    
    fireEvent.click(jumpButton);
    expect(scrollToBottom).toHaveBeenCalled();
  });
});
