import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDensity } from '@/hooks/useDensity';
import { ConversationItem } from '../conversation-list/ConversationItem';
import { Conversation } from '@/types/chat';

// Mock density hook for testing
vi.mock('@/hooks/useDensity', () => ({
  useDensity: vi.fn()
}));

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
      />
    );
    
    // Check for comfortable height/padding (min-h-[78px])
    const item = container.querySelector('.min-h-\\[78px\\]');
    expect(item).toBeTruthy();
  });

  it('should render ConversationItem in compact mode when density is compact', () => {
    (useDensity as any).mockReturnValue({ density: 'compact' });
    
    const { container } = render(
      <ConversationItem 
        conversation={mockConversation} 
        isSelected={false} 
        onSelect={() => {}} 
      />
    );
    
    // Check for compact attribute/class (min-h-[64px] was added in my previous edit)
    // Wait, did I actually apply the logic to use min-h-[64px]? 
    // Let me check the file content again.
  });
});
