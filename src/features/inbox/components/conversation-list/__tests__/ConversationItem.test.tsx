import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ConversationItem } from '../ConversationItem';
import { Conversation } from '@/types/chat';
import { useDensity } from '@/hooks/useDensity';

vi.mock('@/hooks/useDensity', () => ({
  useDensity: vi.fn(),
}));

vi.mock('@/hooks/useContactTyping', () => ({
  useContactTyping: () => false,
}));

vi.mock('@/hooks/useInViewport', () => ({
  useInViewport: () => true,
}));

vi.mock('@/features/inbox/components/SLAIndicatorForContact', () => ({
  SLAIndicatorForContact: () => null,
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>{children}</TooltipProvider>
  </QueryClientProvider>
);

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'c-1',
    status: 'open',
    updatedAt: new Date('2026-05-05T12:00:00Z'),
    createdAt: new Date('2026-05-04T12:00:00Z'),
    unreadCount: 0,
    priority: 'medium',
    tags: [],
    contact: {
      id: 'contact-1',
      name: 'Maria Silva Souza',
      company: 'Acme Corp',
      phone: '5511999999999',
      tags: ['vip', 'lead', 'novo'],
      createdAt: new Date(),
      contact_type: 'individual',
    },
    lastMessage: {
      id: 'm-1',
      conversationId: 'c-1',
      content: 'Olá, tudo bem?',
      type: 'text',
      sender: 'contact',
      timestamp: new Date(),
      status: 'read',
    },
    ...overrides,
  } as Conversation;
}

describe('ConversationItem - 3-line layout', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('comfortable mode', () => {
    beforeEach(() => {
      (useDensity as any).mockReturnValue({ density: 'comfortable' });
    });

    it('renders FirstName · Company on line 1, message on line 2, tags on line 3', () => {
      render(
        <ConversationItem conversation={makeConversation()} isSelected={false} onSelect={() => {}} />,
        { wrapper: Wrapper }
      );
      expect(screen.getByTestId('conversation-primary')).toHaveTextContent('Maria · Acme Corp');
      expect(screen.getByTestId('conversation-preview')).toHaveTextContent('Olá, tudo bem?');
      const tags = screen.getByTestId('conversation-tags');
      expect(tags).toHaveTextContent('vip');
      expect(tags).toHaveTextContent('lead');
      expect(tags).toHaveTextContent('+1');
    });

    it('falls back to "Sem mensagens ainda" when no lastMessage', () => {
      render(
        <ConversationItem conversation={makeConversation({ lastMessage: undefined })} isSelected={false} onSelect={() => {}} />,
        { wrapper: Wrapper }
      );
      expect(screen.getByTestId('conversation-preview')).toHaveTextContent('Sem mensagens ainda');
    });

    it('renders "Sem tags" placeholder when there are no tags', () => {
      const conv = makeConversation();
      conv.contact.tags = [];
      render(
        <ConversationItem conversation={conv} isSelected={false} onSelect={() => {}} />,
        { wrapper: Wrapper }
      );
      expect(screen.getByTestId('conversation-tags')).toHaveTextContent('Sem tags');
    });

    it('falls back to contact name when company is missing', () => {
      const conv = makeConversation();
      conv.contact.company = undefined;
      render(
        <ConversationItem conversation={conv} isSelected={false} onSelect={() => {}} />,
        { wrapper: Wrapper }
      );
      expect(screen.getByTestId('conversation-primary')).toHaveTextContent('Maria Silva Souza');
    });

    it('falls back to "Contato" when both name and company are missing', () => {
      const conv = makeConversation();
      conv.contact.name = '';
      conv.contact.company = undefined;
      render(
        <ConversationItem conversation={conv} isSelected={false} onSelect={() => {}} />,
        { wrapper: Wrapper }
      );
      expect(screen.getByTestId('conversation-primary')).toHaveTextContent('Contato');
    });
  });

  describe('compact mode', () => {
    beforeEach(() => {
      (useDensity as any).mockReturnValue({ density: 'compact' });
    });

    it('renders the same 3 lines in compact mode', () => {
      render(
        <ConversationItem conversation={makeConversation()} isSelected={false} onSelect={() => {}} />,
        { wrapper: Wrapper }
      );
      const item = screen.getByTestId('conversation-item');
      expect(item).toHaveAttribute('data-density', 'compact');
      expect(screen.getByTestId('conversation-primary')).toHaveTextContent('Maria · Acme Corp');
      expect(screen.getByTestId('conversation-preview')).toHaveTextContent('Olá, tudo bem?');
      expect(screen.getByTestId('conversation-tags')).toHaveTextContent('vip');
    });

    it('shows fallback message and tag placeholders in compact mode', () => {
      const conv = makeConversation({ lastMessage: undefined });
      conv.contact.tags = [];
      render(
        <ConversationItem conversation={conv} isSelected={false} onSelect={() => {}} />,
        { wrapper: Wrapper }
      );
      expect(screen.getByTestId('conversation-preview')).toHaveTextContent('Sem mensagens ainda');
      expect(screen.getByTestId('conversation-tags')).toHaveTextContent('Sem tags');
    });
  });
});
