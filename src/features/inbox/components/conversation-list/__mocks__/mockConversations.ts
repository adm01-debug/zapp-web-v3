import type { Conversation } from '@/types/chat';
import type { ConversationWithMessages, ConversationContact, RealtimeMessage } from '@/features/inbox/hooks/useRealtimeMessages';

// Extensão do tipo para compatibilidade com useRealtimeMessages e o componente ConversationItem legado
export interface MockConversationWithMessages extends ConversationWithMessages {
  id: string;
  status: 'open' | 'pending' | 'resolved' | 'waiting';
  priority: 'high' | 'medium' | 'low';
  updatedAt: Date; // Usado pelo formatDistanceToNow
  tags: string[];
}

const now = Date.now();
const minutesAgo = (m: number) => new Date(now - m * 60_000);
const hoursAgo = (h: number) => new Date(now - h * 60 * 60_000);
const daysAgo = (d: number) => new Date(now - d * 24 * 60 * 60_000);

const createMockMessage = (id: string, contactId: string, content: string, sender: 'contact' | 'agent', timestamp: Date): RealtimeMessage => ({
  id,
  contact_id: contactId,
  agent_id: sender === 'agent' ? 'agent-1' : null,
  content,
  sender,
  message_type: 'text',
  media_url: null,
  is_read: true,
  status: 'read',
  status_updated_at: timestamp.toISOString(),
  created_at: timestamp.toISOString(),
  updated_at: timestamp.toISOString(),
  external_id: `ext-${id}`,
  whatsapp_connection_id: 'conn-1',
  transcription: null,
  transcription_status: null,
  is_deleted: false
});

export const MOCK_CONVERSATIONS: any[] = [
  {
    id: 'mock-1',
    status: 'open',
    priority: 'high',
    unreadCount: 7,
    tags: ['vip', 'enterprise'],
    updatedAt: minutesAgo(2),
    contact: {
      id: 'mock-contact-1',
      name: 'Maria Eduarda Souza Oliveira',
      company: 'Acme Corporation Ltda.',
      phone: '5511988887777',
      tags: ['vip', 'enterprise', 'renovação', 'q2-2026'],
      created_at: daysAgo(120).toISOString(),
      updated_at: minutesAgo(2).toISOString(),
      contact_type: 'whatsapp',
      avatar_url: 'https://i.pravatar.cc/150?img=47',
    },
    lastMessage: createMockMessage('m1', 'mock-contact-1', 'Bom dia! Recebi a proposta atualizada e gostaria de agendar uma call.', 'contact', minutesAgo(2)),
    messages: []
  },
  {
    id: 'mock-2',
    status: 'pending',
    priority: 'medium',
    unreadCount: 0,
    tags: ['lead'],
    updatedAt: minutesAgo(15),
    contact: {
      id: 'mock-contact-2',
      name: 'João Silva',
      company: 'Tech Solutions',
      phone: '5511977776666',
      tags: ['lead'],
      created_at: daysAgo(30).toISOString(),
      updated_at: minutesAgo(15).toISOString(),
      contact_type: 'whatsapp',
    },
    lastMessage: createMockMessage('m2', 'mock-contact-2', 'Perfeito, obrigado!', 'contact', minutesAgo(15)),
    messages: []
  },
  {
    id: 'mock-3',
    status: 'open',
    priority: 'low',
    unreadCount: 3,
    tags: ['suporte'],
    updatedAt: minutesAgo(45),
    contact: {
      id: 'mock-contact-3',
      name: 'Ana Carolina',
      company: null,
      phone: '5511966665555',
      tags: ['suporte', 'bug-report'],
      created_at: daysAgo(15).toISOString(),
      updated_at: minutesAgo(45).toISOString(),
      contact_type: 'instagram',
      ai_sentiment: 'negative'
    },
    lastMessage: createMockMessage('m3', 'mock-contact-3', 'Continua sem funcionar 😡', 'contact', minutesAgo(45)),
    messages: []
  },
  {
    id: 'mock-4',
    status: 'waiting',
    priority: 'medium',
    unreadCount: 0,
    tags: [],
    updatedAt: hoursAgo(2),
    contact: {
      id: 'mock-contact-4',
      name: '',
      company: 'PromoGifts & Brindes',
      phone: '5511955554444',
      tags: [],
      created_at: daysAgo(60).toISOString(),
      updated_at: hoursAgo(2).toISOString(),
      contact_type: 'email',
    },
    lastMessage: null,
    messages: []
  },
  {
    id: 'mock-5',
    status: 'open',
    priority: 'high',
    unreadCount: 12,
    tags: ['urgente'],
    updatedAt: minutesAgo(1),
    contact: {
      id: 'mock-contact-5',
      name: 'Roberto Carlos Pereira da Silva Neto',
      company: 'Multinacional Internacional Brasil S/A',
      phone: '5511944443333',
      tags: ['urgente', 'churn-risk', 'c-level'],
      created_at: daysAgo(200).toISOString(),
      updated_at: minutesAgo(1).toISOString(),
      contact_type: 'whatsapp',
      avatar_url: 'https://i.pravatar.cc/150?img=33',
      ai_sentiment: 'negative'
    },
    lastMessage: createMockMessage('m5', 'mock-contact-5', 'Preciso de uma resposta URGENTE sobre o cancelamento do contrato.', 'contact', minutesAgo(1)),
    messages: []
  },
  {
    id: 'mock-6',
    status: 'resolved',
    priority: 'low',
    unreadCount: 0,
    tags: ['parceiro'],
    updatedAt: hoursAgo(8),
    contact: {
      id: 'mock-contact-6',
      name: 'Carla Mendes',
      company: 'Sicoob',
      phone: '5511933332222',
      tags: ['parceiro'],
      created_at: daysAgo(90).toISOString(),
      updated_at: hoursAgo(8).toISOString(),
      contact_type: 'sicoob_gifts',
      avatar_url: 'https://i.pravatar.cc/150?img=23',
      ai_sentiment: 'positive'
    },
    lastMessage: createMockMessage('m6', 'mock-contact-6', 'Ok, resolvido! Valeu pelo suporte 🙏', 'contact', hoursAgo(8)),
    messages: []
  },
  {
    id: 'mock-7',
    status: 'pending',
    priority: 'medium',
    unreadCount: 1,
    tags: ['demo'],
    updatedAt: hoursAgo(3),
    contact: {
      id: 'mock-contact-7',
      name: 'Fernanda Lima',
      company: 'Bitrix24 BR',
      phone: '5511922221111',
      tags: ['integração-crm', 'demo-agendada'],
      created_at: daysAgo(45).toISOString(),
      updated_at: hoursAgo(3).toISOString(),
      contact_type: 'phone',
    },
    lastMessage: createMockMessage('m7', 'mock-contact-7', 'Pode me ligar amanhã às 10h?', 'agent', hoursAgo(3)),
    messages: []
  },
  {
    id: 'mock-8',
    status: 'open',
    priority: 'low',
    unreadCount: 0,
    tags: [],
    updatedAt: daysAgo(1),
    contact: {
      id: 'mock-contact-8',
      name: 'Pedro Henrique',
      company: null,
      phone: '5511911110000',
      tags: [],
      created_at: daysAgo(20).toISOString(),
      updated_at: daysAgo(1).toISOString(),
      contact_type: 'whatsapp',
    },
    lastMessage: createMockMessage('m8', 'mock-contact-8', '👍', 'contact', daysAgo(1)),
    messages: []
  },
];
