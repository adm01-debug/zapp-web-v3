/**
 * ContactOrphanState.test.tsx
 * Tests for the orphan contact empty state.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContactOrphanState } from '@/components/contacts/ContactOrphanState';

describe('ContactOrphanState', () => {
  it('renders the empty state message', () => {
    render(<ContactOrphanState />);
    expect(screen.getByText('Contato n\u00e3o identificado')).toBeDefined();
  });

  it('shows remote JID when provided', () => {
    render(<ContactOrphanState remoteJid="5511999887766@s.whatsapp.net" />);
    expect(screen.getByText(/5511999887766/)).toBeDefined();
  });

  it('shows channel when provided', () => {
    render(<ContactOrphanState channel="whatsapp" />);
    expect(screen.getByText(/whatsapp/)).toBeDefined();
  });

  it('calls onCreateContact when button is clicked', () => {
    const onCreateContact = vi.fn();
    render(<ContactOrphanState onCreateContact={onCreateContact} />);
    fireEvent.click(screen.getByText('Criar Contato'));
    expect(onCreateContact).toHaveBeenCalledOnce();
  });

  it('calls onLinkContact when button is clicked', () => {
    const onLinkContact = vi.fn();
    render(<ContactOrphanState onLinkContact={onLinkContact} />);
    fireEvent.click(screen.getByText('Vincular Existente'));
    expect(onLinkContact).toHaveBeenCalledOnce();
  });

  it('hides buttons when callbacks not provided', () => {
    render(<ContactOrphanState />);
    expect(screen.queryByText('Criar Contato')).toBeNull();
    expect(screen.queryByText('Vincular Existente')).toBeNull();
  });

  it('has proper role and aria-label', () => {
    render(<ContactOrphanState />);
    expect(screen.getByRole('status')).toBeDefined();
  });
});
