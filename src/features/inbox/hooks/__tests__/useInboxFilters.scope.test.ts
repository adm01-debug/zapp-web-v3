import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useInboxFilters } from '../useInboxFilters';

// Mocking dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  },
}));

vi.mock('@/features/inbox', () => ({
  useAllTicketStates: vi.fn(() => ({})),
  useFailureMetricsBatch: vi.fn(() => ({ data: {} })),
}));

const mockConversations = [
  {
    contact: { id: 'c1', assigned_to: 'agent-1' },
    unreadCount: 0,
    messages: [],
  },
  {
    contact: { id: 'c2', assigned_to: 'agent-2' },
    unreadCount: 0,
    messages: [],
  },
  {
    contact: { id: 'c3', assigned_to: null },
    unreadCount: 0,
    messages: [],
  }
];

describe('useInboxFilters - Scope Logic', () => {
  it('filters by "mine" scope correctly', () => {
    const { result } = renderHook(() => useInboxFilters({ 
      conversations: mockConversations as any, 
      profileId: 'agent-1' 
    }));
    
    // Default is scope='mine'
    expect(result.current.scope).toBe('mine');
    const filtered = result.current.filteredConversations;
    expect(filtered).toHaveLength(1);
    expect(filtered[0].contact.id).toBe('c1');
  });

  it('filters by "department" scope correctly', () => {
    const { result } = renderHook(() => useInboxFilters({ 
      conversations: mockConversations as any, 
      profileId: 'agent-1' 
    }));
    
    vi.stubGlobal('localStorage', { getItem: vi.fn(), setItem: vi.fn() });

    // Act
    result.current.setScope('department');
    result.current.setDepartmentAgentIds(['agent-1', 'agent-2']);
    
    // The filter logic in useInboxFilters uses these values
    // Note: In a real test we might need to wait for re-render if using effects, 
    // but here we check the filtered output based on memo deps.
    const filtered = result.current.filteredConversations;
    // agent-1 and agent-2 are in the same department
    expect(filtered.some(c => c.contact.id === 'c1')).toBe(true);
    expect(filtered.some(c => c.contact.id === 'c2')).toBe(true);
    expect(filtered.length).toBe(2);
  });

  it('filters by "all" scope correctly', () => {
    const { result } = renderHook(() => useInboxFilters({ 
      conversations: mockConversations as any, 
      profileId: 'agent-1' 
    }));
    
    result.current.setScope('all');
    
    const filtered = result.current.filteredConversations;
    // In subTab='attending', scope='all' shows everything that is not 'waiting' (assigned is not null)
    // Actually, in the current implementation, it shows everything if mainTab='open' and subTab='attending'
    // unless it's explicitly waiting.
    expect(filtered.length).toBe(2); // c1, c2 (assigned)
  });
});
