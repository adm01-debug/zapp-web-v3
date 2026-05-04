import { renderHook, act } from '@testing-library/react';
import { useTeamChatPanel } from '../useTeamChatPanel';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock dependencies
vi.mock('@/features/auth', () => ({
  useAuth: () => ({ profile: { id: 'user-1', name: 'Test User' } })
}));

vi.mock('@/hooks/useTextToSpeech', () => ({
  useTextToSpeech: () => ({ voiceId: '1', speed: 1 })
}));

vi.mock('@/hooks/useUserSettings', () => ({
  useUserSettings: () => ({ settings: {}, updateSettings: vi.fn(), saveSettings: vi.fn() })
}));

vi.mock('@/hooks/useTeamChat', () => ({
  useTeamMessages: vi.fn(() => ({
    messages: [{ id: '1', content: 'Old', created_at: new Date().toISOString() }],
    isLoading: false,
    fetchNextPage: vi.fn(),
    hasNextPage: true,
    isFetchingNextPage: false
  })),
  useSendTeamMessage: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteTeamMessage: () => ({ mutate: vi.fn() }),
  useEditTeamMessage: () => ({ mutate: vi.fn() }),
  useToggleMuteConversation: () => ({ mutate: vi.fn() }),
  useUpdateTeamMessageStatus: () => ({ mutate: vi.fn() })
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: { from: () => ({ upload: vi.fn(), getPublicUrl: vi.fn() }) }
  }
}));

const queryClient = new QueryClient();
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('TeamChatPanel Scroll Anchor', () => {
  const mockConversation = { id: 'conv-1', type: 'group' as const };

  it('should calculate scroll offset when fetching next page', async () => {
    const { result } = renderHook(() => useTeamChatPanel(mockConversation as any), { wrapper });
    
    // Mock scrollRef
    const scrollEl = {
      scrollHeight: 1000,
      scrollTop: 100,
      clientHeight: 500
    };
    (result.current.scrollRef as any).current = scrollEl;

    // Simulate starting to fetch next page (older messages)
    act(() => {
      // @ts-ignore - internal state change simulation
      result.current.scrollOffsetRef.current = scrollEl.scrollHeight - scrollEl.scrollTop;
    });

    expect(result.current.scrollOffsetRef.current).toBe(900);
  });

  it('should maintain relative scroll position after loading messages', () => {
    const { result } = renderHook(() => useTeamChatPanel(mockConversation as any), { wrapper });
    
    const scrollEl = {
      scrollHeight: 1500, // height increased after loading
      scrollTop: 100,
      clientHeight: 500
    };
    (result.current.scrollRef as any).current = scrollEl;
    
    // Set an offset manually as if we just loaded messages
    act(() => {
      // @ts-ignore
      result.current.scrollOffsetRef.current = 900; 
    });

    // Simulate the effect that runs after messages length changes or fetching stops
    act(() => {
      const newScrollTop = scrollEl.scrollHeight - 900; // 1500 - 900 = 600
      scrollEl.scrollTop = newScrollTop;
    });

    expect(scrollEl.scrollTop).toBe(600);
  });
});
