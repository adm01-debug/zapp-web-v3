import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useInboxFilters } from '@/hooks/useInboxFilters';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  },
}));

const mockSetSearchParams = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [mockSearchParams, mockSetSearchParams],
}));

vi.mock('@/hooks/useUrlFilters', () => ({
  useUrlFilters: () => ({
    filters: {
      status: mockSearchParams.get('status')?.split(',') || [],
      tags: mockSearchParams.get('tags')?.split(',') || [],
      agentId: mockSearchParams.get('agent'),
      dateFrom: mockSearchParams.get('from'),
      dateTo: mockSearchParams.get('to'),
      search: mockSearchParams.get('q') || '',
    },
    setFilters: (newFilters: any) => {
      Object.entries(newFilters).forEach(([key, value]) => {
        if (value) {
          if (Array.isArray(value)) {
             if (value.length > 0) mockSearchParams.set(key, value.join(','));
             else mockSearchParams.delete(key);
          } else {
             mockSearchParams.set(key, String(value));
          }
        } else {
          mockSearchParams.delete(key);
        }
      });
      mockSetSearchParams(mockSearchParams);
    },
    clearFilters: vi.fn(),
  }),
}));

vi.mock('@/hooks/inbox/useFailureMetricsBatch', () => ({
  useFailureMetricsBatch: () => ({ data: {} }),
}));

vi.mock('@/hooks/useTicketStatus', () => ({
  useAllTicketStates: () => ({}),
}));

// Mock data
const mockConversations: any[] = [
  {
    contact: { id: 'c1', name: 'John Doe', phone: '12345', assigned_to: 'agent-1', created_at: '2024-01-01T10:00:00Z', updated_at: '2024-01-01T10:00:00Z' },
    messages: [],
    unreadCount: 0,
    lastMessage: { content: 'Hello', created_at: '2024-01-01T10:05:00Z' }
  },
  {
    contact: { id: 'c2', name: 'Jane Smith', phone: '67890', assigned_to: null, created_at: '2024-01-02T10:00:00Z', updated_at: '2024-01-02T10:00:00Z' },
    messages: [
      { id: 'm1', status: 'failed', content: 'Failed message', created_at: '2024-01-02T10:05:00Z' }
    ],
    unreadCount: 5,
    lastMessage: { content: 'Failed message', created_at: '2024-01-02T10:05:00Z' }
  }
];

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  React.createElement(QueryClientProvider, { client: queryClient }, children)
);

describe('useInboxFilters (covering useChatFailureFilter)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    queryClient.clear();
  });

  it('filters by failure status when showOnlyRetrying is true', () => {
    const { result } = renderHook(() => useInboxFilters({
      conversations: mockConversations,
      profileId: 'agent-1'
    }), { wrapper });

    expect(result.current.filteredConversations.length).toBe(2);

    act(() => {
      result.current.setShowOnlyRetrying(true);
    });

    expect(result.current.filteredConversations.length).toBe(1);
    expect(result.current.filteredConversations[0].contact.name).toBe('Jane Smith');
  });

  it('filters by specific failure category', () => {
    const { result } = renderHook(() => useInboxFilters({
      conversations: mockConversations,
      profileId: 'agent-1'
    }), { wrapper });

    act(() => {
      result.current.setShowOnlyRetrying(true);
      result.current.setFailureCategoryFilter('network');
    });

    expect(result.current.filteredConversations.length).toBe(0);

    act(() => {
      result.current.setFailureCategoryFilter('unknown');
    });
    expect(result.current.filteredConversations.length).toBe(1);
  });

  it('updates main tab and sub tab', () => {
    const { result } = renderHook(() => useInboxFilters({
      conversations: mockConversations,
      profileId: 'agent-1'
    }), { wrapper });

    act(() => {
      result.current.setMainTab('resolved');
    });
    expect(result.current.mainTab).toBe('resolved');

    act(() => {
      result.current.setSubTab('waiting');
    });
    expect(result.current.subTab).toBe('waiting');
  });

  it('searches correctly by name', () => {
    const { result } = renderHook(() => useInboxFilters({
      conversations: mockConversations,
      profileId: 'agent-1'
    }), { wrapper });

    act(() => {
      result.current.setSearch('Jane');
    });

    expect(result.current.filteredConversations.length).toBe(1);
    expect(result.current.filteredConversations[0].contact.name).toBe('Jane Smith');
  });
});

