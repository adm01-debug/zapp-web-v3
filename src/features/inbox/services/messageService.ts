import { messageRepository, Message } from '@/features/inbox/data-access/messageRepository';

import { getLogger } from '@/lib/logger';

const log = getLogger('messageService');

export const messageService = {
  async getAllMessagesForContact(contactId: string): Promise<Message[]> {
    if (!contactId) return [];

    try {
      // Fetch normal messages
      let allData: any[] = [];
      let from = 0;
      const PAGE_SIZE = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: page, error } = await messageRepository.fetchMessagesByContact(contactId, from, PAGE_SIZE);
        if (error) throw new Error(`Falha ao carregar mensagens: ${error.message}`);
        if (page && page.length > 0) {
          allData = allData.concat(page);
          from += PAGE_SIZE;
          hasMore = page.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }

      // Fetch whispers (internal notes)
      const { data: whispers, error: whisperErr } = await (window as any).supabase
        .from('whisper_messages')
        .select('*')
        .eq('contact_id', contactId);

      if (whisperErr) {
        log.error('Error fetching whispers:', whisperErr);
      } else if (whispers) {
        const mappedWhispers = whispers.map((w: any) => ({
          id: w.id,
          conversationId: contactId, // Using contactId as fallback if needed
          content: w.content,
          sender: 'agent' as const,
          type: 'text' as const,
          timestamp: new Date(w.created_at),
          status: 'sent' as const,
          isWhisper: true,
          agentId: w.sender_id,
        }));
        allData = allData.concat(mappedWhispers);
      }

      // Sort all messages by timestamp
      allData.sort((a, b) => {
        const timeA = new Date(a.created_at || a.timestamp).getTime();
        const timeB = new Date(b.created_at || b.timestamp).getTime();
        return timeA - timeB;
      });

      return allData.map((m) => ({
        ...m,
        id: m.id,
        conversationId: m.conversationId || m.contact_id,
        timestamp: new Date(m.created_at || m.timestamp),
        isEdited: !!m.is_edited,
        type: m.message_type || m.type || 'text',
        mediaUrl: m.media_url || m.mediaUrl,
        sender: m.sender || (m.sender_id ? 'agent' : 'contact'),
      })) as Message[];
    } catch (err) {
      log.error(`Critical error in getAllMessagesForContact for ${contactId}:`, err);
      throw err;
    }
  },
};
