import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatPanelHeader } from '@/features/inbox/components/chat/ChatPanelHeader';
import { Conversation } from '@/types/chat';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Optimized mocks
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@/lib/popupManager', () => ({ openChatPopup: vi.fn() }));
vi.mock('@/features/inbox', () => ({ 
  useContactAvatar: () => ({ avatarUrl: null }),
  SLAIndicatorForContact: () => <div data-testid="sla-indicator">SLA</div>
}));
vi.mock('../..', () => ({ 
  SLAIndicator: () => null,
  VoiceSelector: () => null,
  SpeedSelector: () => null,
  TypingIndicatorCompact: () => null,
  TypingIndicatorInline: () => null,
  RealtimeCollaboration: () => null,
  KeyboardShortcutsHelp: () => null,
  SLAIndicatorForContact: () => <div data-testid="sla-indicator">SLA</div>
}));

const mockConversation = {
  id: 'conv-1',
  contact: {
    id: 'c-1',
    name: 'Maria Silva',
    phone: '+5511999999999',
    avatar: '',
  },
  lastMessage: { content: 'Olá', timestamp: new Date(), sender: 'contact' },
  unreadCount: 0,
  status: 'open',
  priority: 'medium',
  channel: 'whatsapp',
  tags: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
} as unknown as Conversation;

const baseProps = {
  conversation: mockConversation,
  isContactTyping: false,
  showAIAssistant: false,
  showDetails: false,
  voiceId: 'voice-1',
  speed: 1,
  onToggleAIAssistant: vi.fn(),
  onToggleDetails: vi.fn(),
  onStartCall: vi.fn(),
  onOpenSearch: vi.fn(),
  onOpenTransfer: vi.fn(),
  onOpenSchedule: vi.fn(),
  onVoiceChange: vi.fn(),
  onSpeedChange: vi.fn(),
};

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <TooltipProvider>{children}</TooltipProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

describe('ChatPanelHeader', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders contact name', () => {
    render(
      <Wrapper>
        <ChatPanelHeader {...baseProps} />
      </Wrapper>
    );
    expect(screen.getByText('Maria Silva')).toBeInTheDocument();
  });

  it('renders avatar fallback initials', () => {
    render(
      <Wrapper>
        <ChatPanelHeader {...baseProps} />
      </Wrapper>
    );
    expect(screen.getByText('MS')).toBeInTheDocument();
  });

  it('shows Online when contact is not typing', () => {
    render(
      <Wrapper>
        <ChatPanelHeader {...baseProps} isContactTyping={false} />
      </Wrapper>
    );
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('does NOT render summary button when onGenerateSummary is undefined', () => {
    render(
      <Wrapper>
        <ChatPanelHeader {...baseProps} canGenerateSummary={true} />
      </Wrapper>
    );
    expect(screen.queryByLabelText(/resumo/i)).not.toBeInTheDocument();
  });

  it('renders summary button when handler is provided', () => {
    const onGenerate = vi.fn();
    render(
      <Wrapper>
        <ChatPanelHeader {...baseProps} canGenerateSummary={true} onGenerateSummary={onGenerate} />
      </Wrapper>
    );
    expect(screen.getByLabelText(/resumo/i)).toBeInTheDocument();
  });

  it('calls onGenerateSummary when clicked', () => {
    const onGenerate = vi.fn();
    render(
      <Wrapper>
        <ChatPanelHeader {...baseProps} canGenerateSummary={true} onGenerateSummary={onGenerate} />
      </Wrapper>
    );
    fireEvent.click(screen.getByLabelText(/resumo/i));
    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  it('shows loader and disables button when isSummaryLoading=true', () => {
    render(
      <Wrapper>
        <ChatPanelHeader
          {...baseProps}
          canGenerateSummary={true}
          onGenerateSummary={vi.fn()}
          isSummaryLoading={true}
        />
      </Wrapper>
    );
    const summaryBtn = screen.getByLabelText(/resumo/i);
    expect(summaryBtn).toBeDisabled();
  });

  it('calls onOpenSearch when search button is clicked', () => {
    const onSearch = vi.fn();
    render(
      <Wrapper>
        <ChatPanelHeader {...baseProps} onOpenSearch={onSearch} />
      </Wrapper>
    );
    const searchBtn = screen.getByLabelText(/buscar/i);
    fireEvent.click(searchBtn);
    expect(onSearch).toHaveBeenCalledTimes(1);
  });
});
