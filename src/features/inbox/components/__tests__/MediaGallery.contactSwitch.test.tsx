import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, within, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * E2E component test — MediaGallery during inbox contact switching.
 *
 * Validates the full user-perceived flow:
 * 1. Open gallery for contact A → shows A's media.
 * 2. Switch contactId prop to B (simulating user picking another chat).
 * 3. Gallery refetches and shows ONLY B's media (no leftover from A).
 * 4. Switching back to A re-shows A's media.
 * 5. Empty contact renders empty state.
 */

// ── Mocks ──────────────────────────────────────────────────────────────────

// Mock framer-motion (jsdom-friendly)
vi.mock('framer-motion', () => {
  const passthrough = React.forwardRef<HTMLElement, React.PropsWithChildren<Record<string, unknown>>>(
    ({ children, ...props }, ref) => {
      const {
        whileHover, whileTap, initial, animate, exit, transition, layout,
        layoutId, variants, drag, dragConstraints, ...rest
      } = props as Record<string, unknown>;
      return React.createElement('div', { ...rest, ref }, children as React.ReactNode);
    },
  );
  return {
    motion: new Proxy({}, { get: () => passthrough }),
    AnimatePresence: ({ children }: React.PropsWithChildren) =>
      React.createElement(React.Fragment, null, children),
  };
});

// Subcomponents — keep DOM minimal & predictable
vi.mock('@/features/inbox/media-gallery/MediaCard', () => ({
  MediaCard: ({ item }: { item: { id: string; filename: string } }) =>
    React.createElement(
      'div',
      { 'data-testid': 'media-card', 'data-id': item.id },
      item.filename,
    ),
}));

vi.mock('@/features/inbox/media-gallery/MediaPreviewDialog', () => ({
  MediaPreviewDialog: () => null,
}));

// Build a per-contact dataset and a fake supabase chain.
type Row = {
  id: string;
  media_url: string;
  message_type: string;
  content: string;
  created_at: string;
};

const DATA: Record<string, Row[]> = {
  'contact-a': [
    {
      id: 'a1',
      media_url: 'https://cdn.test/a/photo-a1.png',
      message_type: 'image',
      content: 'Foto A1',
      created_at: '2026-04-01T10:00:00Z',
    },
    {
      id: 'a2',
      media_url: 'https://cdn.test/a/clip-a2.mp4',
      message_type: 'video',
      content: 'Clipe A2',
      created_at: '2026-04-02T10:00:00Z',
    },
  ],
  'contact-b': [
    {
      id: 'b1',
      media_url: 'https://cdn.test/b/doc-b1.pdf',
      message_type: 'document',
      content: 'Doc B1',
      created_at: '2026-04-03T10:00:00Z',
    },
  ],
  'contact-empty': [],
};

const queryCalls: string[] = [];

vi.mock('@/integrations/supabase/client', () => {
  const makeBuilder = () => {
    let currentId = '';
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: (_col: string, val: string) => {
        currentId = val;
        queryCalls.push(val);
        return builder;
      },
      not: () => builder,
      order: () =>
        Promise.resolve({ data: DATA[currentId] ?? [], error: null }),
    };
    return builder;
  };
  return {
    supabase: {
      from: () => makeBuilder(),
    },
  };
});

// Import AFTER mocks
import { MediaGallery } from '../MediaGallery';

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  return {
    client,
    ...render(
      React.createElement(QueryClientProvider, { client }, ui),
    ),
  };
}

beforeEach(() => {
  queryCalls.length = 0;
  cleanup();
});

describe('MediaGallery — contact switching (E2E component)', () => {
  it('loads media for contact A on first open', async () => {
    renderWithClient(
      React.createElement(MediaGallery, {
        contactId: 'contact-a',
        open: true,
        onOpenChange: () => {},
      }),
    );

    await waitFor(() => {
      const cards = screen.getAllByTestId('media-card');
      expect(cards).toHaveLength(2);
    });

    const cards = screen.getAllByTestId('media-card');
    const ids = cards.map((c) => c.getAttribute('data-id'));
    expect(ids).toEqual(expect.arrayContaining(['a1', 'a2']));
    expect(ids).not.toContain('b1');
    expect(queryCalls).toContain('contact-a');
  });

  it('refetches and replaces the list when contactId switches A → B', async () => {
    const { rerender, client } = renderWithClient(
      React.createElement(MediaGallery, {
        contactId: 'contact-a',
        open: true,
        onOpenChange: () => {},
      }),
    );

    await waitFor(() =>
      expect(screen.getAllByTestId('media-card')).toHaveLength(2),
    );

    // User picks contact B in the inbox sidebar — parent updates the prop.
    rerender(
      React.createElement(
        QueryClientProvider,
        { client },
        React.createElement(MediaGallery, {
          contactId: 'contact-b',
          open: true,
          onOpenChange: () => {},
        }),
      ),
    );

    await waitFor(() => {
      const cards = screen.getAllByTestId('media-card');
      expect(cards).toHaveLength(1);
      expect(cards[0].getAttribute('data-id')).toBe('b1');
    });

    // No leftover from contact A
    const ids = screen
      .getAllByTestId('media-card')
      .map((c) => c.getAttribute('data-id'));
    expect(ids).not.toContain('a1');
    expect(ids).not.toContain('a2');

    // Both contacts were queried
    expect(queryCalls).toContain('contact-a');
    expect(queryCalls).toContain('contact-b');
  });

  it('switches back B → A and restores contact A media', async () => {
    const { rerender, client } = renderWithClient(
      React.createElement(MediaGallery, {
        contactId: 'contact-b',
        open: true,
        onOpenChange: () => {},
      }),
    );

    await waitFor(() =>
      expect(screen.getAllByTestId('media-card')).toHaveLength(1),
    );

    rerender(
      React.createElement(
        QueryClientProvider,
        { client },
        React.createElement(MediaGallery, {
          contactId: 'contact-a',
          open: true,
          onOpenChange: () => {},
        }),
      ),
    );

    await waitFor(() =>
      expect(screen.getAllByTestId('media-card')).toHaveLength(2),
    );
  });

  it('shows the empty state when switching to a contact without media', async () => {
    const { rerender, client } = renderWithClient(
      React.createElement(MediaGallery, {
        contactId: 'contact-a',
        open: true,
        onOpenChange: () => {},
      }),
    );

    await waitFor(() =>
      expect(screen.getAllByTestId('media-card')).toHaveLength(2),
    );

    rerender(
      React.createElement(
        QueryClientProvider,
        { client },
        React.createElement(MediaGallery, {
          contactId: 'contact-empty',
          open: true,
          onOpenChange: () => {},
        }),
      ),
    );

    await waitFor(() => {
      expect(screen.queryAllByTestId('media-card')).toHaveLength(0);
      expect(screen.getByText(/Sem mídias/i)).toBeInTheDocument();
    });
  });

  it('updates the header counter badge after a contact switch', async () => {
    const { rerender, client } = renderWithClient(
      React.createElement(MediaGallery, {
        contactId: 'contact-a',
        open: true,
        onOpenChange: () => {},
      }),
    );

    const dialog = await screen.findByRole('dialog');
    await waitFor(() => {
      expect(within(dialog).getByText(/2 itens/i)).toBeInTheDocument();
    });

    rerender(
      React.createElement(
        QueryClientProvider,
        { client },
        React.createElement(MediaGallery, {
          contactId: 'contact-b',
          open: true,
          onOpenChange: () => {},
        }),
      ),
    );

    await waitFor(() => {
      expect(within(dialog).getByText(/1 itens/i)).toBeInTheDocument();
    });
  });
});
