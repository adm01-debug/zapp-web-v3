/**
 * Adapters to convert evolution_messages from external DB
 * into the frontend's Message and Conversation types
 */
import type { EvolutionMessage, DerivedContact } from '@/types/evolutionExternal';
import type { RealtimeMessage, ConversationContact, ConversationWithMessages } from '@/features/inbox';

/**
 * Extract phone number from remote_jid (e.g. "5511999990001@s.whatsapp.net" → "5511999990001")
 */
export function jidToPhone(jid: string): string {
  return jid.replace(/@.*$/, '');
}

/**
 * Convert an EvolutionMessage into the frontend's RealtimeMessage shape
 */
export function evolutionToRealtimeMessage(evo: EvolutionMessage): RealtimeMessage {
  return {
    id: evo.id,
    contact_id: evo.contact_id || evo.remote_jid, // use remote_jid as fallback ID
    agent_id: evo.from_me ? 'system' : null,
    content: evo.content || evo.caption || '',
    sender: evo.from_me || evo.direction === 'outbound' ? 'agent' : 'contact',
    message_type: mapMessageType(evo.message_type),
    media_url: evo.media_url,
    is_read: evo.status === 'read',
    status: mapStatus(evo.status),
    status_updated_at: evo.status_at,
    created_at: evo.created_at,
    updated_at: evo.created_at,
    external_id: evo.message_id,
    whatsapp_connection_id: null,
    transcription: null,
    transcription_status: null,
    is_deleted: evo.deleted_at != null,
    contactAvatar: null, // Será preenchido pelo hook useExternalMessages durante a hidratação
  };
}

/**
 * Universal extractor — Blueprint dos 18 messageTypes do Baileys/Evolution.
 *
 * Cobre os tipos canônicos enviados pelo WhatsApp/Evolution e classifica
 * cada um em três dimensões úteis para a UI:
 *  - `internalType`: vocabulário interno renderizável pelo MessageBubble
 *    (text|image|audio|video|document|sticker|location|interactive).
 *  - `category`: agrupamento semântico (text|media|interactive|location|
 *    contact|poll|reaction|system|unknown).
 *  - `supported`: true se o MessageBubble sabe renderizar nativamente; false
 *    aciona o fallback diagnóstico inline (ver `MessageBubbleUnsupported`).
 *  - `label`: nome legível para humanos (pt-BR) usado em diagnóstico/log.
 *
 * Por que existe: o `mapMessageType` antigo colapsava silenciosamente para
 * 'text' qualquer tipo desconhecido, escondendo lacunas (poll, reaction,
 * viewOnce). Este normalizador preserva a informação original e marca o
 * tipo como `unknown` para o operador ver claramente o que falta.
 */
export type InternalMessageType =
  | 'text' | 'image' | 'audio' | 'video' | 'document'
  | 'sticker' | 'location' | 'interactive' | 'unsupported';

export type MessageCategory =
  | 'text' | 'media' | 'interactive' | 'location'
  | 'contact' | 'poll' | 'reaction' | 'system' | 'unknown';

export interface ExtractedMessageType {
  /** Raw type as received from the wire (preserved for telemetry/debug). */
  rawType: string;
  /** Internal vocabulary the MessageBubble switches on. */
  internalType: InternalMessageType;
  /** Semantic grouping for analytics and fallback UI. */
  category: MessageCategory;
  /** True if the bubble has a dedicated renderer; false → diagnostic fallback. */
  supported: boolean;
  /** Human-readable label (pt-BR). */
  label: string;
}

/**
 * Blueprint dos 18 messageTypes (Baileys/Evolution canon).
 * Mantido como const para tipos exatos. Aliases minúsculos (ex.: 'image',
 * 'text') também são aceitos por `extractMessageType` para compatibilidade
 * retroativa com adapters antigos.
 */
const MESSAGE_TYPE_BLUEPRINT: Record<string, Omit<ExtractedMessageType, 'rawType'>> = {
  conversation:           { internalType: 'text',         category: 'text',        supported: true,  label: 'Texto' },
  extendedTextMessage:    { internalType: 'text',         category: 'text',        supported: true,  label: 'Texto formatado' },
  imageMessage:           { internalType: 'image',        category: 'media',       supported: true,  label: 'Imagem' },
  videoMessage:           { internalType: 'video',        category: 'media',       supported: true,  label: 'Vídeo' },
  audioMessage:           { internalType: 'audio',        category: 'media',       supported: true,  label: 'Áudio' },
  documentMessage:        { internalType: 'document',     category: 'media',       supported: true,  label: 'Documento' },
  stickerMessage:         { internalType: 'sticker',      category: 'media',       supported: true,  label: 'Figurinha' },
  locationMessage:        { internalType: 'location',     category: 'location',    supported: true,  label: 'Localização' },
  liveLocationMessage:    { internalType: 'location',     category: 'location',    supported: true,  label: 'Localização ao vivo' },
  contactMessage:         { internalType: 'unsupported',  category: 'contact',     supported: false, label: 'Cartão de contato' },
  contactsArrayMessage:   { internalType: 'unsupported',  category: 'contact',     supported: false, label: 'Lista de contatos' },
  pollCreationMessage:    { internalType: 'unsupported',  category: 'poll',        supported: false, label: 'Enquete' },
  pollUpdateMessage:      { internalType: 'unsupported',  category: 'poll',        supported: false, label: 'Voto em enquete' },
  reactionMessage:        { internalType: 'unsupported',  category: 'reaction',    supported: false, label: 'Reação' },
  buttonsMessage:         { internalType: 'interactive',  category: 'interactive', supported: true,  label: 'Mensagem com botões' },
  listMessage:            { internalType: 'interactive',  category: 'interactive', supported: true,  label: 'Mensagem de lista' },
  templateMessage:        { internalType: 'interactive',  category: 'interactive', supported: true,  label: 'Modelo (template)' },
  viewOnceMessage:        { internalType: 'unsupported',  category: 'media',       supported: false, label: 'Ver uma vez' },
};

/** Aliases internos curtos (legacy + envio outbound). */
const SHORT_ALIASES: Record<string, keyof typeof MESSAGE_TYPE_BLUEPRINT> = {
  text: 'conversation',
  image: 'imageMessage',
  video: 'videoMessage',
  audio: 'audioMessage',
  document: 'documentMessage',
  sticker: 'stickerMessage',
  location: 'locationMessage',
  interactive: 'buttonsMessage',
};

/**
 * Universal extractor — sempre retorna um descritor estruturado.
 * Para tipos completamente desconhecidos, marca como `unsupported` +
 * `category: 'unknown'`, preservando o `rawType` para diagnóstico.
 */
export function extractMessageType(rawType: string | null | undefined): ExtractedMessageType {
  const raw = (rawType ?? '').trim();
  if (!raw) {
    return { rawType: '', internalType: 'text', category: 'text', supported: true, label: 'Texto' };
  }
  const canonicalKey = (SHORT_ALIASES[raw] ?? raw) as keyof typeof MESSAGE_TYPE_BLUEPRINT;
  const blueprint = MESSAGE_TYPE_BLUEPRINT[canonicalKey];
  if (blueprint) return { rawType: raw, ...blueprint };
  return {
    rawType: raw,
    internalType: 'unsupported',
    category: 'unknown',
    supported: false,
    label: raw, // unknown → expose raw key so the operator sees what's missing
  };
}

/** @deprecated Use `extractMessageType(...).internalType`. Kept for callers that expect a string. */
function mapMessageType(evoType: string): string {
  return extractMessageType(evoType).internalType;
}

function mapStatus(evoStatus: string): 'sent' | 'delivered' | 'read' | 'failed' | null {
  const mapping: Record<string, 'sent' | 'delivered' | 'read' | 'failed'> = {
    sent: 'sent',
    delivered: 'delivered',
    read: 'read',
    received: 'delivered',
    played: 'read',
    failed: 'failed',
    error: 'failed',
  };
  return mapping[evoStatus] || 'sent';
}

/**
 * Derive unique contacts from a list of evolution messages
 */
export function deriveContactsFromMessages(messages: EvolutionMessage[]): DerivedContact[] {
  const contactMap = new Map<string, DerivedContact>();

  for (const msg of messages) {
    if (!msg.remote_jid) continue;

    const existing = contactMap.get(msg.remote_jid);
    const isUnread = !msg.from_me && msg.status !== 'read';

    if (!existing) {
      contactMap.set(msg.remote_jid, {
        remoteJid: msg.remote_jid,
        pushName: msg.push_name,
        phone: jidToPhone(msg.remote_jid),
        lastMessageAt: msg.created_at,
        messageCount: 1,
        unreadCount: isUnread ? 1 : 0,
        lastMessageContent: msg.content || msg.caption,
        lastMessageDirection: msg.direction,
        instanceName: msg.instance_name,
      });
    } else {
      existing.messageCount++;
      if (isUnread) existing.unreadCount++;
      if (!existing.pushName && msg.push_name) existing.pushName = msg.push_name;
      if (new Date(msg.created_at) > new Date(existing.lastMessageAt)) {
        existing.lastMessageAt = msg.created_at;
        existing.lastMessageContent = msg.content || msg.caption;
        existing.lastMessageDirection = msg.direction;
      }
    }
  }

  return Array.from(contactMap.values()).sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );
}

/**
 * Convert a DerivedContact into the frontend's ConversationContact shape
 */
export function derivedToConversationContact(dc: DerivedContact): ConversationContact {
  return {
    id: dc.remoteJid, // Use jid as ID since evolution_contacts is empty
    name: dc.pushName || dc.phone,
    surname: null,
    nickname: dc.pushName,
    phone: dc.phone,
    email: null,
    avatar_url: dc.profilePictureUrl || null,
    tags: null,
    company: null,
    job_title: null,
    assigned_to: null,
    queue_id: null,
    created_at: dc.lastMessageAt,
    updated_at: dc.lastMessageAt,
    whatsapp_connection_id: null,
    contact_type: 'whatsapp',
    group_category: null,
    ai_sentiment: null,
  };
}

/**
 * Build ConversationWithMessages from evolution messages grouped by remote_jid
 */
export function buildExternalConversations(messages: EvolutionMessage[]): ConversationWithMessages[] {
  const derivedContacts = deriveContactsFromMessages(messages);
  const messagesByJid = new Map<string, EvolutionMessage[]>();

  for (const msg of messages) {
    if (!msg.remote_jid) continue;
    const existing = messagesByJid.get(msg.remote_jid) || [];
    existing.push(msg);
    messagesByJid.set(msg.remote_jid, existing);
  }

  return derivedContacts.map((dc) => {
    const contact = derivedToConversationContact(dc);
    const evoMessages = messagesByJid.get(dc.remoteJid) || [];
    const realtimeMessages = evoMessages
      .map(evolutionToRealtimeMessage)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    const unreadCount = realtimeMessages.filter(m => !m.is_read && m.sender === 'contact').length;
    const lastMessage = realtimeMessages.length > 0 ? realtimeMessages[realtimeMessages.length - 1] : null;

    return { contact, messages: realtimeMessages, unreadCount, lastMessage };
  });
}
