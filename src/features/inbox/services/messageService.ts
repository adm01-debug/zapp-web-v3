import { messageRepository, Message } from '../data-access/messageRepository';

import { getLogger } from '@/lib/logger';

const log = getLogger('messageService');

export const messageService = {
  async getAllMessagesForContact(contactId: string): Promise<Message[]> {
    if (!contactId) return [];

    try {
      let allData: Message[] = [];
      let from = 0;
      const PAGE_SIZE = 1000;
      let hasMore = true;

      while (hasMore) {
        log.debug(`Fetching messages for ${contactId} page starting at ${from}`);
        const { data: page, error } = await messageRepository.fetchMessagesByContact(contactId, from, PAGE_SIZE);

        if (error) {
          log.error(`Error fetching messages page for ${contactId}:`, error);
          throw new Error(`Falha ao carregar mensagens: ${error.message}`);
        }

        if (page && page.length > 0) {
          allData = allData.concat(page as Message[]);
          from += PAGE_SIZE;
          hasMore = page.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }

      return allData.map((m) => ({
        ...m,
        isEdited: !!(m as any).is_edited,
      })) as Message[];
    } catch (err) {
      log.error(`Critical error in getAllMessagesForContact for ${contactId}:`, err);
      throw err;
    }
  },
};
