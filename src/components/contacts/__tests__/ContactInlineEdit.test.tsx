/**
 * ContactInlineEdit.test.tsx
 * Tests for the inline edit component.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContactInlineEdit } from '@/components/contacts/ContactInlineEdit';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      update: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    }),
  },
}));

vi.mock('@/hooks/useContactRealtime', () => ({
  invalidateContactCache: vi.fn(),
}));

describe('ContactInlineEdit', () => {
  it('renders the value in read mode', () => {
    render(<ContactInlineEdit contactId="1" field="name" value="João Silva" label="Nome" />);
    expect(screen.getByText(/João Silva/i)).toBeDefined();
  });

  it('renders as readonly span when readonly=true', () => {
    render(<ContactInlineEdit contactId="1" field="name" value="João" readonly label="Nome" />);
    const el = screen.getByText(/João/i);
    expect(el.tagName).toBe('SPAN');
  });

  it('shows pencil icon on hover (via class)', () => {
    render(<ContactInlineEdit contactId="1" field="name" value="João" label="Nome" />);
    const button = screen.getByRole('button');
    expect(button).toBeDefined();
  });

  it('enters edit mode on click', () => {
    render(<ContactInlineEdit contactId="1" field="name" value="João" label="Nome" />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByDisplayValue(/João/i)).toBeDefined();
  });

  it('shows validation error', () => {
    render(
      <ContactInlineEdit
        contactId="1" field="name" value="João" label="Nome"
        validate={(v) => v.length < 2 ? 'Mínimo 2' : null}
      />
    );
    fireEvent.click(screen.getByRole('button'));
    const input = screen.getByDisplayValue(/João/i);
    fireEvent.change(input, { target: { value: 'J' } });
    fireEvent.click(screen.getByLabelText('Salvar'));
    expect(screen.getByText(/Mínimo 2/i)).toBeDefined();
  });
});
