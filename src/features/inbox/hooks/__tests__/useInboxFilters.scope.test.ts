import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInboxFilters } from '../useInboxFilters';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

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
  filterByContactType: vi.fn((list) => list),
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => {
  return React.createElement(
    QueryClientProvider,
    { client: queryClient },
    React.createElement(MemoryRouter, null, children)
  );
};

describe('useInboxFilters - Scope Logic', () => {
  it('reads scope from URL correctly and overrides localStorage', () => {
    // Setup URL with 'department'
    const searchParams = new URLSearchParams('scope=department');
    vi.stubGlobal('location', { search: '?' + searchParams.toString(), hash: '' });
    
    // Setup localStorage with 'mine'
    const localStorageMock = {
      getItem: vi.fn((key) => key === 'inbox_scope' ? 'mine' : null),
      setItem: vi.fn()
    };
    vi.stubGlobal('localStorage', localStorageMock);

    const { result } = renderHook(() => useInboxFilters({ 
      conversations: mockConversations as any, 
      profileId: 'agent-1' 
    }), { wrapper: ({ children }) => React.createElement(QueryClientProvider, { client: queryClient }, React.createElement(MemoryRouter, { initialEntries: ['/inbox?scope=department'] }, children)) });
    
    // Should favor URL 'department' over localStorage 'mine'
    expect(result.current.scope).toBe('department');
  });

  it('filters by "mine" scope correctly', () => {
    const { result } = renderHook(() => useInboxFilters({ 
      conversations: mockConversations as any, 
      profileId: 'agent-1' 
    }), { wrapper });
    
    expect(result.current.scope).toBe('mine');
    const filtered = result.current.filteredConversations;
    expect(filtered).toHaveLength(1);
    expect(filtered[0].contact.id).toBe('c1');
  });

  it('filters by "department" scope correctly', async () => {
    const { result } = renderHook(() => useInboxFilters({ 
      conversations: mockConversations as any, 
      profileId: 'agent-1' 
    }), { wrapper });
    
    await act(async () => {
      result.current.setScope('department');
      result.current.setDepartmentAgentIds(['agent-1', 'agent-2']);
    });
    
    const filtered = result.current.filteredConversations;
    expect(filtered.some(c => c.contact.id === 'c1')).toBe(true);
    expect(filtered.some(c => c.contact.id === 'c2')).toBe(true);
    expect(filtered.length).toBe(2);
  });

  it('filters by "all" scope correctly', async () => {
    const { result } = renderHook(() => useInboxFilters({ 
      conversations: mockConversations as any, 
      profileId: 'agent-1' 
    }), { wrapper });
    
    await act(async () => {
      result.current.setScope('all');
    });
    
    const filtered = result.current.filteredConversations;
    expect(filtered.length).toBe(3); // Mostra tudo (mine, dept, waiting) na aba abertos em scope='all'
  });
});
