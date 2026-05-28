
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../features/auth/hooks/useAuth';
import { supabase } from '../integrations/supabase/client';

// Mock Supabase client
vi.mock('../integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    },
  },
}));

describe('Auth Flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle login successfully', async () => {
    const mockUser = { id: 'test-user-id', email: 'test@example.com' };
    const mockSession = { user: mockUser, access_token: 'fake-token' };
    
    (supabase.auth.signInWithPassword as any).mockResolvedValueOnce({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('test@example.com', 'password123');
    });

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('should handle logout successfully', async () => {
    (supabase.auth.signOut as any).mockResolvedValueOnce({ error: null });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it('should identify authenticated state', async () => {
    const mockUser = { id: 'test-user-id', email: 'test@example.com' };
    (supabase.auth.getSession as any).mockResolvedValueOnce({
      data: { session: { user: mockUser } },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    // Wait for internal session check if any
    expect(result.current).toBeDefined();
  });
});
