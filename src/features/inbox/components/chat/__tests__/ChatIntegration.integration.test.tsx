import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatMessagesArea } from '../ChatMessagesArea';
import { Message } from '@/types/chat';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  },
}));

// Mock useAuth
vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'agent-1', name: 'Agent' },
    session: {},
  }),
}));

// Mock Logger
vi.mock('@/lib/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }
}));

const mockMessages: Message[] = [
  {
    id: '1',
    content: 'Hello',
    sender: 'contact',
    timestamp: new Date('2024-01-01T10:00:00Z'),
    type: 'text',
    status: 'read',
    conversationId: 'conv1',
  },
  {
    id: '2',
    content: 'How are you?',
    sender: 'agent',
    timestamp: new Date('2024-01-01T10:05:00Z'),
    type: 'text',
    status: 'delivered',
    conversationId: 'conv1',
  },
];

describe('ChatMessagesArea Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ChatMessagesArea
            messages={mockMessages}
            isContactTyping={false}
            typingUserName=""
            ttsLoading={false}
            ttsPlaying={false}
            ttsMessageId={null}
            onSpeak={vi.fn()}
            onStop={vi.fn()}
            onReply={vi.fn()}
            onForward={vi.fn()}
            onCopy={vi.fn()}
            onScrollToMessage={vi.fn()}
            onInteractiveButtonClick={vi.fn()}
            {...props}
          />
        </TooltipProvider>
      </QueryClientProvider>
    );
  };

  it('renders messages correctly', () => {
    renderComponent();
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('How are you?')).toBeInTheDocument();
  });

  it('triggers onLoadOlder when scrolling to top', async () => {
    const onLoadOlder = vi.fn().mockResolvedValue(undefined);
    const { container } = renderComponent({
      onLoadOlder,
      hasMoreOlder: true,
      loadingOlder: false,
    });

    const scrollContainer = container.querySelector('[role="log"]') as HTMLElement;
    
    // Mock scrollHeight and clientHeight
    Object.defineProperty(scrollContainer, 'scrollHeight', { value: 2000, configurable: true });
    Object.defineProperty(scrollContainer, 'clientHeight', { value: 1000, configurable: true });
    Object.defineProperty(scrollContainer, 'scrollTop', { value: 5, writable: true });
    
    // Scroll to top
    fireEvent.scroll(scrollContainer, { target: { scrollTop: 0 } });

    await waitFor(() => {
      expect(onLoadOlder).toHaveBeenCalled();
    });
  });

  it('shows typing indicator when contact is typing', () => {
    renderComponent({ isContactTyping: true, typingUserName: 'John' });
    expect(screen.getByText(/John está digitando/i)).toBeInTheDocument();
  });

  it('displays message status filter bar', async () => {
    renderComponent();
    
    // Use a more robust matcher for the message count
    expect(screen.getByText((content) => content.includes('2 mensagens'))).toBeInTheDocument();
  });
});
