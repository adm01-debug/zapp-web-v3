import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatWatermark } from '../ChatWatermark';
import { MessageBubble } from '../MessageBubble';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';

// Mock dependencies
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/features/auth', () => ({ useAuth: () => ({ profile: { name: 'Agent', id: 'agent-1' } }) }));
vi.mock('@/features/inbox', () => ({ 
  useContactAvatar: () => ({ avatarUrl: null }),
  sendMessageToContact: vi.fn(),
  useMediaRefresh: () => ({ url: null, failed: false }),
  useInboxStatusPref: () => ({ showStatus: true }),
  useMessageSendStatus: () => ({ isSending: false, progress: 0 }),
  useFailureReason: () => ({ reason: null }),
  SLAIndicatorForContact: () => <div data-testid="sla-indicator">SLA</div>
}));
vi.mock('@/lib/logger', () => ({ getLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock('@/integrations/supabase/client', () => ({ 
  supabase: { 
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: vi.fn()
  } 
}));

describe('Chat Improvements Regression Tests', () => {
  const queryClient = new QueryClient();

  describe('ChatWatermark (Space Theme)', () => {
    it('renders the space-themed pattern', () => {
      const { container } = render(<ChatWatermark />);
      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
      
      const pattern = container.querySelector('#chat-pattern');
      expect(pattern).toBeTruthy();
      
      // Check for space-themed elements (rocket path, Saturn circle, etc.)
      const html = container.innerHTML;
      expect(html).toContain('Rocket'); // We added comments like {/* Rocket */} which might not be in HTML, but paths should be
      expect(html).toContain('Saturn');
      expect(html).toContain('patternUnits="userSpaceOnUse"');
    });
  });

  describe('MessageBubble (UI Enhancements)', () => {
    const mockMessage = {
      id: 'msg-1',
      sender: 'agent',
      content: 'Olá, confira este link: https://google.com',
      timestamp: new Date(),
      status: 'delivered',
      type: 'text',
      conversationId: 'conv-1',
      isWhisper: false,
    } as any;

    it('applies enhanced shadow and typography', () => {
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <TooltipProvider>
              <MessageBubble 
                message={mockMessage}
                isFirstInGroup={true}
                isLastInGroup={true}
                onSpeak={vi.fn()}
                onStop={vi.fn()}
                onReply={vi.fn()}
                onForward={vi.fn()}
                onCopy={vi.fn()}
                onScrollToMessage={vi.fn()}
                onInteractiveButtonClick={vi.fn()}
                onMessageDeleted={vi.fn()}
                registerRef={vi.fn()}
                ttsLoading={false}
                ttsPlaying={false}
                ttsMessageId={null}
              />
            </TooltipProvider>
          </BrowserRouter>
        </QueryClientProvider>
      );

      const bubbleContainer = container.querySelector('.shadow-\\[0_1\\.5px_2px_rgba\\(0\\,0\\,0\\,0\\.15\\)\\]');
      expect(bubbleContainer).toBeTruthy();
      expect(bubbleContainer?.className).toContain('font-medium');
    });

    it('renders links with TextWithLinks enhancement', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <TooltipProvider>
              <MessageBubble 
                message={mockMessage}
                isFirstInGroup={true}
                isLastInGroup={true}
                onSpeak={vi.fn()}
                onStop={vi.fn()}
                onReply={vi.fn()}
                onForward={vi.fn()}
                onCopy={vi.fn()}
                onScrollToMessage={vi.fn()}
                onInteractiveButtonClick={vi.fn()}
                onMessageDeleted={vi.fn()}
                registerRef={vi.fn()}
                ttsLoading={false}
                ttsPlaying={false}
                ttsMessageId={null}
              />
            </TooltipProvider>
          </BrowserRouter>
        </QueryClientProvider>
      );

      const link = screen.getByText('https://google.com');
      expect(link).toBeTruthy();
      expect(link.tagName).toBe('A');
    });
  });
});
