import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const timedRpcMock = vi.fn();
vi.mock('@/lib/instrumentedExternal', () => ({
  timedRpc: (...args: unknown[]) => timedRpcMock(...args),
}));

const profileRef: { current: { role: string } | null } = { current: { role: 'admin' } };
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ profile: profileRef.current }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { MessageDetailsDialog } from '../MessageDetailsDialog';

function wrap(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const FULL = {
  id: 'm1', message_id: 'wamid.x', remote_jid: 'x@s.whatsapp.net',
  from_me: false, message_type: 'text', content: 'hello',
  created_at: '2026-04-23T10:00:00Z', direction: 'inbound', status: 'read',
  sent_by_bot: false, instance_name: 'wpp2',
  payload: { kind: 'message', text: 'hello' },
  raw_data: { event: 'messages.upsert', data: { id: 1 } },
};

describe('MessageDetailsDialog', () => {
  beforeEach(() => {
    timedRpcMock.mockReset();
    profileRef.current = { role: 'admin' };
  });

  it('renders loading spinner while fetching', () => {
    timedRpcMock.mockReturnValue(new Promise(() => {})); // pending
    wrap(<MessageDetailsDialog messageId="m1" open onOpenChange={() => {}} />);
    expect(screen.getByTestId('message-details-loading')).toBeInTheDocument();
  });

  it('renders payload and raw_data tabs with JSON content for admin', async () => {
    timedRpcMock.mockResolvedValueOnce({ data: FULL, error: null });
    wrap(<MessageDetailsDialog messageId="m1" open onOpenChange={() => {}} />);
    await waitFor(() => expect(screen.getByText(/wamid\.x/)).toBeInTheDocument());
    // Admin sees the copy buttons
    expect(screen.getByTestId('copy-payload')).toBeInTheDocument();
    expect(screen.getByTestId('copy-raw')).toBeInTheDocument();
  });

  it('hides copy buttons for non-admin/supervisor (agent)', async () => {
    profileRef.current = { role: 'agent' };
    timedRpcMock.mockResolvedValueOnce({ data: FULL, error: null });
    wrap(<MessageDetailsDialog messageId="m1" open onOpenChange={() => {}} />);
    await waitFor(() => expect(screen.getByText(/wamid\.x/)).toBeInTheDocument());
    expect(screen.queryByTestId('copy-payload')).toBeNull();
    expect(screen.queryByTestId('copy-raw')).toBeNull();
  });

  it('shows copy buttons for supervisor', async () => {
    profileRef.current = { role: 'supervisor' };
    timedRpcMock.mockResolvedValueOnce({ data: FULL, error: null });
    wrap(<MessageDetailsDialog messageId="m1" open onOpenChange={() => {}} />);
    await waitFor(() => expect(screen.getByText(/wamid\.x/)).toBeInTheDocument());
    expect(screen.getByTestId('copy-payload')).toBeInTheDocument();
  });
});
