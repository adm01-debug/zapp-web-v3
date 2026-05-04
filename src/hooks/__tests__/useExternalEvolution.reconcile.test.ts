import { describe, it, expect, vi } from 'vitest';
import { reconcileOptimistic } from '../useExternalEvolution';
import type { RealtimeMessage } from '@/features/inbox';

describe('useExternalEvolution: reconcileOptimistic', () => {
  const now = new Date().toISOString();
  
  const createMsg = (id: string, overrides: Partial<RealtimeMessage> = {}): RealtimeMessage => ({
    id,
    contact_id: 'contact1',
    content: 'hello',
    sender: 'agent',
    message_type: 'text',
    created_at: now,
    updated_at: now,
    status: 'sent',
    is_read: false,
    external_id: null,
    whatsapp_connection_id: null,
    transcription: null,
    transcription_status: null,
    is_deleted: false,
    contactAvatar: null,
    ...overrides
  });

  it('should reconcile by external_id', () => {
    const optimistic = createMsg('optimistic:1', { external_id: 'ext123', status: 'sending' });
    const canonical = createMsg('can1', { external_id: 'ext123', status: 'sent' });

    const { filteredPrev, additions } = reconcileOptimistic([optimistic], [canonical]);

    // Optimistic should be removed because external_id matched
    expect(filteredPrev).toHaveLength(0);
    // Canonical should be added
    expect(additions).toHaveLength(1);
    expect(additions[0].id).toBe('can1');
  });

  it('should promote status if optimistic has higher rank (delivered vs sent)', () => {
    // Rank: sending < sent < delivered < read
    const optimistic = createMsg('optimistic:1', { external_id: 'ext123', status: 'delivered' });
    const canonical = createMsg('can1', { external_id: 'ext123', status: 'sent' });

    const { additions } = reconcileOptimistic([optimistic], [canonical]);

    // Canonical should inherit 'delivered' from the optimistic bubble
    expect(additions[0].status).toBe('delivered');
  });

  it('should fallback to text content match within window', () => {
    const optimistic = createMsg('optimistic:1', { content: 'hello matching', external_id: null });
    const canonical = createMsg('can1', { content: 'hello matching', external_id: 'ext123' });

    const { filteredPrev, additions } = reconcileOptimistic([optimistic], [canonical]);

    expect(filteredPrev).toHaveLength(0);
    expect(additions).toHaveLength(1);
  });

  it('should NOT match text content if window is exceeded', () => {
    const tenMinutesAgo = new Date(Date.now() - 600_000).toISOString();
    const optimistic = createMsg('optimistic:1', { content: 'hello matching', created_at: tenMinutesAgo });
    const canonical = createMsg('can1', { content: 'hello matching', created_at: now });

    const { filteredPrev, additions } = reconcileOptimistic([optimistic], [canonical]);

    // Should NOT match because > 2min
    expect(filteredPrev).toHaveLength(1);
    expect(additions).toHaveLength(1);
  });

  it('should fallback to media type match for non-text messages', () => {
    const optimistic = createMsg('optimistic:1', { message_type: 'audio', content: '[Áudio]', media_url: 'blob:1' });
    const canonical = createMsg('can1', { message_type: 'audio', content: '', external_id: 'ext123' });

    const { filteredPrev, additions } = reconcileOptimistic([optimistic], [canonical]);

    expect(filteredPrev).toHaveLength(0);
    expect(additions).toHaveLength(1);
    // Canonical should inherit media_url from optimistic placeholder
    expect(additions[0].media_url).toBe('blob:1');
  });

  it('should remap IDs correctly', () => {
    const optimistic = createMsg('optimistic:1', { external_id: 'ext123' });
    const canonical = createMsg('can1', { external_id: 'ext123' });

    const { remap } = reconcileOptimistic([optimistic], [canonical]);

    expect(remap.get('optimistic:1')).toBe('can1');
  });
});
