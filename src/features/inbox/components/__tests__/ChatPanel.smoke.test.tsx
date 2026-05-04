import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ChatPanel } from '../ChatPanel';
import { Conversation, Message } from '@/types/chat';

// Mock dependencies
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@/lib/logger', () => ({ log: { info: vi.fn(), error: vi.fn() } }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/hooks/useTypingPresence', () => ({ 
  useTypingPresence: () => ({ isContactTyping: false, typingUsers: [], handleTypingStart: vi.fn(), handleTypingStop: vi.fn() }) 
}));
vi.mock('@/hooks/useEvolutionApi', () => ({ useEvolutionApi: () => ({ editMessage: vi.fn() }) }));
vi.mock('@/features/inbox', () => ({ 
  useQuickReplies: () => ({ templates: [] }),
  useMessageSignature: () => ({ signatureEnabled: false, agentName: '', toggleSignature: vi.fn(), applySignature: vi.fn() })
}));
vi.mock('@/hooks/useTextToSpeech', () => ({ 
  useTextToSpeech: () => ({ speak: vi.fn(), stop: vi.fn(), isLoading: false, isPlaying: false, currentMessageId: null }) 
}));
vi.mock('@/hooks/useUserSettings', () => ({ 
  useUserSettings: () => ({ settings: { tts_voice_id: 'default', tts_speed: 1 }, updateSettings: vi.fn(), saveSettings: vi.fn() }) 
}));
vi.mock('@/hooks/useScheduledMessages', () => ({ useScheduledMessages: () => ({ scheduleMessage: vi.fn() }) }));
vi.mock('./useChatMediaSending', () => ({ useChatMediaSending: () => ({ initResolve: vi.fn() }) }));
vi.mock('@/hooks/useAmbientColor', () => ({ useAmbientColor: () => ({ ambientColor: 'transparent' }) }));
vi.mock('@/hooks/useAutomations', () => ({ useAutomations: () => ({}) }));

const mockConversation: Conversation = {
  id: 'conv-1',
  contact: { id: 'contact-1', name: 'John Doe', phone: '123456789', avatar: '', tags: [], createdAt: new Date() },
  status: 'open',
  updatedAt: new Date(),
};

const mockMessages: Message[] = [
  { id: 'msg-1', content: 'Hello', sender: 'contact', timestamp: new Date(), type: 'text', status: 'sent', conversationId: 'conv-1' }
];

describe('ChatPanel Smoke Test', () => {
  it('renders correctly with conversation and messages', () => {
    render(
      <ChatPanel 
        conversation={mockConversation} 
        messages={mockMessages} 
        onSendMessage={vi.fn()} 
      />
    );
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
