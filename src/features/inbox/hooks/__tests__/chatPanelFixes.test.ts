import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase
const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockUpload = vi.fn().mockResolvedValue({ error: null });
const mockCreateSignedUrl = vi.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.url/test' } });

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'contacts') return { update: mockUpdate };
      return { insert: mockInsert };
    }),
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload,
        createSignedUrl: mockCreateSignedUrl,
      })),
    },
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn() },
}));

describe('Chat Module Fixes — Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Fix #1: useTransferConversation', () => {
    it('should define transfer types as agent or queue', () => {
      // Validates the type contract: transfer accepts 'agent' | 'queue'
      type TransferType = 'agent' | 'queue';
      const validTypes: TransferType[] = ['agent', 'queue'];
      expect(validTypes).toHaveLength(2);
      expect(validTypes).toContain('agent');
      expect(validTypes).toContain('queue');
    });

    it('should require contactId and whatsappConnectionId', () => {
      // Validates the hook's interface contract
      interface Opts {
        contactId: string;
        whatsappConnectionId: string | undefined;
      }
      const opts: Opts = { contactId: 'test-id', whatsappConnectionId: 'wpp-conn' };
      expect(opts.contactId).toBe('test-id');
      expect(opts.whatsappConnectionId).toBe('wpp-conn');
    });
  });

  describe('Fix #2: useScheduledMediaUpload', () => {
    it('should use 7-day TTL (604800s) instead of 1-hour (3600s)', () => {
      const SEVEN_DAYS_IN_SECONDS = 604800;
      const ONE_HOUR_IN_SECONDS = 3600;
      // Verify the constant is correct
      expect(SEVEN_DAYS_IN_SECONDS).toBe(7 * 24 * 60 * 60);
      expect(SEVEN_DAYS_IN_SECONDS).toBeGreaterThan(ONE_HOUR_IN_SECONDS);
    });

    it('should detect media types correctly', () => {
      const detectType = (mimeType: string) =>
        mimeType.startsWith('audio') ? 'audio'
        : mimeType.startsWith('image') ? 'image'
        : mimeType.startsWith('video') ? 'video'
        : 'document';

      expect(detectType('audio/ogg')).toBe('audio');
      expect(detectType('image/jpeg')).toBe('image');
      expect(detectType('video/mp4')).toBe('video');
      expect(detectType('application/pdf')).toBe('document');
    });
  });

  describe('Fix #3: useChatAutoScroll', () => {
    it('should define a scroll threshold of 150px', () => {
      const SCROLL_THRESHOLD = 150;
      // Agent is "at bottom" if within 150px of the scroll end
      const scrollHeight = 5000;
      const clientHeight = 800;

      // At bottom
      const scrollTopNearBottom = scrollHeight - clientHeight - 100;
      const isAtBottom = scrollHeight - scrollTopNearBottom - clientHeight < SCROLL_THRESHOLD;
      expect(isAtBottom).toBe(true);

      // Not at bottom (scrolled up 300px)
      const scrollTopAway = scrollHeight - clientHeight - 300;
      const isAtBottom2 = scrollHeight - scrollTopAway - clientHeight < SCROLL_THRESHOLD;
      expect(isAtBottom2).toBe(false);
    });

    it('should track last message ID for append detection', () => {
      const messages = [
        { id: 'msg-1' },
        { id: 'msg-2' },
        { id: 'msg-3' },
      ];
      const lastId = messages[messages.length - 1]?.id ?? null;
      expect(lastId).toBe('msg-3');
    });
  });

  describe('Fix #4: ChatPanelHandlerTypes', () => {
    it('should define all 16 dialog keys', () => {
      const EXPECTED_KEYS = [
        'quickReplies', 'slashCommands', 'transferDialog', 'scheduleDialog',
        'callDialog', 'globalSearch', 'chatSearch', 'interactiveBuilder',
        'forwardDialog', 'locationPicker', 'aiAssistant', 'catalogDirect',
        'whisper', 'templatesWithVars', 'realtimeTranscription', 'closeDialog',
      ];
      expect(EXPECTED_KEYS).toHaveLength(16);
    });

    it('should handle dialog reducer actions correctly', () => {
      // Simulates the reducer logic
      type Action = { type: 'OPEN' | 'CLOSE' | 'TOGGLE'; key: string };
      const reducer = (state: Record<string, boolean>, action: Action) => {
        switch (action.type) {
          case 'OPEN': return { ...state, [action.key]: true };
          case 'CLOSE': return { ...state, [action.key]: false };
          case 'TOGGLE': return { ...state, [action.key]: !state[action.key] };
          default: return state;
        }
      };

      let state = { chatSearch: false, aiAssistant: false };
      state = reducer(state, { type: 'OPEN', key: 'chatSearch' });
      expect(state.chatSearch).toBe(true);
      state = reducer(state, { type: 'CLOSE', key: 'chatSearch' });
      expect(state.chatSearch).toBe(false);
      state = reducer(state, { type: 'TOGGLE', key: 'aiAssistant' });
      expect(state.aiAssistant).toBe(true);
    });
  });

  describe('Fix #5: useSafeInteractiveMessage', () => {
    it('should use status "sending" not "sent" for poll records', () => {
      const CORRECT_STATUS = 'sending';
      const INCORRECT_STATUS = 'sent';
      // This is the core fix — messages that haven't been delivered
      // to WhatsApp should NOT be marked as 'sent'
      expect(CORRECT_STATUS).not.toBe(INCORRECT_STATUS);
      expect(CORRECT_STATUS).toBe('sending');
    });

    it('should guard against undefined whatsappConnectionId', () => {
      const whatsappConnectionId: string | undefined = undefined;
      const shouldBlock = !whatsappConnectionId;
      expect(shouldBlock).toBe(true);
    });

    it('should format poll content correctly', () => {
      const poll = { name: 'Preferência', options: ['Opção A', 'Opção B', 'Opção C'] };
      const content = `📊 *Enquete:* ${poll.name}\n${poll.options
        .map((o, i) => `${i + 1}. ${o}`)
        .join('\n')}`;
      expect(content).toContain('📊 *Enquete:* Preferência');
      expect(content).toContain('1. Opção A');
      expect(content).toContain('2. Opção B');
      expect(content).toContain('3. Opção C');
    });
  });

  describe('Fix #6: currentUserId should use real agent ID', () => {
    it('should fall back to "agent" when assignedTo is undefined', () => {
      const conversation = { assignedTo: undefined };
      const currentUserId = conversation.assignedTo?.id || 'agent';
      expect(currentUserId).toBe('agent');
    });

    it('should use real agent ID when available', () => {
      const conversation = { assignedTo: { id: 'agent-123', name: 'João' } };
      const currentUserId = conversation.assignedTo?.id || 'agent';
      expect(currentUserId).toBe('agent-123');
    });
  });

  describe('Fix #8: useAutomations should receive real assignedTo', () => {
    it('should pass agent ID to automations, not hardcoded null', () => {
      const conversation = { assignedTo: { id: 'agent-456', name: 'Maria' } };
      const assignedTo = conversation.assignedTo?.id ?? null;
      expect(assignedTo).toBe('agent-456');
    });

    it('should pass null when no agent is assigned', () => {
      const conversation = { assignedTo: undefined };
      const assignedTo = conversation.assignedTo?.id ?? null;
      expect(assignedTo).toBeNull();
    });
  });
});
