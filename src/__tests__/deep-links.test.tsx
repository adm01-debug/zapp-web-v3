import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../components/routing/AppRoutes';

// Mock the ProtectedRoute to just render children
vi.mock('@/features/auth', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="protected">{children}</div>
  ),
}));

// Mock the lazy loaded components
vi.mock('@/pages/Index', () => ({ default: () => <div data-testid="index-page">Index Page</div> }));
vi.mock('@/pages/inbox/InboxPage', () => ({
  default: () => <div data-testid="inbox-page">Inbox Page</div>,
}));
vi.mock('@/pages/Auth', () => ({ default: () => <div data-testid="auth-page">Auth Page</div> }));

describe('Deep Links and Routing', () => {
  it('should render Index page for root path', async () => {
    render(
      <MemoryRouter
        initialEntries={['/']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AppRoutes />
      </MemoryRouter>
    );

    const indexPage = await screen.findByTestId('index-page');
    expect(indexPage).toBeDefined();
  });

  it('should render Inbox page for /inbox path', async () => {
    render(
      <MemoryRouter
        initialEntries={['/inbox']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AppRoutes />
      </MemoryRouter>
    );

    const inboxPage = await screen.findByTestId('inbox-page');
    expect(inboxPage).toBeDefined();
  });

  it('should render Auth page for /auth path', async () => {
    render(
      <MemoryRouter
        initialEntries={['/auth']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AppRoutes />
      </MemoryRouter>
    );

    const authPage = await screen.findByTestId('auth-page');
    expect(authPage).toBeDefined();
  });
});
