/**
 * useEmailSLA.test.ts — Testes para o hook useEmailSLA
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEmailSLA } from '../useEmailSLA';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gt: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  },
}));

describe('useEmailSLA', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('deve registrar uma nova thread como "ok" imediatamente após recebimento', () => {
    const { result } = renderHook(() => useEmailSLA('account-1'));

    act(() => {
      result.current.registerThread('thread-1', new Date().toISOString());
    });

    expect(result.current.getStatus('thread-1')).toBe('ok');
  });

  it('deve retornar null para thread não registrada', () => {
    const { result } = renderHook(() => useEmailSLA('account-1'));
    expect(result.current.getStatus('thread-unknown')).toBeNull();
  });

  it('deve marcar status como "warning" quando próximo do threshold', () => {
    const { result } = renderHook(() =>
      useEmailSLA('account-1', { threshold_minutes: 10, warning_threshold_pct: 80, business_hours_only: false })
    );

    // Simula thread recebida 9 minutos atrás (90% do threshold de 10min)
    const nineMinutesAgo = new Date(Date.now() - 9 * 60 * 1000).toISOString();

    act(() => {
      result.current.registerThread('thread-warning', nineMinutesAgo);
    });

    expect(result.current.getStatus('thread-warning')).toBe('warning');
  });

  it('deve marcar status como "breached" quando excede o threshold', () => {
    const { result } = renderHook(() =>
      useEmailSLA('account-1', { threshold_minutes: 5, warning_threshold_pct: 80, business_hours_only: false })
    );

    // Simula thread recebida 6 minutos atrás (120% do threshold)
    const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000).toISOString();

    act(() => {
      result.current.registerThread('thread-breached', sixMinutesAgo);
    });

    expect(result.current.getStatus('thread-breached')).toBe('breached');
    expect(result.current.breachedCount).toBe(1);
  });

  it('deve marcar thread como respondida e congelar status em "ok"', () => {
    const { result } = renderHook(() =>
      useEmailSLA('account-1', { threshold_minutes: 5, warning_threshold_pct: 80, business_hours_only: false })
    );

    // Thread recebida há 6 minutos (breached)
    const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000).toISOString();

    act(() => {
      result.current.registerThread('thread-replied', sixMinutesAgo);
    });

    expect(result.current.getStatus('thread-replied')).toBe('breached');

    // Marcar como respondida
    act(() => {
      result.current.markReplied('thread-replied');
    });

    // Após resposta, status congela em 'ok'
    expect(result.current.getRecord('thread-replied')?.first_reply_at).not.toBeNull();
    expect(result.current.getStatus('thread-replied')).toBe('ok');
  });

  it('breachedCount deve refletir corretamente múltiplas threads', () => {
    const { result } = renderHook(() =>
      useEmailSLA('account-1', { threshold_minutes: 5, warning_threshold_pct: 80, business_hours_only: false })
    );

    const old = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const recent = new Date().toISOString();

    act(() => {
      result.current.registerThread('t1', old);   // breached
      result.current.registerThread('t2', old);   // breached
      result.current.registerThread('t3', recent); // ok
    });

    expect(result.current.breachedCount).toBe(2);
    expect(result.current.warningCount).toBe(0);
  });

  it('warningCount deve contabilizar threads em warning', () => {
    const { result } = renderHook(() =>
      useEmailSLA('account-1', { threshold_minutes: 10, warning_threshold_pct: 80, business_hours_only: false })
    );

    // 85% do threshold (8.5min atrás)
    const warningTime = new Date(Date.now() - 8.5 * 60 * 1000).toISOString();

    act(() => {
      result.current.registerThread('t-warning', warningTime);
    });

    expect(result.current.warningCount).toBe(1);
    expect(result.current.breachedCount).toBe(0);
  });
});
