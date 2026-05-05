import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MessageBubble } from '../chat/MessageBubble';
import { Message } from '@/types/chat';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock dependencies
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@/hooks/useContactAvatar', () => ({ useContactAvatar: () => ({ avatarUrl: '' }) }));
vi.mock('@/hooks/useAmbientColor', () => ({ useAmbientColor: () => ({ ambientColor: 'transparent' }) }));
vi.mock('@/features/auth', () => ({ useAuth: () => ({ profile: { name: 'Agent' } }) }));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <MemoryRouter>
      <TooltipProvider>
        {children}
      </TooltipProvider>
    </MemoryRouter>
  </QueryClientProvider>
);

const mockMessage: Message = {
  id: 'msg-1',
  content: 'Hello world test message',
  sender: 'contact',
  timestamp: new Date(),
  type: 'text',
  status: 'sent',
  conversationId: 'conv-1',
};

describe('Visual Regression: MessageBubble', () => {
  it('should have 15px font size for message content', () => {
    const { container } = render(
      <MessageBubble 
        message={mockMessage}
        isFirstInGroup={true}
        isLastInGroup={true}
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
        onMessageDeleted={vi.fn()}
        registerRef={vi.fn()}
      />,
      { wrapper: Wrapper }
    );
    
    // Check for the 15px font size class we just added
    const content = container.querySelector('.text-\\[15px\\]');
    expect(content).toBeTruthy();
    expect(content?.textContent).toBe('Hello world test message');
  });

  it('should have background background-based color (not hardcoded black)', () => {
    // This is harder to test directly via CSS classes if they use [hsl(var(--background))]
    // but we can check the class exists in the container (ChatPanel test would be better for the container bg)
    // For the bubble itself, it should have bg-chat-received or bg-chat-sent
    const { container } = render(
      <MessageBubble 
        message={mockMessage}
        isFirstInGroup={true}
        isLastInGroup={true}
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
        onMessageDeleted={vi.fn()}
        registerRef={vi.fn()}
      />,
      { wrapper: Wrapper }
    );
    
    const bubble = container.querySelector('.bg-chat-received');
    expect(bubble).toBeTruthy();
  });

  it('should render ChatPanel without hardcoded black background', () => {
    // We mock the most complex parts of ChatPanel to avoid large test setup
    vi.mock('../chat/ChatMessagesArea', () => ({ ChatMessagesArea: () => <div data-testid="messages-area" /> }));
    vi.mock('../chat/ChatInputArea', () => ({ ChatInputArea: () => <div data-testid="input-area" /> }));
    vi.mock('../chat/ChatPanelHeader', () => ({ ChatPanelHeader: () => <div data-testid="panel-header" /> }));
    vi.mock('../CRMAutoSync', () => ({ CRMAutoSync: () => null }));
    
    const { ChatPanel } = require('../ChatPanel');
    const { container } = render(
      <ChatPanel 
        conversation={{
          id: 'conv-1',
          contact: { id: 'contact-1', name: 'John Doe', phone: '123456789', avatar: '', tags: [], createdAt: new Date() },
          status: 'open',
          updatedAt: new Date(),
          createdAt: new Date(),
          unreadCount: 0,
          priority: 'medium',
          tags: [],
        }} 
        messages={[]} 
        onSendMessage={vi.fn()} 
      />,
      { wrapper: Wrapper }
    );
    
    // Check for [hsl(var(--background))] instead of bg-black
    const mainContainer = container.querySelector('.bg-\\[hsl\\(var\\(--background\\)\\)\\]');
    expect(mainContainer).toBeTruthy();
    expect(container.querySelector('.bg-black')).toBeFalsy();
  });
});
