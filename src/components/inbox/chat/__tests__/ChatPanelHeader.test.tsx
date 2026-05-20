import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatPanelHeader } from '../ChatPanelHeader';
import { Conversation } from '@/types/chat';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BrowserRouter } from 'react-router-dom';

vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@/lib/popupManager', () => ({ openChatPopup: vi.fn() }));
vi.mock('@/components/inbox/SLAIndicator', () => ({ SLAIndicator: () => null }));
vi.mock('@/components/inbox/VoiceSelector', () => ({ VoiceSelector: () => null }));
vi.mock('@/components/inbox/SpeedSelector', () => ({ SpeedSelector: () => null }));

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

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <TooltipProvider>{children}</TooltipProvider>
  </BrowserRouter>
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
    render(
      <Wrapper>
        <ChatPanelHeader {...baseProps} />
      </Wrapper>
    );
    const buttons = screen.getAllByRole('button');
    const searchBtn = buttons.find(b => b.querySelector('.lucide-search'));
    fireEvent.click(searchBtn!);
    expect(baseProps.onOpenSearch).toHaveBeenCalledTimes(1);
  });
});
