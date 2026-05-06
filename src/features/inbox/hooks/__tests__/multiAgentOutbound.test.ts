import { describe, it, expect, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { sendExternalAudio } from '../realtime/externalMessageSender';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'agent-123' } } }),
    }
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

vi.mock('@/lib/utils/fileHash', () => ({
  calculateFileHash: vi.fn().mockResolvedValue('hash-123'),
}));

global.URL.createObjectURL = vi.fn(() => 'blob:test');

describe('E2E: Multi-Agent Outbound Journey', () => {
  it('should log audit event with correct agent context and instance', async () => {
    (supabase.functions.invoke as any).mockResolvedValue({ data: { key: { id: 'msg-real-123' } }, error: null });

    const auditSpy = vi.spyOn(supabase, 'rpc');

    await sendExternalAudio('5511999999999@s.whatsapp.net', new Blob(['test']), { 
      instanceName: 'wpp-finance',
      conversationId: 'conv-456'
    });

    // Check if the audit RPC was called correctly
    expect(auditSpy).toHaveBeenCalledWith('rpc_log_outbound_event', expect.objectContaining({
      p_instance_name: 'wpp-finance',
      p_status: 'sent',
      p_message_type: 'audio'
    }));
  });

  it('should handle and log errors with retry context', async () => {
    (supabase.functions.invoke as any).mockResolvedValue({ data: { error: true, status: 429 }, error: null });
    const auditSpy = vi.spyOn(supabase, 'rpc');

    try {
      await sendExternalAudio('5511999999999@s.whatsapp.net', new Blob(['test']));
    } catch (e) {
      // expected
    }

    expect(auditSpy).toHaveBeenCalledWith('rpc_log_outbound_event', expect.objectContaining({
      p_status: 'failed',
      p_error_code: '500' // mocked parseEvolutionError returns 500
    }));
  });
});
