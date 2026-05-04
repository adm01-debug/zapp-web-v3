/**
 * Tests for inboxLegacyMapper
 *
 * Regression suite for the white-screen bug caused by useRealtimeInbox passing
 * raw RealtimeMessage[] to UI components that expected the legacy Message
 * shape (with `timestamp: Date`, `conversationId`, `type`, etc).
 *
 * These tests guarantee the mapper:
 *  - Always returns a valid `timestamp: Date` (never undefined → no crash on
 *    `.getTime()` calls downstream).
 *  - Never throws on null/undefined optional fields from the FATOR X DB.
 *  - Preserves the conversationId so message bubbles render in the right chat.
 *  - Maps message_type → type without losing data.
 */
import { describe, it, expect } from 'vitest';
import {
  mapToLegacyConversation,
  mapToLegacyMessages,
} from '@/adapters/inboxLegacyMapper';
import type {
  ConversationWithMessages,
  RealtimeMessage,
  ConversationContact,
} from '@/features/inbox';

const buildContact = (overrides: Partial<ConversationContact> = {}): ConversationContact => ({
  id: 'contact-1',
  name: 'Alice',
  surname: null,
  nickname: null,
  phone: '5511999999999',
  email: null,
  avatar_url: null,
  tags: null,
  company: null,
  job_title: null,
  assigned_to: null,
  queue_id: null,
  created_at: '2026-05-04T10:00:00.000Z',
  updated_at: '2026-05-04T10:00:00.000Z',
  whatsapp_connection_id: null,
  contact_type: null,
  group_category: null,
  ai_sentiment: null,
  ...overrides,
});

const buildMsg = (overrides: Partial<RealtimeMessage> = {}): RealtimeMessage => ({
  id: 'msg-1',
  contact_id: 'contact-1',
  agent_id: null,
  content: 'Hello',
  sender: 'contact',
  message_type: 'text',
  media_url: null,
  is_read: false,
  status: 'delivered',
  status_updated_at: null,
  created_at: '2026-05-04T10:05:00.000Z',
  updated_at: '2026-05-04T10:05:00.000Z',
  external_id: null,
  whatsapp_connection_id: null,
  transcription: null,
  transcription_status: null,
  is_deleted: false,
  ...overrides,
});

describe('mapToLegacyMessages', () => {
  it('returns empty array on empty input without throwing', () => {
    expect(mapToLegacyMessages([], 'contact-1')).toEqual([]);
  });

  it('produces a valid `timestamp: Date` for each message (white-screen guard)', () => {
    const messages = mapToLegacyMessages([buildMsg()], 'contact-1');
    expect(messages).toHaveLength(1);
    expect(messages[0].timestamp).toBeInstanceOf(Date);
    // Downstream code calls .getTime() on this — must not throw / be NaN.
    expect(messages[0].timestamp.getTime()).not.toBeNaN();
  });

  it('preserves conversationId so the bubble renders in the right chat', () => {
    const messages = mapToLegacyMessages([buildMsg()], 'contact-42');
    expect(messages[0].conversationId).toBe('contact-42');
  });

  it('maps message_type → type and preserves media_url', () => {
    const messages = mapToLegacyMessages(
      [buildMsg({ message_type: 'audio', media_url: 'https://x/audio.mp3' })],
      'contact-1',
    );
    expect(messages[0].type).toBe('audio');
    expect(messages[0].mediaUrl).toBe('https://x/audio.mp3');
  });

  it('falls back to is_read when status is null (legacy DB rows)', () => {
    const read = mapToLegacyMessages(
      [buildMsg({ status: null, is_read: true })],
      'c',
    );
    expect(read[0].status).toBe('read');

    const unread = mapToLegacyMessages(
      [buildMsg({ status: null, is_read: false })],
      'c',
    );
    expect(unread[0].status).toBe('delivered');
  });

  it('uses contactAvatar fallback when message has none', () => {
    const messages = mapToLegacyMessages(
      [buildMsg()],
      'c',
      'https://avatar/fallback.png',
    );
    expect(messages[0].contactAvatar).toBe('https://avatar/fallback.png');
  });

  it('handles a large batch (>100) without throwing', () => {
    const batch = Array.from({ length: 250 }, (_, i) =>
      buildMsg({ id: `msg-${i}`, content: `Msg ${i}` }),
    );
    const out = mapToLegacyMessages(batch, 'contact-1');
    expect(out).toHaveLength(250);
    expect(out.every((m) => m.timestamp instanceof Date)).toBe(true);
  });

  it('does not throw when optional fields are null/undefined (FATOR X reality)', () => {
    expect(() =>
      mapToLegacyMessages(
        [
          buildMsg({
            agent_id: null,
            media_url: null,
            transcription: null,
            transcription_status: null,
            is_deleted: null,
            external_id: null,
            retry_attempt: null,
            retry_total: null,
          }),
        ],
        'c',
      ),
    ).not.toThrow();
  });
});

describe('mapToLegacyConversation', () => {
  it('returns null when input is null (defensive)', () => {
    expect(mapToLegacyConversation(null)).toBeNull();
  });

  it('builds a valid Conversation with safe Date fields', () => {
    const resolved: ConversationWithMessages = {
      contact: buildContact(),
      messages: [],
      unreadCount: 3,
      lastMessage: null,
    };
    const conv = mapToLegacyConversation(resolved);
    expect(conv).not.toBeNull();
    expect(conv!.id).toBe('contact-1');
    expect(conv!.contact.name).toBe('Alice');
    expect(conv!.unreadCount).toBe(3);
    expect(conv!.createdAt).toBeInstanceOf(Date);
    expect(conv!.updatedAt).toBeInstanceOf(Date);
    expect(conv!.createdAt.getTime()).not.toBeNaN();
  });

  it('maps lastMessage with proper Date timestamp', () => {
    const resolved: ConversationWithMessages = {
      contact: buildContact(),
      messages: [],
      unreadCount: 0,
      lastMessage: buildMsg({ content: 'last!' }),
    };
    const conv = mapToLegacyConversation(resolved);
    expect(conv!.lastMessage).toBeDefined();
    expect(conv!.lastMessage!.content).toBe('last!');
    expect(conv!.lastMessage!.timestamp).toBeInstanceOf(Date);
    expect(conv!.lastMessage!.conversationId).toBe('contact-1');
  });

  it('handles missing tags / email / avatar without throwing', () => {
    const resolved: ConversationWithMessages = {
      contact: buildContact({ tags: null, email: null, avatar_url: null }),
      messages: [],
      unreadCount: 0,
      lastMessage: null,
    };
    expect(() => mapToLegacyConversation(resolved)).not.toThrow();
    const conv = mapToLegacyConversation(resolved);
    expect(conv!.tags).toEqual([]);
    expect(conv!.contact.email).toBeUndefined();
    expect(conv!.contact.avatar).toBeUndefined();
  });
});

describe('integration: mapper output is safe for sort-by-timestamp', () => {
  it('mapped messages can be sorted by timestamp without NaN issues', () => {
    // This was the exact crash path: ChatMessagesArea sorts messages and
    // calling .getTime() on undefined timestamps produced NaN, breaking
    // the virtualized list and rendering a blank screen.
    const messages = mapToLegacyMessages(
      [
        buildMsg({ id: 'a', created_at: '2026-05-04T10:00:00Z' }),
        buildMsg({ id: 'b', created_at: '2026-05-04T11:00:00Z' }),
        buildMsg({ id: 'c', created_at: '2026-05-04T09:00:00Z' }),
      ],
      'contact-1',
    );
    const sorted = [...messages].sort(
      (x, y) => x.timestamp.getTime() - y.timestamp.getTime(),
    );
    expect(sorted.map((m) => m.id)).toEqual(['c', 'a', 'b']);
  });
});
