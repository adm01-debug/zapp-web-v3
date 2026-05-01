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
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Replace the heavy DLQ page lazy import with a tiny sentinel — keeps the rest
// of the lazyViews map untouched (other routes still resolve normally).
vi.mock('@/pages/lazyViews', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const Sentinel = () =>
    React.createElement('div', { 'data-testid': 'dlq-page' }, 'DLQ Panel');
  return {
    ...actual,
    AdminFailedMessagesPage: React.lazy(async () => ({ default: Sentinel })),
  };
});

// Stub auxiliary hooks so ViewRouter renders without touching real app state.
vi.mock('@/hooks/useCurrentModule', () => ({
  useCurrentModule: () => ({ label: 'Mensagens com Falha', icon: null, group: 'Admin' }),
}));
vi.mock('@/hooks/useDocumentTitle', () => ({ useDocumentTitle: () => {} }));
vi.mock('@/hooks/useAriaAnnouncer', () => ({
  useAriaAnnouncer: () => ({ announce: vi.fn() }),
}));

// framer-motion: bypass animation wrappers so children render synchronously.
vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get:
        () =>
        ({ children, ...rest }: { children?: React.ReactNode } & Record<string, unknown>) =>
          React.createElement('div', rest, children),
    },
  ),
  AnimatePresence: ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  useReducedMotion: () => true,
}));

// ErrorBoundary passthrough (we're not testing recovery here).
vi.mock('@/components/ui/error-boundary-retry', () => ({
  ErrorBoundaryWithRetry: ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

// Central piece under test — useUserRole drives the gate.
const userRoleMock = vi.fn();
vi.mock('@/features/auth', () => ({
  useUserRole: () => userRoleMock(),
}));

// Import AFTER mocks are registered.
import { ViewRouter } from '@/pages/ViewRouter';

function renderRoute() {
  return render(<ViewRouter currentView="failed-messages" />);
}

async function flushLazy() {
  // Allow React.lazy + Suspense to resolve.
  await new Promise((r) => setTimeout(r, 0));
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

  it('supervisor (sem admin/dev) → NotAuthorizedView (DLQ é área técnica, restrita a admin+)', async () => {
    userRoleMock.mockReturnValue({
      roles: ['supervisor'],
      isDev: false,
      isAdmin: false,
      isSupervisor: true,
      isSpecialAgent: false,
      hasRole: (r: string) => r === 'supervisor' || r === 'agent',
      loading: false,
      refetch: vi.fn(),
    });

    renderRoute();
    await flushLazy();

    expect(screen.getByText('Acesso restrito')).toBeInTheDocument();
    expect(screen.queryByTestId('dlq-page')).not.toBeInTheDocument();
  });

  it('admin → page renders', async () => {
    userRoleMock.mockReturnValue({
      roles: ['admin'],
      isDev: false,
      isAdmin: true,
      isSupervisor: true,
      isSpecialAgent: false,
      hasRole: (r: string) => r === 'admin' || r === 'supervisor' || r === 'agent',
      loading: false,
      refetch: vi.fn(),
    });

    renderRoute();
    await flushLazy();

    expect(await screen.findByTestId('dlq-page')).toBeInTheDocument();
  });
});
