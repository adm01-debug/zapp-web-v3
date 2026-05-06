import { describe, it, expect, vi } from 'vitest';
import { normalizeMessage } from '../realtime/realtimeUtils';

const FUZZ_PAYLOADS = [
  { id: '1', contact_id: null, content: null },
  { id: '', contact_id: '', content: '' },
  { id: '1', contact_id: 'c1', content: 'A'.repeat(50000) }, // Huge content
  { id: '1', contact_id: 'c1', content: '<script>alert(1)</script>' },
  { id: '1', contact_id: 'c1', content: '{"json": true}' },
  { id: '1', contact_id: 'c1', content: '2026-05-06T12:00:00Z', message_type: 'audio' },
];

describe('Inbox Fuzzing - normalizeMessage', () => {
  it('should handle extreme payloads without crashing', () => {
    FUZZ_PAYLOADS.forEach((payload) => {
      const result = normalizeMessage(payload as any);
      expect(result).toBeDefined();
      expect(typeof result.content).toBe('string');
      expect(result.id).toBe(payload.id || '');
    });
  });
});
