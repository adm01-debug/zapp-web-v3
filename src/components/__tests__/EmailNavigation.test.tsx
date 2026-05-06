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

// Mock lazy views to avoid actual loading
vi.mock('@/pages/lazyViews', () => ({
  EmailChatView: () => <div data-testid="email-view">Email Inbox</div>,
  RealtimeInboxView: () => <div data-testid="chat-view">Chat Inbox</div>,
  AdminEmailStatusPage: () => <div data-testid="email-status-view">Email Status</div>,
  AdminEmailAuditPage: () => <div data-testid="email-audit-view">Email Audit</div>,
}));

describe('Email Navigation', () => {
  it('should render the Email view when currentView is email-chat', () => {
    render(
      <BrowserRouter>
        <ViewRouter currentView="email-chat" />
      </BrowserRouter>
    );
    
    expect(screen.getByTestId('email-view')).toBeInTheDocument();
  });

  it('should render the Email Status view when currentView is email-status', () => {
    render(
      <BrowserRouter>
        <ViewRouter currentView="email-status" />
      </BrowserRouter>
    );
    
    expect(screen.getByTestId('email-status-view')).toBeInTheDocument();
  });

  it('should render the Email Audit view when currentView is email-audit', () => {
    render(
      <BrowserRouter>
        <ViewRouter currentView="email-audit" />
      </BrowserRouter>
    );
    
    expect(screen.getByTestId('email-audit-view')).toBeInTheDocument();
  });
});
