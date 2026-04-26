import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveSendFunction, clearSendFunctionCache } from '../sendFunctionRouter';

const mockMaybeSingle = vi.fn();
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

beforeEach(() => {
  clearSendFunctionCache();
  mockFrom.mockClear();
  mockSelect.mockClear();
  mockEq.mockClear();
  mockMaybeSingle.mockReset();
});

describe('sendFunctionRouter — smoke pre-deploy', () => {
  it('routes api_type="official" → whatsapp-cloud-api', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { api_type: 'official' }, error: null });
    expect(await resolveSendFunction('inst-1')).toBe('whatsapp-cloud-api');
  });

  it('routes api_type="evolution" → evolution-api', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { api_type: 'evolution' }, error: null });
    expect(await resolveSendFunction('inst-2')).toBe('evolution-api');
  });

  it('routes null/undefined api_type → evolution-api (default)', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { api_type: null }, error: null });
    expect(await resolveSendFunction('inst-3')).toBe('evolution-api');
  });

  it('routes missing connection → evolution-api (default)', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await resolveSendFunction('inst-4')).toBe('evolution-api');
  });

  it('falls back to evolution-api on DB error', async () => {
    mockMaybeSingle.mockRejectedValue(new Error('boom'));
    expect(await resolveSendFunction('inst-5')).toBe('evolution-api');
  });

  it('returns evolution-api immediately for empty instance name (no DB call)', async () => {
    expect(await resolveSendFunction('')).toBe('evolution-api');
    expect(await resolveSendFunction(null)).toBe('evolution-api');
    expect(await resolveSendFunction(undefined)).toBe('evolution-api');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('caches result for 60s — second call does NOT hit DB', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { api_type: 'official' }, error: null });
    await resolveSendFunction('inst-cache');
    await resolveSendFunction('inst-cache');
    await resolveSendFunction('inst-cache');
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it('clearSendFunctionCache() forces re-fetch', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { api_type: 'official' }, error: null });
    await resolveSendFunction('inst-clear');
    clearSendFunctionCache();
    await resolveSendFunction('inst-clear');
    expect(mockFrom).toHaveBeenCalledTimes(2);
  });
});
