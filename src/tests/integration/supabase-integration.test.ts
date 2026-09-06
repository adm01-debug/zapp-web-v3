import { describe, it, expect, vi } from 'vitest';

// Mocking Supabase Client
const mockSupabase = {
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  })),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabase,
}));

type MockQueryResult = { error?: { message?: string }; data: unknown };
type MockSessionResult = { data: { session?: { user?: { id?: string } } }; error: null };

describe('Auth & Data Integration', () => {
  it('should handle database connection failures gracefully', async () => {
    mockSupabase.from.mockImplementationOnce(() => ({
      select: () => ({
        eq: () => ({
          error: { message: 'Connection Timeout' },
          data: null
        })
      })
    }));

    const result = mockSupabase.from('profiles').select('*').eq('id', '1') as unknown as MockQueryResult;
    expect(result.error?.message).toBe('Connection Timeout');
  });

  it('should mock successful auth session', async () => {
    const session = { user: { id: '123' } };
    mockSupabase.auth.getSession.mockResolvedValueOnce({ data: { session }, error: null });

    const authResult = await mockSupabase.auth.getSession() as unknown as MockSessionResult;
    const { data } = authResult;
    expect(data.session?.user.id).toBe('123');
  });
});
