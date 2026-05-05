import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useThemePreset } from '../useThemePreset';
import { DEFAULT_PRESET_ID, PRESETS } from '../presets';

// Mock matchMedia
window.matchMedia = window.matchMedia || function() {
  return {
    matches: false,
    addListener: function() {},
    removeListener: function() {}
  };
};

describe('Theme Font Preservation', () => {
  beforeEach(() => {
    document.documentElement.style.cssText = '';
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should not inject inline font styles for the default preset if none specified', () => {
    const { result } = renderHook(() => useThemePreset());
    
    act(() => {
      result.current.applyPreset(DEFAULT_PRESET_ID, false);
    });

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--font-sans')).toBe('');
    expect(root.style.getPropertyValue('--font-display')).toBe('');
  });

  it('should inject inline font styles when a preset defines a font (like Opera GX)', () => {
    const gxPreset = PRESETS.find(p => p.font);
    if (!gxPreset) return;

    const { result } = renderHook(() => useThemePreset());
    
    act(() => {
      result.current.applyPreset(gxPreset.id, false);
    });

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--font-sans')).toBe(gxPreset.font);
  });

  it('should remove inline font styles when switching back to default preset', () => {
    const gxPreset = PRESETS.find(p => p.font);
    if (!gxPreset) return;

    const { result } = renderHook(() => useThemePreset());
    
    // Switch to GX
    act(() => {
      result.current.applyPreset(gxPreset.id, false);
    });
    
    expect(document.documentElement.style.getPropertyValue('--font-sans')).toBe(gxPreset.font);

    // Switch to Default
    act(() => {
      result.current.applyPreset(DEFAULT_PRESET_ID, false);
    });

    expect(document.documentElement.style.getPropertyValue('--font-sans')).toBe('');
  });

  it('should reset theme correctly without affecting fonts if default preset has no font', () => {
    const { result } = renderHook(() => useThemePreset());
    
    act(() => {
      result.current.resetTheme();
    });

    expect(document.documentElement.style.getPropertyValue('--font-sans')).toBe('');
    expect(result.current.activePreset).toBe(DEFAULT_PRESET_ID);
  });
});
