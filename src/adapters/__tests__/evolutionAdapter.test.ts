import { describe, it, expect } from 'vitest';
import { 
  jidToPhone, 
  evolutionToRealtimeMessage, 
  extractMessageType,
  deriveContactsFromMessages,
  buildExternalConversations
} from '../evolutionAdapter';
import type { EvolutionMessage } from '@/types/evolutionExternal';

describe('evolutionAdapter', () => {
  describe('jidToPhone', () => {
    it('should extract phone from whatsapp jid', () => {
      expect(jidToPhone('5511999990001@s.whatsapp.net')).toBe('5511999990001');
    });

    it('should handle jids without @', () => {
      expect(jidToPhone('5511999990001')).toBe('5511999990001');
    });
  });

  describe('extractMessageType', () => {
    it('should map conversation to text', () => {
      const result = extractMessageType('conversation');
      expect(result.internalType).toBe('text');
      expect(result.supported).toBe(true);
    });

    it('should map imageMessage to image', () => {
      const result = extractMessageType('imageMessage');
      expect(result.internalType).toBe('image');
    });

    it('should handle short aliases like "image"', () => {
      const result = extractMessageType('image');
      expect(result.internalType).toBe('image');
    });

    it('should return unsupported for unknown types', () => {
      const result = extractMessageType('unknownType');
      expect(result.internalType).toBe('unsupported');
      expect(result.supported).toBe(false);
      expect(result.category).toBe('unknown');
    });

    it('should handle null/undefined', () => {
      expect(extractMessageType(null).internalType).toBe('text');
      expect(extractMessageType(undefined).internalType).toBe('text');
    });
  });

  describe('evolutionToRealtimeMessage', () => {
    it('should map a basic message correctly', () => {
      const evo: EvolutionMessage = {
        id: '123',
        message_id: 'ext123',
        remote_jid: '5511@s.whatsapp.net',
        from_me: true,
        content: 'hello',
        message_type: 'conversation',
        created_at: '2026-01-01T10:00:00Z',
        direction: 'outbound',
        status: 'sent',
        instance_name: 'wpp2'
      } as any;

      const result = evolutionToRealtimeMessage(evo);
      expect(result.id).toBe('123');
      expect(result.external_id).toBe('ext123');
      expect(result.sender).toBe('agent');
      expect(result.content).toBe('hello');
      expect(result.message_type).toBe('text');
    });
  });

  describe('deriveContactsFromMessages', () => {
    it('should group messages by remote_jid and sort by recency', () => {
      const messages: EvolutionMessage[] = [
        {
          remote_jid: 'user1@s.whatsapp.net',
          created_at: '2026-01-01T10:00:00Z',
          content: 'old',
          from_me: false,
          status: 'read'
        },
        {
          remote_jid: 'user2@s.whatsapp.net',
          created_at: '2026-01-01T11:00:00Z',
          content: 'newest',
          from_me: false,
          status: 'sent'
        },
        {
          remote_jid: 'user1@s.whatsapp.net',
          created_at: '2026-01-01T10:30:00Z',
          content: 'latest-user1',
          from_me: false,
          status: 'sent'
        }
      ] as any[];

      const contacts = deriveContactsFromMessages(messages);
      
      expect(contacts).toHaveLength(2);
      // user2 is the most recent (11:00)
      expect(contacts[0].remoteJid).toBe('user2@s.whatsapp.net');
      expect(contacts[0].unreadCount).toBe(1);
      
      // user1 has 2 messages, 1 unread (the 10:30 one, since 10:00 was read)
      expect(contacts[1].remoteJid).toBe('user1@s.whatsapp.net');
      expect(contacts[1].unreadCount).toBe(1);
      expect(contacts[1].lastMessageContent).toBe('latest-user1');
    });
  });
});
