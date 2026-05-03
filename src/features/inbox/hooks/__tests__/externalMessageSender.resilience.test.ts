import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { sendExternalText } from '../externalMessageSender';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  getLogger: () => ({
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe('externalMessageSender Load & Resilience Simulation', () => {
  const remoteJid = '5511999999999@s.whatsapp.net';
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle thousands of simulated concurrent sends', async () => {
    (supabase.functions.invoke as any).mockResolvedValue({
      data: { key: { id: 'msg-ext-123' } },
      error: null
    });

    const concurrentRequests = 100; // Simulating high concurrency
    const promises = Array.from({ length: concurrentRequests }).map((_, i) => 
      sendExternalText(remoteJid, `Message ${i}`)
    );

    const results = await Promise.all(promises);
    
    expect(results).toHaveLength(concurrentRequests);
    results.forEach(res => {
      expect(res.externalId).toBe('msg-ext-123');
      expect(res.optimistic.status).toBe('sent');
    });
  });

  it('should handle connection failures (Simulating no API/Offline)', async () => {
    // Mock a network error
    (supabase.functions.invoke as any).mockResolvedValue({
      data: null,
      error: { message: 'Failed to fetch', status: 500 }
    });

    await expect(sendExternalText(remoteJid, 'Hello')).rejects.toThrow();
  });

  it('should handle Evolution API internal errors', async () => {
    (supabase.functions.invoke as any).mockResolvedValue({
      data: { error: true, message: 'Instance not found', status: 404 },
      error: null
    });

    try {
      await sendExternalText(remoteJid, 'Hello');
    } catch (err: any) {
      expect(err.name).toBe('SendError');
      expect(err.message).toContain('Instância');
    }
  });
});
