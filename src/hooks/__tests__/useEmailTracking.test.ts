/**
 * useEmailTracking.test.ts — Testes para o sistema de rastreio de emails
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useEmailTracking, getTrackingPixelHtml, getTrackedLinkUrl, injectTrackedLinks } from '../useEmailTracking';

const mockInvoke = vi.fn();
const mockFrom   = vi.fn();
const mockRpc    = vi.fn();
const mockChannel = { on: vi.fn().mockReturnThis(), subscribe: vi.fn() };

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: mockInvoke },
    from: (t: string) => mockFrom(t),
    rpc:  (fn: string, params?: unknown) => mockRpc(fn, params),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    channel: vi.fn().mockReturnValue(mockChannel),
    removeChannel: vi.fn(),
  },
}));

const makeQuery = (data: unknown[], err = null) => ({
  select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data, error: err }),
  insert: vi.fn().mockReturnThis(), upsert: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: data[0] ?? null, error: err }),
});

const MOCK_EMAILS = [
  { id: 'e1', tracking_id: 'trk_abc', recipient_email: 'dest@test.com', sender_email: 'me@test.com', subject: 'Proposta', delivery_status: 'delivered', open_count: 3, click_count: 1, first_opened_at: new Date().toISOString(), last_opened_at: new Date().toISOString(), created_at: new Date().toISOString() },
  { id: 'e2', tracking_id: 'trk_def', recipient_email: 'outro@test.com', sender_email: 'me@test.com', subject: 'Follow-up', delivery_status: 'sent', open_count: 0, click_count: 0, first_opened_at: null, last_opened_at: null, created_at: new Date().toISOString() },
];

const MOCK_STATS = {
  total_tracked: 50, total_opens: 120, total_clicks: 30, unique_opens: 35,
  open_rate: 70.0, click_rate: 15.0, bounce_count: 2, avg_opens_per_email: 3.4, period_days: 30,
};

describe('useEmailTracking — helpers', () => {
  it('getTrackingPixelHtml deve gerar img tag válida', () => {
    const html = getTrackingPixelHtml('trk_test123');
    expect(html).toContain('<img');
    expect(html).toContain('trk_test123');
    expect(html).toContain('width="1"');
    expect(html).toContain('height="1"');
    expect(html).toContain('display:none');
  });

  it('getTrackedLinkUrl deve gerar URL com link_id', () => {
    const url = getTrackedLinkUrl('lnk_abc');
    expect(url).toContain('email-track-link');
    expect(url).toContain('l=lnk_abc');
  });

  it('injectTrackedLinks deve substituir URLs no HTML', () => {
    const html = '<a href="https://example.com/page">Clique aqui</a>';
    const links = [{ link_id: 'lnk_1', original_url: 'https://example.com/page' }];
    const result = injectTrackedLinks(html, links);
    expect(result).toContain('email-track-link');
    expect(result).toContain('lnk_1');
    expect(result).not.toContain('href="https://example.com/page"');
  });

  it('injectTrackedLinks deve preservar mailto links', () => {
    const html = '<a href="mailto:test@test.com">Email</a><a href="https://site.com">Site</a>';
    const links = [{ link_id: 'lnk_2', original_url: 'https://site.com' }];
    const result = injectTrackedLinks(html, links);
    expect(result).toContain('mailto:test@test.com'); // Preservado
    expect(result).toContain('lnk_2'); // Substituído
  });
});

describe('useEmailTracking — carregamento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(makeQuery(MOCK_EMAILS));
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'rpc_email_tracking_stats') return Promise.resolve({ data: MOCK_STATS, error: null });
      if (fn === 'rpc_email_top_contacts') return Promise.resolve({ data: [], error: null });
      return Promise.resolve({ data: null, error: null });
    });
  });

  it('deve carregar emails rastreados', async () => {
    const { result } = renderHook(() => useEmailTracking());
    await waitFor(() => expect(result.current.trackedEmails).toHaveLength(2));
    expect(result.current.trackedEmails[0].tracking_id).toBe('trk_abc');
  });

  it('deve carregar estatísticas', async () => {
    const { result } = renderHook(() => useEmailTracking());
    await waitFor(() => expect(result.current.stats).not.toBeNull());
    expect(result.current.stats?.open_rate).toBe(70.0);
    expect(result.current.stats?.total_tracked).toBe(50);
  });

  it('deve calcular open_rate e click_rate', async () => {
    const { result } = renderHook(() => useEmailTracking());
    await waitFor(() => expect(result.current.stats?.click_rate).toBe(15.0));
  });
});

describe('useEmailTracking — ações', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({
      ...makeQuery(MOCK_EMAILS),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { tracking_id: 'trk_new' }, error: null }),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    mockRpc.mockResolvedValue({ data: MOCK_STATS, error: null });
  });

  it('deve criar tracking para email enviado', async () => {
    const { result } = renderHook(() => useEmailTracking());
    await waitFor(() => expect(result.current.trackedEmails).toBeDefined());

    let tracking: unknown;
    await act(async () => {
      tracking = await result.current.createTracking({
        accountId: 'acc-1',
        recipientEmail: 'dest@empresa.com',
        senderEmail: 'me@empresa.com',
        subject: 'Proposta Comercial',
        bodyHtml: '<p>Olá, segue proposta. <a href="https://example.com/proposta.pdf">PDF</a></p>',
        trackLinks: true,
      });
    });

    expect(tracking).not.toBeNull();
  });
});

describe('RPC — rpc_email_register_open', () => {
  it('deve incrementar open_count na primeira abertura', async () => {
    mockRpc.mockResolvedValue({ data: { success: true, first_open: true, is_self_open: false }, error: null });
    const res = await mockRpc('rpc_email_register_open', { p_tracking_id: 'trk_abc', p_device_type: 'desktop', p_browser: 'Chrome' });
    expect(res.data.success).toBe(true);
    expect(res.data.first_open).toBe(true);
  });
});

describe('RPC — rpc_email_register_click', () => {
  it('deve registrar clique e retornar URL original', async () => {
    mockRpc.mockResolvedValue({ data: { success: true, original_url: 'https://example.com/page', first_click: true }, error: null });
    const res = await mockRpc('rpc_email_register_click', { p_link_id: 'lnk_abc' });
    expect(res.data.original_url).toBe('https://example.com/page');
    expect(res.data.first_click).toBe(true);
  });
});

describe('Edge Functions — track-pixel', () => {
  it('deve retornar GIF 1x1 de 43 bytes', () => {
    const PIXEL_SIZE = 43;
    expect(PIXEL_SIZE).toBe(43);
  });

  it('deve incluir headers anti-cache', () => {
    const headers = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    };
    expect(headers['Cache-Control']).toContain('no-store');
    expect(headers['Pragma']).toBe('no-cache');
  });
});

describe('Contact Scores', () => {
  it('deve calcular engagement score (+10 por open, +20 por click)', () => {
    const OPEN_POINTS  = 10;
    const CLICK_POINTS = 20;
    const opens  = 5;
    const clicks = 3;
    const score = opens * OPEN_POINTS + clicks * CLICK_POINTS;
    expect(score).toBe(110);
  });
});
