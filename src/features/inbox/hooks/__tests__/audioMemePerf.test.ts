import { describe, it, expect, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { sendExternalAudio } from '../realtime/externalMessageSender';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  getLogger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }),
}));

vi.mock('@/adapters/evolutionAdapter', () => ({
  jidToPhone: vi.fn((jid) => jid.split('@')[0]),
}));

vi.mock('@/features/inbox', () => ({
  parseEvolutionError: vi.fn((err) => ({ reason: 'Error', status: 500 })),
  makeOptimisticBubble: vi.fn((jid, content, opts) => ({ id: 'opt-123', ...opts }))
}));

global.URL.createObjectURL = vi.fn(() => 'blob:test');

describe('Performance Metric: Multipart vs Legacy Storage', () => {
  it('Architecture Verification: should NOT call supabase.storage.upload', async () => {
    const storageSpy = vi.spyOn(supabase as any, 'from');
    (supabase.functions.invoke as any).mockResolvedValue({ data: { key: { id: '123' } }, error: null });

    await sendExternalAudio('5511999999999@s.whatsapp.net', new Blob(['test']), { isPtt: true });

    // Ensure we are skipping the storage upload step entirely
    const storageCalls = storageSpy.mock.calls.filter(call => call[0] === 'audio-messages');
    expect(storageCalls.length).toBe(0);
  });
});
