import { describe, it, expect, vi } from 'vitest';
import { safeClient } from './safeClient';

// Mock do supabase client
vi.mock('./client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        limit: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        })),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      }))
    })),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: { success: true }, error: null }))
    }
  }
}));

describe('safeClient Masking', () => {
  it('should mask sensitive keys in detail objects', () => {
    const sensitiveData = {
      token: 'secret-token-123',
      apiKey: 'api-key-456',
      user: {
        email: 'test@example.com',
        password: 'password123'
      },
      normalField: 'visible'
    };

    const masked = safeClient.maskSensitiveData(sensitiveData);

    expect(masked.token).toBe('***MASKED***');
    expect(masked.apiKey).toBe('***MASKED***');
    expect(masked.user.password).toBe('***MASKED***');
    expect(masked.user.email).toBe('te***@example.com');
    expect(masked.normalField).toBe('visible');
  });

  it('should mask email strings', () => {
    expect(safeClient.maskEmail('john.doe@gmail.com')).toBe('jo***@gmail.com');
    expect(safeClient.maskEmail('a@b.com')).toBe('***@b.com');
  });

  it('should apply general masking to long suspicious strings', () => {
    const longToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature';
    const masked = safeClient.applyMasking(longToken);
    expect(masked).toContain('...');
    expect(masked.length).toBeLessThan(longToken.length);
  });
});
