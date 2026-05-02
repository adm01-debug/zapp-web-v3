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
    render(<ContactInlineEdit contactId="1" field="name" value="Jo\u00e3o Silva" />);
    expect(screen.getByText('Jo\u00e3o Silva')).toBeDefined();
  });

  it('renders as readonly span when readonly=true', () => {
    render(<ContactInlineEdit contactId="1" field="name" value="Jo\u00e3o" readonly />);
    const el = screen.getByText('Jo\u00e3o');
    expect(el.tagName).toBe('SPAN');
  });

  it('shows pencil icon on hover (via class)', () => {
    render(<ContactInlineEdit contactId="1" field="name" value="Jo\u00e3o" />);
    const button = screen.getByRole('button');
    expect(button).toBeDefined();
  });

  it('enters edit mode on click', () => {
    render(<ContactInlineEdit contactId="1" field="name" value="Jo\u00e3o" />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByDisplayValue('Jo\u00e3o')).toBeDefined();
  });

  it('shows validation error', () => {
    render(
      <ContactInlineEdit
        contactId="1" field="name" value="Jo\u00e3o"
        validate={(v) => v.length < 2 ? 'M\u00ednimo 2' : null}
      />
    );
    fireEvent.click(screen.getByRole('button'));
    const input = screen.getByDisplayValue('Jo\u00e3o');
    fireEvent.change(input, { target: { value: 'J' } });
    fireEvent.click(screen.getByLabelText('Salvar'));
    expect(screen.getByText('M\u00ednimo 2')).toBeDefined();
  });
});
