/**
 * useSystemHealth.test.ts
 * Testes para o hook de monitoramento de saúde do sistema
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSystemHealth } from '../useSystemHealth';

const mockRpc = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (name: string) => mockRpc(name) },
}));

const HEALTHY_DATA = {
  timestamp: new Date().toISOString(),
  health_score: 'healthy',
  inbox: { total_conversations: 1687, open_conversations: 100, unread_total: 50, awaiting_response: 10 },
  messages: { total: 1800000, last_24h: 500, queue_size: 0 },
  contacts: { total: 12662, recent_7d: 467, lgpd_pending: 0 },
  email: { gmail_accounts: 2, unread_threads: 5, sla_breached: 0 },
  webhooks: { events_1h: 100, dlq_pending: 0, alerts_unread: 0 },
  performance: { db_response_ms: 150, mat_views_populated: 12, active_cron_jobs: 78 },
};

const WARNING_DATA = {
  ...HEALTHY_DATA,
  health_score: 'warning',
  webhooks: { events_1h: 0, dlq_pending: 5, alerts_unread: 10 },
  email: { gmail_accounts: 2, unread_threads: 100, sla_breached: 3 },
};

describe('useSystemHealth', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('deve carregar dados de saúde com sucesso', async () => {
    mockRpc.mockResolvedValue({ data: HEALTHY_DATA, error: null });

    const { result } = renderHook(() => useSystemHealth(false));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.health?.health_score).toBe('healthy');
    expect(result.current.health?.contacts.total).toBe(12662);
    expect(result.current.health?.inbox.open_conversations).toBe(100);
  });

  it('deve calcular criticalAlerts corretamente', async () => {
    mockRpc.mockResolvedValue({ data: WARNING_DATA, error: null });

    const { result } = renderHook(() => useSystemHealth(false));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.criticalAlerts).toBe(true);
    expect(result.current.hasDlqPending).toBe(true);
    expect(result.current.hasEmailSLABreach).toBe(true);
  });

  it('deve retornar criticalAlerts=false quando sistema saudável', async () => {
    mockRpc.mockResolvedValue({ data: HEALTHY_DATA, error: null });

    const { result } = renderHook(() => useSystemHealth(false));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.criticalAlerts).toBe(false);
    expect(result.current.hasDlqPending).toBe(false);
    expect(result.current.hasEmailSLABreach).toBe(false);
  });

  it('deve validar dbResponseOk com base no tempo de resposta', async () => {
    // Resposta boa (< 3000ms)
    mockRpc.mockResolvedValue({ data: { ...HEALTHY_DATA, performance: { ...HEALTHY_DATA.performance, db_response_ms: 150 } }, error: null });
    const { result } = renderHook(() => useSystemHealth(false));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.dbResponseOk).toBe(true);
  });

  it('deve lidar com erro de RPC', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC error' } });

    const { result } = renderHook(() => useSystemHealth(false));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).not.toBeNull();
    expect(result.current.health).toBeNull();
  });

  it('deve definir lastUpdated após carregamento', async () => {
    mockRpc.mockResolvedValue({ data: HEALTHY_DATA, error: null });

    const { result } = renderHook(() => useSystemHealth(false));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.lastUpdated).toBeInstanceOf(Date);
  });
});
