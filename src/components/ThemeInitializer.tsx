import { useEffect } from 'react';
import {
  PRESETS,
  CSS_VARS_TO_APPLY,
  STORAGE_KEY,
  DEFAULT_PRESET_ID,
  normalizeStoredPresetId,
} from '@/components/settings/theme/presets';
import type { ThemeModeColors } from '@/components/settings/theme/presets';
import { useTheme } from '@/hooks/useTheme';

import { getLogger } from '@/lib/logger';
const log = getLogger('ThemeInitializer');

type StoredThemeConfig = {
  borderRadius?: number;
  cacheMode?: 'light' | 'dark';
  cachePreset?: string;
  cssVarsCache?: Record<string, string>;
  preset?: string;
};

/**
 * Global theme initializer — must be mounted at the app root.
 * Restores saved skin (preset + border-radius) on every page load
 * and re-applies when light/dark mode changes.
 * Also caches computed CSS vars in localStorage for the inline
 * flash-prevention script in index.html.
 */
export function ThemeInitializer() {
  const { resolvedTheme, theme } = useTheme();

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    let presetId = DEFAULT_PRESET_ID;
    let radius = 8;
    let storedConfig: StoredThemeConfig = {};

    if (saved) {
      try {
        const parsed = JSON.parse(saved) as StoredThemeConfig;
        storedConfig = parsed;
        presetId = normalizeStoredPresetId(parsed.preset);
        if (parsed.borderRadius != null) radius = parsed.borderRadius;
      } catch {
        storedConfig = {};
      }
    }

    const preset = PRESETS.find((p) => p.id === presetId) || PRESETS.find((p) => p.id === DEFAULT_PRESET_ID);
    if (preset) {
      const colors: ThemeModeColors = resolvedTheme === 'dark' ? preset.dark : preset.light;
      const root = document.documentElement;
      const cssVarsCache: Record<string, string> = {};

      for (const key of CSS_VARS_TO_APPLY) {
        const value = colors[key];
        root.style.setProperty(`--${key}`, value);
        cssVarsCache[key] = value;
      }

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          ...storedConfig,
          borderRadius: radius,
          cacheMode: resolvedTheme,
          cachePreset: presetId,
          cssVarsCache,
          preset: presetId,
        }));
      } catch (err) { log.error('Unexpected error in ThemeInitializer:', err); }
    }

    document.documentElement.style.setProperty('--radius', `${radius / 16}rem`);
  }, [resolvedTheme, theme]);

  return null;
}
