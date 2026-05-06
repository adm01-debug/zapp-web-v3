import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ViewRouter } from '@/pages/ViewRouter';
import { BrowserRouter } from 'react-router-dom';

// Mock relevant hooks and components
vi.mock('@/hooks/useCurrentModule', () => ({
  useCurrentModule: (id: string) => ({
    id,
    label: id === 'email-chat' ? 'Email' : 'Chat',
    icon: () => null,
  }),
}));

vi.mock('@/hooks/useDocumentTitle', () => ({
  useDocumentTitle: vi.fn(),
}));

vi.mock('@/hooks/useAriaAnnouncer', () => ({
  useAriaAnnouncer: () => ({ announce: vi.fn() }),
}));

vi.mock('@/features/auth', () => ({
  useUserRole: () => ({ hasRole: () => true, loading: false }),
}));

// Mock lazy views using a Proxy to handle all the components in VIEW_MAP
vi.mock('@/pages/lazyViews', () => {
  return new Proxy({}, {
    get: (target, prop) => {
      return () => <div data-testid={`${String(prop).toLowerCase()}-view`}>{String(prop)}</div>;
    }
  });
});

describe('Email Navigation', () => {
  it('should render the Email view when currentView is email-chat', () => {
    render(
      <BrowserRouter>
        <ViewRouter currentView="email-chat" />
      </BrowserRouter>
    );
    
    expect(screen.getByTestId('emailchatview-view')).toBeInTheDocument();
  });

  it('should render the Email Status view when currentView is email-status', () => {
    render(
      <BrowserRouter>
        <ViewRouter currentView="email-status" />
      </BrowserRouter>
    );
    
    expect(screen.getByTestId('adminemailstatuspage-view')).toBeInTheDocument();
  });

  it('should render the Email Audit view when currentView is email-audit', () => {
    render(
      <BrowserRouter>
        <ViewRouter currentView="email-audit" />
      </BrowserRouter>
    );
    
    expect(screen.getByTestId('adminemailauditpage-view')).toBeInTheDocument();
  });
});
