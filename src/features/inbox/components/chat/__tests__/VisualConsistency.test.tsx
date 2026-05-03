import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatHeader } from '../ChatHeader';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock heavy dependencies
vi.mock('@/hooks/useExternalContact360', () => ({ useExternalContact360: () => ({ data: null }) }));
vi.mock('@/hooks/useContactIntelligence', () => ({ useContactIntelligence: () => ({ data: null }) }));
vi.mock('@/features/inbox', () => ({ 
  useContactAvatar: () => ({ avatarUrl: null }),
  SLAIndicatorForContact: () => <div data-testid="sla-indicator">SLA</div>
}));
vi.mock('@/features/auth', () => ({ useAuth: () => ({ profile: { name: 'Agent' } }) }));
vi.mock('@/hooks/useDensity', () => ({ useDensity: () => ({ density: 'comfortable', cycleDensity: vi.fn() }) }));
vi.mock('../ConversationHealth', () => ({ ConversationHealth: () => null }));
vi.mock('../RealtimeCollaboration', () => ({ RealtimeCollaboration: () => null }));
vi.mock('../ai-tools/VisionIcon', () => ({ VisionIcon: () => null }));
vi.mock('../QueuePositionNotifier', () => ({ QueuePositionNotifier: () => null }));
vi.mock('../VoiceSelector', () => ({ VoiceSelector: () => null }));
vi.mock('../KeyboardShortcutsHelp', () => ({ KeyboardShortcutsHelp: () => null }));
vi.mock('../collaboration/ViewersIndicator', () => ({ ViewersIndicator: () => null }));
vi.mock('../collaboration/InternalNotesPanel', () => ({ InternalNotesPanel: () => null }));
vi.mock('../CrmBadges', () => ({ CrmBadges: () => null }));
vi.mock('../BusinessHoursBadge', () => ({ BusinessHoursBadge: () => null }));
vi.mock('../AnalysisBadges', () => ({ AnalysisBadges: () => null }));

describe('Visual Consistency — ChatHeader', () => {
  const queryClient = new QueryClient();
  const mockConversation = {
    id: 'conv-1',
    status: 'open',
    contact: { name: 'John Doe', phone: '5511999999999' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any;

  it('renders with Segoe UI font and correct WhatsApp colors', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TooltipProvider>
            <ChatHeader 
              conversation={mockConversation}
              messages={[]}
              isContactTyping={false}
              showAIAssistant={false}
              showDetails={false}
              voiceId="v1"
              speed={1}
              onToggleAIAssistant={vi.fn()}
              onToggleDetails={vi.fn()}
              onStartCall={vi.fn()}
              onOpenSearch={vi.fn()}
              onOpenTransfer={vi.fn()}
              onOpenSchedule={vi.fn()}
              onVoiceChange={vi.fn()}
              onSpeedChange={vi.fn()}
            />
          </TooltipProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Check for WhatsApp background color in header
    const header = container.firstChild as HTMLElement;
    expect(header.className).toContain('bg-[#f0f2f5]');
    
    // Check contact name styling
    const name = screen.getByText('John Doe');
    expect(name.className).toContain('font-display'); // Should resolve to Segoe UI via global CSS
  });
});
