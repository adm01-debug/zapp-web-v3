// @ts-nocheck
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AgentOpsTable } from '@/features/inbox/components/agents-ops/AgentOpsTable';

vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

const baseAgent = {
  id: 'a1',
  user_id: 'u1',
  name: 'Alice Silva',
  email: 'a@a.com',
  avatar_url: null,
  role: 'agent',
  job_title: 'Atendente',
  department: null,
  phone: null,
  is_active: true,
  max_chats: 5,
  created_at: '',
  updated_at: new Date().toISOString(),
  activeChats: 2,
  status: 'online' as const,
  queues: [{ id: 'q1', name: 'Vendas', color: '#3b82f6' }],
};

function renderTable(props: Parameters<typeof AgentOpsTable>[0]) {
  return render(
    <TooltipProvider>
      <AgentOpsTable {...props} />
    </TooltipProvider>,
  );
}

describe('AgentOpsTable', () => {
  it('renders one row per agent', () => {
    renderTable({
      agents: [baseAgent, { ...baseAgent, id: 'a2', name: 'Bob' }],
      pendingCounts: {},
      recentSendsByAgent: new Map(),
    });
    expect(screen.getByTestId('agent-row-a1')).toBeInTheDocument();
    expect(screen.getByTestId('agent-row-a2')).toBeInTheDocument();
  });

  it('shows 0 pendentes when map is empty', () => {
    renderTable({ agents: [baseAgent], pendingCounts: {}, recentSendsByAgent: new Map() });
    const row = screen.getByTestId('agent-row-a1');
    expect(row.textContent).toMatch(/0/);
  });

  it('renders status label correctly per status', () => {
    renderTable({
      agents: [
        { ...baseAgent, id: 'on', status: 'online' },
        { ...baseAgent, id: 'aw', status: 'away' },
        { ...baseAgent, id: 'off', status: 'offline' },
      ],
      pendingCounts: {},
      recentSendsByAgent: new Map(),
    });
    expect(screen.getAllByText('Online').length).toBeGreaterThan(0);
    expect(screen.getByText('Ausente')).toBeInTheDocument();
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('opens recent sends popover on click', () => {
    renderTable({
      agents: [baseAgent],
      pendingCounts: {},
      recentSendsByAgent: new Map([
        [
          'a1',
          [
            {
              idem_key: 'msg:abc',
              instance_name: 'wpp2',
              http_status: 200,
              external_message_id: 'ext1',
              created_at: new Date().toISOString(),
              path: '/message/sendText',
              message_id: 'abc',
            },
          ],
        ],
      ]),
    });
    fireEvent.click(screen.getByRole('button', { name: /Ver últimos/i }));
    expect(screen.getByTestId('recent-sends-popover')).toBeInTheDocument();
  });
});
