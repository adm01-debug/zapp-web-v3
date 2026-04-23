/**
 * Role-gating regression tests for the DLQ panel route ('failed-messages').
 *
 * Backend RLS/RPCs (rpc_dlq_*) already require admin/supervisor — this is the
 * UX defense layer that prevents non-supervisors from even rendering the page.
 *
 * Contract:
 *  - agent (no admin/supervisor) → <NotAuthorizedView /> (lock empty state)
 *  - supervisor → page renders (read-only mode, RPC enforces writes)
 *  - admin → page renders fully
 *  - while roles are loading → "Verificando permissões…" status
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ViewRouter } from '@/pages/ViewRouter';

// --- Mock heavy view to a sentinel (avoids loading the real page tree) ---
vi.mock('@/pages/lazyViews', () => {
  const React = require('react');
  const Sentinel = () => React.createElement('div', { 'data-testid': 'dlq-page' }, 'DLQ Panel');
  return new Proxy({}, {
    get: () => React.lazy(async () => ({ default: Sentinel })),
  });
});

// Auxiliary mocks to keep ViewRouter renderable in jsdom
vi.mock('@/hooks/useCurrentModule', () => ({
  useCurrentModule: () => ({ label: 'Mensagens com Falha', icon: null, group: 'Admin' }),
}));
vi.mock('@/hooks/useDocumentTitle', () => ({ useDocumentTitle: () => {} }));
vi.mock('@/hooks/useAriaAnnouncer', () => ({
  useAriaAnnouncer: () => ({ announce: vi.fn() }),
}));
// framer-motion: bypass AnimatePresence to render children synchronously
vi.mock('framer-motion', () => {
  const React = require('react');
  return {
    motion: new Proxy({}, {
      get: () => (props: any) => React.createElement('div', props, props.children),
    }),
    AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
    useReducedMotion: () => true,
  };
});

// useUserRole — central piece under test
const userRoleMock = vi.fn();
vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => userRoleMock(),
}));

// ErrorBoundary passthrough
vi.mock('@/components/ui/error-boundary-retry', () => {
  const React = require('react');
  return {
    ErrorBoundaryWithRetry: ({ children }: any) => React.createElement(React.Fragment, null, children),
  };
});

function renderRoute() {
  return render(<ViewRouter currentView="failed-messages" />);
}

async function flushLazy() {
  // Allow React.lazy + Suspense fallback (none here) to settle.
  await new Promise((r) => setTimeout(r, 0));
}

describe('ViewRouter — failed-messages role gating', () => {
  beforeEach(() => {
    userRoleMock.mockReset();
  });

  it('agent without supervisor/admin → NotAuthorizedView', async () => {
    userRoleMock.mockReturnValue({
      roles: ['agent'],
      isAdmin: false,
      isSupervisor: false,
      isSpecialAgent: false,
      hasRole: (r: string) => r === 'agent',
      loading: false,
      refetch: vi.fn(),
    });

    renderRoute();
    await flushLazy();

    expect(screen.getByText('Acesso restrito')).toBeInTheDocument();
    expect(screen.queryByTestId('dlq-page')).not.toBeInTheDocument();
  });

  it('while roles are loading → status "Verificando permissões…"', async () => {
    userRoleMock.mockReturnValue({
      roles: [],
      isAdmin: false,
      isSupervisor: false,
      isSpecialAgent: false,
      hasRole: () => false,
      loading: true,
      refetch: vi.fn(),
    });

    renderRoute();
    await flushLazy();

    expect(screen.getByRole('status')).toHaveTextContent(/Verificando permissões/i);
    expect(screen.queryByTestId('dlq-page')).not.toBeInTheDocument();
  });

  it('supervisor → page renders (read-only is enforced inside the page itself)', async () => {
    userRoleMock.mockReturnValue({
      roles: ['supervisor'],
      isAdmin: false,
      isSupervisor: true,
      isSpecialAgent: false,
      hasRole: (r: string) => r === 'supervisor',
      loading: false,
      refetch: vi.fn(),
    });

    renderRoute();
    await flushLazy();

    expect(await screen.findByTestId('dlq-page')).toBeInTheDocument();
    expect(screen.queryByText('Acesso restrito')).not.toBeInTheDocument();
  });

  it('admin → page renders', async () => {
    userRoleMock.mockReturnValue({
      roles: ['admin'],
      isAdmin: true,
      isSupervisor: true,
      isSpecialAgent: false,
      hasRole: (r: string) => r === 'admin' || r === 'supervisor',
      loading: false,
      refetch: vi.fn(),
    });

    renderRoute();
    await flushLazy();

    expect(await screen.findByTestId('dlq-page')).toBeInTheDocument();
  });
});
