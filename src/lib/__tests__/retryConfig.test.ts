import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock supabase client BEFORE importing module under test
const fromMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

import {
  clampToRange,
  loadRetryConfig,
  getRetryConfigSync,
  invalidateRetryConfigCache,
  __resetRetryConfigCache,
  DEFAULT_RETRY_CONFIG,
  settingKeyFor,
  validateRetryConfig,
  hasRetryConfigErrors,
  RetryConfigValidationError,
} from '../retryConfig';

function mockSelect(rows: Array<{ key: string; value: string | null }>) {
  fromMock.mockReturnValue({
    select: () => ({
      in: () => Promise.resolve({ data: rows, error: null }),
    }),
  });
}

describe('clampToRange', () => {
  it('mantém valor dentro do range', () => {
    expect(clampToRange('maxRetries', 5)).toBe(5);
    expect(clampToRange('timeoutMs', 30_000)).toBe(30_000);
  });
  it('clampa abaixo do mínimo', () => {
    expect(clampToRange('maxRetries', 0)).toBe(1);
    expect(clampToRange('baseBackoffMs', 50)).toBe(100);
  });
  it('clampa acima do máximo', () => {
    expect(clampToRange('maxRetries', 999)).toBe(10);
    expect(clampToRange('timeoutMs', 500_000)).toBe(120_000);
  });
  it('devolve default para valores não-finitos', () => {
    expect(clampToRange('maxRetries', NaN)).toBe(DEFAULT_RETRY_CONFIG.maxRetries);
  });
});

describe('settingKeyFor', () => {
  it('usa namespace global sem instância', () => {
    expect(settingKeyFor('maxRetries')).toBe('retry.global.maxRetries');
    expect(settingKeyFor('timeoutMs', '_global')).toBe('retry.global.timeoutMs');
  });
  it('usa namespace de instância', () => {
    expect(settingKeyFor('maxRetries', 'wpp2')).toBe('retry.instance.wpp2.maxRetries');
  });
});

describe('loadRetryConfig', () => {
  beforeEach(() => {
    __resetRetryConfigCache();
    fromMock.mockReset();
  });

  it('devolve defaults quando nenhuma key existe', async () => {
    mockSelect([]);
    const cfg = await loadRetryConfig();
    expect(cfg).toEqual(DEFAULT_RETRY_CONFIG);
  });

  it('aplica overrides globais', async () => {
    mockSelect([
      { key: 'retry.global.maxRetries', value: '5' },
      { key: 'retry.global.timeoutMs', value: '45000' },
    ]);
    const cfg = await loadRetryConfig();
    expect(cfg.maxRetries).toBe(5);
    expect(cfg.timeoutMs).toBe(45_000);
    expect(cfg.baseBackoffMs).toBe(DEFAULT_RETRY_CONFIG.baseBackoffMs);
  });

  it('override de instância vence override global', async () => {
    mockSelect([
      { key: 'retry.global.maxRetries', value: '5' },
      { key: 'retry.instance.wpp2.maxRetries', value: '8' },
    ]);
    const cfg = await loadRetryConfig('wpp2');
    expect(cfg.maxRetries).toBe(8);
  });

  it('clampa valores fora do range', async () => {
    mockSelect([
      { key: 'retry.global.maxRetries', value: '999' },
      { key: 'retry.global.timeoutMs', value: '1' },
    ]);
    const cfg = await loadRetryConfig();
    expect(cfg.maxRetries).toBe(10);
    expect(cfg.timeoutMs).toBe(5_000);
  });

  it('devolve defaults em caso de erro de query', async () => {
    fromMock.mockReturnValue({
      select: () => ({
        in: () => Promise.resolve({ data: null, error: new Error('boom') }),
      }),
    });
    const cfg = await loadRetryConfig();
    expect(cfg).toEqual(DEFAULT_RETRY_CONFIG);
  });

  it('cacheia resultado entre chamadas', async () => {
    mockSelect([{ key: 'retry.global.maxRetries', value: '7' }]);
    await loadRetryConfig();
    fromMock.mockClear();
    const cfg = await loadRetryConfig();
    expect(cfg.maxRetries).toBe(7);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('invalidate força nova query', async () => {
    mockSelect([{ key: 'retry.global.maxRetries', value: '7' }]);
    await loadRetryConfig();
    invalidateRetryConfigCache();
    mockSelect([{ key: 'retry.global.maxRetries', value: '4' }]);
    const cfg = await loadRetryConfig();
    expect(cfg.maxRetries).toBe(4);
  });
});

describe('getRetryConfigSync', () => {
  beforeEach(() => __resetRetryConfigCache());

  it('devolve defaults antes de carregar', () => {
    expect(getRetryConfigSync()).toEqual(DEFAULT_RETRY_CONFIG);
  });

  it('devolve cacheado depois de loadRetryConfig', async () => {
    mockSelect([{ key: 'retry.global.maxRetries', value: '6' }]);
    await loadRetryConfig();
    expect(getRetryConfigSync().maxRetries).toBe(6);
  });

  it('cai pro global quando instância não tem cache', async () => {
    mockSelect([{ key: 'retry.global.maxRetries', value: '6' }]);
    await loadRetryConfig();
    expect(getRetryConfigSync('wpp2').maxRetries).toBe(6);
  });
});
