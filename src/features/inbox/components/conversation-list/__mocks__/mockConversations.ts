import type { Conversation, ConversationContact, RealtimeMessage } from '@/types/chat';
import { ConversationWithMessages } from '@/features/inbox/hooks/useRealtimeMessages';

// Extensão do tipo para compatibilidade com useRealtimeMessages
export interface MockConversationWithMessages extends ConversationWithMessages {
  // Adiciona campos do tipo legado se necessário para ConversationItem
  id: string;
  status: 'open' | 'pending' | 'resolved' | 'waiting';
  priority: 'high' | 'medium' | 'low';
}


/**
 * Mock data set for visualizing the ConversationItem sidebar layout.
 * Covers all edge cases:
 *  - Long names + long companies (truncation)
 *  - Single name without company
 *  - Company without name
 *  - No tags / many tags / long tag labels
 *  - No last message
 *  - Long last message (truncation)
 *  - High unread count
 *  - High priority
 *  - Different statuses (open / pending / waiting / resolved)
 *  - Different channels (whatsapp / instagram / email / phone)
 *  - Sentiments (positive / neutral / negative / critical)
 *  - Assigned agent vs unassigned
 *  - Muted conversation
 */

const now = Date.now();
const minutesAgo = (m: number) => new Date(now - m * 60_000);
const hoursAgo = (h: number) => new Date(now - h * 60 * 60_000);
const daysAgo = (d: number) => new Date(now - d * 24 * 60 * 60_000);

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'mock-1',
    status: 'open',
    priority: 'high',
    unreadCount: 7,
    tags: [],
    createdAt: daysAgo(3),
    updatedAt: minutesAgo(2),
    sentiment: 'positive',
    contact: {
      id: 'mock-contact-1',
      name: 'Maria Eduarda Souza Oliveira',
      company: 'Acme Corporation Ltda.',
      phone: '5511988887777',
      tags: ['vip', 'enterprise', 'renovação', 'q2-2026'],
      createdAt: daysAgo(120),
      contact_type: 'whatsapp',
      avatar: 'https://i.pravatar.cc/150?img=47',
    },
    lastMessage: {
      id: 'mock-msg-1',
      conversationId: 'mock-1',
      content: 'Bom dia! Recebi a proposta atualizada e gostaria de agendar uma call ainda essa semana para revisar os termos antes do fechamento.',
      type: 'text',
      sender: 'contact',
      timestamp: minutesAgo(2),
      status: 'delivered',
    },
    assignedTo: {
      id: 'agent-1', name: 'Lucas Pereira', email: 'lucas@zapp.com',
      role: 'agent', status: 'online', activeChats: 4, maxChats: 10, queues: [],
      avatar: 'https://i.pravatar.cc/150?img=12',
    },
  },
  {
    id: 'mock-2',
    status: 'pending',
    priority: 'medium',
    unreadCount: 0,
    tags: [],
    createdAt: daysAgo(1),
    updatedAt: minutesAgo(15),
    contact: {
      id: 'mock-contact-2',
      name: 'João Silva',
      company: 'Tech Solutions',
      phone: '5511977776666',
      tags: ['lead'],
      createdAt: daysAgo(30),
      contact_type: 'whatsapp',
    },
    lastMessage: {
      id: 'mock-msg-2',
      conversationId: 'mock-2',
      content: 'Perfeito, obrigado!',
      type: 'text',
      sender: 'contact',
      timestamp: minutesAgo(15),
      status: 'read',
    },
  },
  {
    id: 'mock-3',
    status: 'open',
    priority: 'low',
    unreadCount: 3,
    tags: [],
    createdAt: daysAgo(2),
    updatedAt: minutesAgo(45),
    sentiment: 'negative',
    contact: {
      id: 'mock-contact-3',
      name: 'Ana',
      // sem company → fallback para nome puro
      phone: '5511966665555',
      tags: ['suporte', 'bug-report'],
      createdAt: daysAgo(15),
      contact_type: 'instagram',
    },
    lastMessage: {
      id: 'mock-msg-3',
      conversationId: 'mock-3',
      content: 'Continua sem funcionar 😡',
      type: 'text',
      sender: 'contact',
      timestamp: minutesAgo(45),
      status: 'delivered',
    },
  },
  {
    id: 'mock-4',
    status: 'waiting',
    priority: 'medium',
    unreadCount: 0,
    tags: [],
    createdAt: daysAgo(5),
    updatedAt: hoursAgo(2),
    contact: {
      id: 'mock-contact-4',
      name: '',
      // só company → fallback para empresa
      company: 'PromoGifts',
      phone: '5511955554444',
      tags: [],
      createdAt: daysAgo(60),
      contact_type: 'email',
    },
    lastMessage: undefined, // testa fallback "Sem mensagens ainda"
  },
  {
    id: 'mock-5',
    status: 'open',
    priority: 'high',
    unreadCount: 12,
    tags: [],
    createdAt: daysAgo(1),
    updatedAt: minutesAgo(1),
    sentiment: 'critical',
    contact: {
      id: 'mock-contact-5',
      name: 'Roberto Carlos Pereira da Silva Neto',
      company: 'Multinacional Internacional Brasil S/A',
      phone: '5511944443333',
      tags: ['urgente', 'churn-risk', 'c-level', 'escalado'],
      createdAt: daysAgo(200),
      contact_type: 'whatsapp',
      avatar: 'https://i.pravatar.cc/150?img=33',
    },
    lastMessage: {
      id: 'mock-msg-5',
      conversationId: 'mock-5',
      content: 'Preciso de uma resposta URGENTE sobre o cancelamento do contrato.',
      type: 'text',
      sender: 'contact',
      timestamp: minutesAgo(1),
      status: 'delivered',
    },
  },
  {
    id: 'mock-6',
    status: 'resolved',
    priority: 'low',
    unreadCount: 0,
    tags: [],
    createdAt: daysAgo(7),
    updatedAt: hoursAgo(8),
    sentiment: 'positive',
    contact: {
      id: 'mock-contact-6',
      name: 'Carla Mendes',
      company: 'Sicoob',
      phone: '5511933332222',
      tags: ['parceiro'],
      createdAt: daysAgo(90),
      contact_type: 'whatsapp',
      avatar: 'https://i.pravatar.cc/150?img=23',
    },
    lastMessage: {
      id: 'mock-msg-6',
      conversationId: 'mock-6',
      content: 'Ok, resolvido! Valeu pelo suporte 🙏',
      type: 'text',
      sender: 'contact',
      timestamp: hoursAgo(8),
      status: 'read',
    },
    is_muted: true,
  },
  {
    id: 'mock-7',
    status: 'pending',
    priority: 'medium',
    unreadCount: 1,
    tags: [],
    createdAt: daysAgo(4),
    updatedAt: hoursAgo(3),
    contact: {
      id: 'mock-contact-7',
      name: 'Fernanda Lima',
      company: 'Bitrix24 BR',
      phone: '5511922221111',
      tags: ['integração-crm', 'voip-config-pendente', 'demo-agendada'],
      createdAt: daysAgo(45),
      contact_type: 'phone',
    },
    lastMessage: {
      id: 'mock-msg-7',
      conversationId: 'mock-7',
      content: 'Pode me ligar amanhã às 10h?',
      type: 'text',
      sender: 'agent',
      timestamp: hoursAgo(3),
      status: 'sent',
    },
  },
  {
    id: 'mock-8',
    status: 'open',
    priority: 'low',
    unreadCount: 0,
    tags: [],
    createdAt: daysAgo(10),
    updatedAt: daysAgo(1),
    contact: {
      id: 'mock-contact-8',
      name: 'Pedro Henrique',
      // sem company, sem tags → testa duplo fallback
      phone: '5511911110000',
      tags: [],
      createdAt: daysAgo(20),
      contact_type: 'whatsapp',
    },
    lastMessage: {
      id: 'mock-msg-8',
      conversationId: 'mock-8',
      content: '👍',
      type: 'text',
      sender: 'contact',
      timestamp: daysAgo(1),
      status: 'read',
    },
  },
];
