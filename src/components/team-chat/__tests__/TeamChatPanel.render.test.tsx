import { render, screen } from '@testing-library/react';
import { TeamChatPanel } from '../TeamChatPanel';
import { useAuth } from '@/features/auth';
import { useTeamChatPanel } from '../useTeamChatPanel';
import { useTeamMessageReactions } from '@/features/inbox/hooks/team-chat/useTeamMessageReactions';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';

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
vi.mock('../TeamChatHeader', () => ({ TeamChatHeader: () => <div data-testid="mock-header" /> }));
vi.mock('../TeamChatInputArea', () => ({ TeamChatInputArea: () => <div data-testid="mock-input" /> }));
vi.mock('../AddMembersDialog', () => ({ AddMembersDialog: () => <div data-testid="mock-dialog" /> }));
vi.mock('../ParticipantStatsGraph', () => ({ ParticipantStatsGraph: () => <div data-testid="mock-stats" /> }));
vi.mock('@/features/inbox', () => ({ MarkdownPreview: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('@/features/inbox/components/MessageStatus', () => ({ MessageStatus: () => <span>Status</span> }));

describe('TeamChatPanel Component Rendering', () => {
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
    
    (useTeamChatPanel as any).mockReturnValue({
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
      scrollRef: { current: null },
      listRef: { current: null },
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
    });
  });

  it('renders without crashing and displays header and input', () => {
    render(<TeamChatPanel conversation={mockConversation} onBack={vi.fn()} />);
    
    expect(screen.getByTestId('mock-header')).toBeInTheDocument();
    expect(screen.getByTestId('mock-input')).toBeInTheDocument();
  });

  it('renders messages when available', () => {
    const messages = [
      { id: 'msg-1', content: 'Hello', sender_id: 'user-2', created_at: new Date().toISOString(), sender: { name: 'User 2' } },
    ];
    
    (useTeamChatPanel as any).mockReturnValue({
      ...(useTeamChatPanel as any)(),
      filteredMessages: messages,
      messages: messages,
    });

    render(<TeamChatPanel conversation={mockConversation} onBack={vi.fn()} />);
    
    // Check if the message content is rendered
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('User 2')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    (useTeamChatPanel as any).mockReturnValue({
      ...(useTeamChatPanel as any)(),
      isLoading: true,
      filteredMessages: [],
    });

    render(<TeamChatPanel conversation={mockConversation} onBack={vi.fn()} />);
    
    // We expect some skeleton loaders (divs with Skeleton class)
    // The component renders 4 skeletons
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
