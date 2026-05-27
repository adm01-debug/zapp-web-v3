import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useInboxFilters } from '../useInboxFilters';

// Mocking dependencies
vi.mock('@/features/auth', () => ({
  usePermissions: () => ({
    hasPermission: vi.fn((perm) => {
      if (perm === 'inbox.view_department') return true;
      return false;
    }),
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  },
}));

vi.mock('@/hooks/useUrlFilters', () => ({
  useUrlFilters: () => ({
    filters: { status: [], tags: [], agentId: null },
    setFilters: vi.fn(),
    clearFilters: vi.fn(),
  }),
}));

vi.mock('@/features/inbox', () => ({
  useAllTicketStates: () => ({}),
  filterByContactType: (convs: any) => convs,
  useFailureMetricsBatch: () => ({ data: {} }),
}));

describe('useInboxFilters Business Rules', () => {
  const mockConversations = [
    {
      contact: { id: 'c1', assigned_to: 'agent-1' },
      messages: [],
      unreadCount: 0,
    },
    {
      contact: { id: 'c2', assigned_to: 'agent-2' },
      messages: [],
      unreadCount: 0,
    },
    {
      contact: { id: 'c3', assigned_to: null },
      messages: [],
      unreadCount: 0,
    }
  ] as any;

  it('filters by department scope for coordinators', () => {
    const { result } = renderHook(() => useInboxFilters({
      conversations: mockConversations,
      profileId: 'agent-1'
    }));

    // Simulating scope change to department
    result.current.setScope('department');
    result.current.setDepartmentAgentIds(['agent-1', 'agent-2']);

    const filtered = result.current.filteredConversations;
    
    // Should see c1 and c2 (assigned to dept agents), but not c3 (unassigned)
    expect(filtered.length).toBe(2);
    expect(filtered.map(f => f.contact.id)).toContain('c1');
    expect(filtered.map(f => f.contact.id)).toContain('c2');
  });

  it('filters by specific agent when selected by coordinator', () => {
    const { result } = renderHook(() => useInboxFilters({
      conversations: mockConversations,
      profileId: 'agent-1'
    }));

    // Setup: Dept scope + Filter specific agent-2
    result.current.setScope('department');
    result.current.setDepartmentAgentIds(['agent-1', 'agent-2']);
    result.current.setFilters({
        status: [],
        tags: [],
        agentId: 'agent-2',
        dateRange: { from: null, to: null }
    });

    const filtered = result.current.filteredConversations;
    
    // Should only see agent-2 conversations
    expect(filtered.length).toBe(1);
    expect(filtered[0].contact.id).toBe('c2');
  });

  it('shows only mine for common agents', () => {
    // Override permission mock for common agent
    vi.mocked(require('@/features/auth').usePermissions().hasPermission).mockReturnValue(false);

    const { result } = renderHook(() => useInboxFilters({
      conversations: mockConversations,
      profileId: 'agent-1'
    }));

    result.current.setScope('mine');
    const filtered = result.current.filteredConversations;
    
    expect(filtered.length).toBe(1);
    expect(filtered[0].contact.id).toBe('c1');
  });
});
