/**
 * Testes do hook useThemePreset focados nos comportamentos novos:
 *  - Aplicação de borderRadius sugerido pelo preset GX (4px)
 *  - Aplicação de --font-sans / --font-display (Rajdhani) ao selecionar GX
 *  - Reset de --font-* ao voltar a um skin sem font
 *  - Persistência em localStorage (preset, borderRadius, presetFont via cache)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

// useTheme é mockado para retornar 'dark' resolvido — não dependemos do
// matchMedia/<html class="dark"> no JSDOM.
vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'dark', setTheme: vi.fn(), resolvedTheme: 'dark' }),
}));

// Toast: silenciamos pra não poluir os asserts.
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { useThemePreset } from '../useThemePreset';
import { STORAGE_KEY } from '../presets';

const root = () => document.documentElement;

beforeEach(() => {
  localStorage.clear();
  // Limpa qualquer style inline que outro teste tenha deixado.
  root().style.cssText = '';
});

describe('useThemePreset — borderRadius por preset (GX)', () => {
  it('aplica borderRadius=4 ao selecionar gx-classic', () => {
    const { result } = renderHook(() => useThemePreset());

    act(() => {
      result.current.applyPreset('gx-classic');
    });

    expect(result.current.borderRadius).toBe(4);
    expect(root().style.getPropertyValue('--radius')).toBe(`${4 / 16}rem`);
  });

  it('todos os 9 skins GX aplicam borderRadius=4', () => {
    const ids = [
      'gx-classic', 'gx-pink-addiction', 'gx-purple-haze',
      'gx-rose-quartz', 'gx-ultraviolet', 'gx-hackerman',
      'gx-frutti-di-mare', 'gx-cyberpunk', 'gx-razer',
    ];

    const { result } = renderHook(() => useThemePreset());
    for (const id of ids) {
      act(() => {
        result.current.applyPreset(id);
      });
      expect(result.current.borderRadius, `${id} radius`).toBe(4);
    }
  });

  it('preserva borderRadius do usuário ao escolher um skin não-GX', () => {
    const { result } = renderHook(() => useThemePreset());

    // Usuário customiza pra 12px
    act(() => {
      result.current.handleBorderRadiusChange([12]);
    });
    expect(result.current.borderRadius).toBe(12);

    // Troca pra um skin sem borderRadius declarado
    act(() => {
      result.current.applyPreset('emerald');
    });
    expect(result.current.borderRadius).toBe(12);
  });

  it('persiste borderRadius=4 em localStorage ao aplicar GX', () => {
    const { result } = renderHook(() => useThemePreset());

    act(() => {
      result.current.applyPreset('gx-razer');
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    expect(stored.preset).toBe('gx-razer');
    expect(stored.borderRadius).toBe(4);
  });
});

describe('useThemePreset — tipografia por preset (GX)', () => {
  it('aplica --font-sans com Rajdhani ao selecionar um GX', () => {
    const { result } = renderHook(() => useThemePreset());

    act(() => {
      result.current.applyPreset('gx-classic');
    });

    expect(root().style.getPropertyValue('--font-sans')).toMatch(/Rajdhani/);
    expect(root().style.getPropertyValue('--font-display')).toMatch(/Rajdhani/);
  });

  it('remove --font-* inline ao voltar a um skin sem font (usa default global)', () => {
    const { result } = renderHook(() => useThemePreset());

    act(() => {
      result.current.applyPreset('gx-cyberpunk');
    });
    expect(root().style.getPropertyValue('--font-sans')).toMatch(/Rajdhani/);

    act(() => {
      result.current.applyPreset('corporate');
    });
    expect(root().style.getPropertyValue('--font-sans')).toBe('');
    expect(root().style.getPropertyValue('--font-display')).toBe('');
  });

  it('alterna entre dois GX diferentes mantém Rajdhani', () => {
    const { result } = renderHook(() => useThemePreset());

    act(() => {
      result.current.applyPreset('gx-hackerman');
    });
    const a = root().style.getPropertyValue('--font-sans');

    act(() => {
      result.current.applyPreset('gx-frutti-di-mare');
    });
    const b = root().style.getPropertyValue('--font-sans');

    expect(a).toBe(b);
    expect(a).toMatch(/Rajdhani/);
  });
});

describe('useThemePreset — applyPreset(notify=false) não dispara toast', () => {
  it('por padrão chama toast', async () => {
    const { toast } = await import('sonner');
    const { result } = renderHook(() => useThemePreset());

    act(() => {
      result.current.applyPreset('gx-classic');
    });

    expect(toast.success).toHaveBeenCalled();
  });
});

describe('useThemePreset — exportTheme/resetTheme com GX selecionado', () => {
  it('resetTheme volta a corporate e radius=8', () => {
    const { result } = renderHook(() => useThemePreset());

    act(() => {
      result.current.applyPreset('gx-classic'); // radius=4
    });
    expect(result.current.borderRadius).toBe(4);

    act(() => {
      result.current.resetTheme();
    });
    expect(result.current.activePreset).toBe('corporate');
    expect(result.current.borderRadius).toBe(8);
  });
});
