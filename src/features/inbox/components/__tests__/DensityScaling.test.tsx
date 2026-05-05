import { render } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDensity } from '@/hooks/useDensity';
import { ConversationItem } from '../conversation-list/ConversationItem';
import { ConversationList } from '../ConversationList';
import { Conversation } from '@/types/chat';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';

// Mock density hook for testing
vi.mock('@/hooks/useDensity', () => ({
  useDensity: vi.fn()
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      {children}
    </TooltipProvider>
  </QueryClientProvider>
);

const mockConversation: Conversation = {
  id: 'conv-1',
  status: 'open',
  updatedAt: new Date(),
  createdAt: new Date(),
  unreadCount: 0,
  priority: 'medium',
  tags: [],
  contact: {
    id: 'contact-1',
    name: 'Test Contact',
    avatar: '',
    phone: '5511999999999',
    tags: [],
    createdAt: new Date(),
    contact_type: 'individual'
  },
  lastMessage: {
    id: 'msg-1',
    conversationId: 'conv-1',
    content: 'Hello world',
    type: 'text',
    sender: 'contact',
    timestamp: new Date(),
    status: 'read'
  }
};

describe('Density Scaling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render ConversationItem in comfortable mode by default', () => {
    (useDensity as any).mockReturnValue({ density: 'comfortable' });
    
    const { container } = render(
      <ConversationItem 
        conversation={mockConversation} 
        isSelected={false} 
        onSelect={() => {}} 
      />,
      { wrapper: Wrapper }
    );
    
    // Check for comfortable height/padding (min-h-[78px])
    const item = container.querySelector('.min-h-\\[78px\\]');
    expect(item).toBeTruthy();
    
    // Check for larger avatar size (w-[49px])
    const avatar = container.querySelector('.w-\\[49px\\]');
    expect(avatar).toBeTruthy();
  });

  it('should render ConversationItem in compact mode when density is compact', () => {
    (useDensity as any).mockReturnValue({ density: 'compact' });
    
    const { container } = render(
      <ConversationItem 
        conversation={mockConversation} 
        isSelected={false} 
        onSelect={() => {}} 
      />,
      { wrapper: Wrapper }
    );
    
    // Check for compact height/padding (min-h-[64px])
    const item = container.querySelector('.min-h-\\[64px\\]');
    expect(item).toBeTruthy();
    
    // Check for smaller avatar size (w-[38px])
    const avatar = container.querySelector('.w-\\[38px\\]');
    expect(avatar).toBeTruthy();
    
    // Check for smaller font size on name (text-[14px])
    const name = container.querySelector('.text-\\[14px\\]');
    expect(name).toBeTruthy();
  });
});
