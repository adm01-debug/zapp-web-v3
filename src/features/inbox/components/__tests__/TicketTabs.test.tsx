import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { TicketTabs } from '../TicketTabs';

// Mock hooks
const mockHasPermission = vi.fn();
const mockUserRole = vi.fn(() => ({
  isSupervisor: false,
  isManager: false,
  isAdmin: false,
  roles: ['agent'],
  loading: false,
}));

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, profile: {} }),
  useUserRole: () => mockUserRole(),
  usePermissions: () => ({
    hasPermission: mockHasPermission,
    loading: false,
  }),
}));

vi.mock('@/hooks/useQueues', () => ({
  useQueues: () => ({ queues: [] }),
}));

vi.mock('@/features/admin', () => ({
  useAgents: () => ({ agents: [], loading: false }),
}));

vi.mock('@/features/inbox', () => ({
  useAllTicketStates: () => ({}),
}));

vi.mock('@/hooks/useDensity', () => ({
  useDensity: () => ({ density: 'default' }),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

describe('TicketTabs - Visibilidade de Escopo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não renderiza seletor de escopo para Agente sem permissões extras', () => {
    mockHasPermission.mockImplementation((perm) => perm === 'inbox.view_mine');

    render(
      <TicketTabs
        conversations={[]}
        mainTab="open"
        subTab="attending"
        onMainTabChange={() => {}}
        onSubTabChange={() => {}}
        showAll={false}
        onShowAllChange={() => {}}
        selectedQueueId={null}
        onQueueChange={() => {}}
      />
    );

    // Scope selector is hidden when user only has inbox.view_mine
    expect(screen.queryByText('Meus')).toBeNull();
    expect(screen.queryByText('Departamento')).toBeNull();
    expect(screen.queryByText('Todos depts.')).toBeNull();
  });

  it('renderiza "Departamento" quando tem permissão inbox.view_department', () => {
    mockHasPermission.mockImplementation(
      (perm) => perm === 'inbox.view_mine' || perm === 'inbox.view_department'
    );

    render(
      <TicketTabs
        conversations={[]}
        mainTab="open"
        subTab="attending"
        onMainTabChange={() => {}}
        onSubTabChange={() => {}}
        showAll={false}
        onShowAllChange={() => {}}
        selectedQueueId={null}
        onQueueChange={() => {}}
      />
    );

    expect(screen.getByText('Meus')).toBeDefined();
    expect(screen.getByText('Departamento')).toBeDefined();
    expect(screen.queryByText('Todos depts.')).toBeNull();
  });

  it('renderiza todos os escopos quando tem permissão inbox.view_all', () => {
    mockHasPermission.mockReturnValue(true);

    render(
      <TicketTabs
        conversations={[]}
        mainTab="open"
        subTab="attending"
        onMainTabChange={() => {}}
        onSubTabChange={() => {}}
        showAll={false}
        onShowAllChange={() => {}}
        selectedQueueId={null}
        onQueueChange={() => {}}
      />
    );

    expect(screen.getByText('Meus')).toBeDefined();
    expect(screen.getByText('Departamento')).toBeDefined();
    expect(screen.getByText('Todos depts.')).toBeDefined();
  });
});
