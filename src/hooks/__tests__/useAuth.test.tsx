// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';

// Mock supabase before importing useAuth
const mockUnsubscribe = vi.fn();
const mockOnAuthStateChange = vi.fn().mockReturnValue({
  data: { subscription: { unsubscribe: mockUnsubscribe } },
});
const mockGetSession = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (...args: any[]) => mockOnAuthStateChange(...args),
      getSession: (...args: any[]) => mockGetSession(...args),
      signInWithPassword: (...args: any[]) => mockSignInWithPassword(...args),
      signUp: (...args: any[]) => mockSignUp(...args),
      signOut: (...args: any[]) => mockSignOut(...args),
    },
    from: (...args: any[]) => mockFrom(...args),
  },
}));

import { AuthProvider, useAuth } from '@/features/auth';

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    });
  });

  it('throws error when used outside AuthProvider', () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');
  });

  it('starts with loading=true and resolves to no user', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(result.current.profile).toBeNull();
  });

  it('loads user from existing session', async () => {
    const mockUser = { id: 'user-1', email: 'test@test.com' };
    const mockSession = { user: mockUser, access_token: 'token' };

    mockGetSession.mockResolvedValue({ data: { session: mockSession } });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'p1', user_id: 'user-1', name: 'Test', role: 'agent', max_chats: 5 },
            error: null,
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.session).toEqual(mockSession);
  });

  it('signIn calls supabase signInWithPassword', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    const response = await act(async () => {
      return result.current.signIn('test@test.com', 'password123');
    });

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'test@test.com',
      password: 'password123',
    });
    expect(response.error).toBeNull();
  });

  it('signIn returns error on failure', async () => {
    const mockError = new Error('Invalid credentials');
    mockSignInWithPassword.mockResolvedValue({ error: mockError });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const response = await act(async () => {
      return result.current.signIn('bad@test.com', 'wrong');
    });

    expect(response.error).toEqual(mockError);
  });

  it('signUp calls supabase signUp with correct params', async () => {
    mockSignUp.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const response = await act(async () => {
      return result.current.signUp('new@test.com', 'pass123', 'New User');
    });

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'new@test.com',
      password: 'pass123',
      options: {
        emailRedirectTo: expect.stringContaining('/'),
        data: { name: 'New User' },
      },
    });
    expect(response.error).toBeNull();
  });

  it('signOut clears profile and calls supabase signOut', async () => {
    mockSignOut.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(result.current.profile).toBeNull();
  });

  it('cleans up auth subscription on unmount', async () => {
    const { unmount } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {});
    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
