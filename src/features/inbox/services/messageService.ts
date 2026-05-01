import { messageRepository, Message } from '../data-access/messageRepository';

export const messageService = {
  async getAllMessagesForContact(contactId: string): Promise<Message[]> {
    let allData: Message[] = [];
    let from = 0;
    const PAGE_SIZE = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: page, error } = await messageRepository.fetchMessagesByContact(contactId, from, PAGE_SIZE);

      if (error) throw error;

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
  },
};
