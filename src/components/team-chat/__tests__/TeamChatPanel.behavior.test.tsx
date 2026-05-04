/** @vitest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TeamChatPanel } from '../TeamChatPanel';
import { useTeamChatPanel } from '../useTeamChatPanel';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
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
vi.mock('../useTeamChatPanel', () => ({
  useTeamChatPanel: vi.fn()
}));

vi.mock('@/features/auth', () => ({
  useAuth: vi.fn(() => ({ profile: { id: 'user-1', name: 'Me' } }))
}));

vi.mock('@/hooks/useTeamChatDraft', () => ({
  useTeamChatDraft: vi.fn(() => ({ 
    draft: '', 
    setDraft: vi.fn(),
    hasText: false,
    isOverLimit: false,
    charCount: 0,
    CHAR_LIMIT: 2000,
    clearDraft: vi.fn(),
    handlePaste: vi.fn()
  }))
}));

vi.mock('@/features/inbox/hooks/team-chat/useTeamMessageReactions', () => ({
  useTeamMessageReactions: vi.fn(() => ({
    aggregate: vi.fn(() => []),
    toggle: vi.fn(),
    isToggling: false,
  }))
}));

const mockConversation = {
  id: 'conv-1',
  name: 'Test Team',
  type: 'group',
  members: ['user-1', 'user-2']
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const defaultMockState = {
  profile: { id: 'user-1', name: 'Me' },
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
  scrollRef: { current: null },
  listRef: { current: null },
  isNearBottomRef: { current: true },
  searchInputRef: { current: null },
  lastScrollTopRef: { current: 0 },
  tts: { isPlaying: false, isLoading: false, speak: vi.fn(), stop: vi.fn() },
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
};

describe('TeamChatPanel Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders messages and handles search', async () => {
    const mockSyncSearch = vi.fn();
    (useTeamChatPanel as any).mockReturnValue({
      ...defaultMockState,
      showSearch: true,
      messages: [{ id: '1', content: 'Hello', created_at: new Date().toISOString(), sender_id: 'user-2', sender: { name: 'Other' } }],
      filteredMessages: [{ id: '1', content: 'Hello', created_at: new Date().toISOString(), sender_id: 'user-2', sender: { name: 'Other' } }],
      syncSearchWithCache: mockSyncSearch,
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
      ...defaultMockState,
      messages: [{ id: '1', content: 'Old', created_at: new Date().toISOString(), sender_id: 'user-2' }],
      filteredMessages: [{ id: '1', content: 'Old', created_at: new Date().toISOString(), sender_id: 'user-2' }],
      hasNewMessagesUnseen: true,
      scrollToBottom,
      isNearBottomRef: { current: false },
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

  it('updates react-window list when search filter changes', async () => {
    const mockSyncSearch = vi.fn();
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <TeamChatPanel conversation={mockConversation as any} onBack={() => {}} />
        </TooltipProvider>
      </QueryClientProvider>
    );

    // Initial state: 2 messages
    (useTeamChatPanel as any).mockReturnValue({
      ...defaultMockState,
      showSearch: true,
      messages: [
        { id: '1', content: 'Apple', created_at: new Date().toISOString(), sender_id: 'user-2', sender: { name: 'Other' } },
        { id: '2', content: 'Banana', created_at: new Date().toISOString(), sender_id: 'user-2', sender: { name: 'Other' } }
      ],
      filteredMessages: [
        { id: '1', content: 'Apple', created_at: new Date().toISOString(), sender_id: 'user-2', sender: { name: 'Other' } },
        { id: '2', content: 'Banana', created_at: new Date().toISOString(), sender_id: 'user-2', sender: { name: 'Other' } }
      ],
      syncSearchWithCache: mockSyncSearch,
    });

    rerender(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <TeamChatPanel conversation={mockConversation as any} onBack={() => {}} />
        </TooltipProvider>
      </QueryClientProvider>
    );

    expect(screen.getByText('Apple')).toBeDefined();
    expect(screen.getByText('Banana')).toBeDefined();

    // Simulating search "Apple" -> should only show 1 message
    (useTeamChatPanel as any).mockReturnValue({
      ...defaultMockState,
      showSearch: true,
      searchQuery: 'Apple',
      messages: [
        { id: '1', content: 'Apple', created_at: new Date().toISOString(), sender_id: 'user-2', sender: { name: 'Other' } },
        { id: '2', content: 'Banana', created_at: new Date().toISOString(), sender_id: 'user-2', sender: { name: 'Other' } }
      ],
      filteredMessages: [
        { id: '1', content: 'Apple', created_at: new Date().toISOString(), sender_id: 'user-2', sender: { name: 'Other' } }
      ],
      syncSearchWithCache: mockSyncSearch,
    });

    rerender(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <TeamChatPanel conversation={mockConversation as any} onBack={() => {}} />
        </TooltipProvider>
      </QueryClientProvider>
    );

    expect(screen.getByText('Apple')).toBeDefined();
    expect(screen.queryByText('Banana')).toBeNull();
  });

  it('handles scroll anchor and jump to bottom when new messages arrive', async () => {
    const scrollToBottom = vi.fn();
    const isNearBottomRef = { current: false };

    (useTeamChatPanel as any).mockReturnValue({
      ...defaultMockState,
      messages: [{ id: '1', content: 'Message 1', created_at: new Date().toISOString(), sender_id: 'user-2' }],
      filteredMessages: [{ id: '1', content: 'Message 1', created_at: new Date().toISOString(), sender_id: 'user-2' }],
      hasNewMessagesUnseen: false,
      scrollToBottom,
      isNearBottomRef,
    });

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <TeamChatPanel conversation={mockConversation as any} onBack={() => {}} />
        </TooltipProvider>
      </QueryClientProvider>
    );

    // Simulate new message arriving while user is scrolled up
    (useTeamChatPanel as any).mockReturnValue({
      ...defaultMockState,
      messages: [
        { id: '1', content: 'Message 1', created_at: new Date().toISOString(), sender_id: 'user-2' },
        { id: '2', content: 'Message 2', created_at: new Date().toISOString(), sender_id: 'user-2' }
      ],
      filteredMessages: [
        { id: '1', content: 'Message 1', created_at: new Date().toISOString(), sender_id: 'user-2' },
        { id: '2', content: 'Message 2', created_at: new Date().toISOString(), sender_id: 'user-2' }
      ],
      hasNewMessagesUnseen: true, // Should show the button
      scrollToBottom,
      isNearBottomRef: { current: false },
    });

    rerender(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <TeamChatPanel conversation={mockConversation as any} onBack={() => {}} />
        </TooltipProvider>
      </QueryClientProvider>
    );

    // Verify button appears
    const jumpButton = screen.getByText(/Pular para mensagens novas/i);
    expect(jumpButton).toBeDefined();

    // Click jump button
    fireEvent.click(jumpButton);
    expect(scrollToBottom).toHaveBeenCalled();
  });
});