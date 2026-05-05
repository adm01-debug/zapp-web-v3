import { useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { STORAGE_KEY, DEFAULT_PRESET_ID, PRESETS } from '@/components/settings/theme/presets';

/**
 * Validates that ThemeInitializer is behaving correctly regarding fonts.
 * Logs warnings to console if fonts are being forced inline when they shouldn't be.
 */
export function useThemeAudit() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    // Wait for ThemeInitializer to finish its work
    const timeout = setTimeout(() => {
      const root = document.documentElement;
      const inlineSans = root.style.getPropertyValue('--font-sans');
      const inlineDisplay = root.style.getPropertyValue('--font-display');
      
      const saved = localStorage.getItem(STORAGE_KEY);
      let presetId = DEFAULT_PRESET_ID;
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          presetId = parsed.preset || DEFAULT_PRESET_ID;
        } catch (e) {}
      }
      
      const preset = PRESETS.find(p => p.id === presetId);
      const shouldHaveInlineFont = !!preset?.font;

      if (!shouldHaveInlineFont && (inlineSans || inlineDisplay)) {
        console.warn(
          `[ThemeAudit] ⚠️ Font leak detected! Inline fonts found (${inlineSans}) but preset "${presetId}" does not define one. This might override tokens.css.`
        );
      }

      const computedFont = getComputedStyle(root).getPropertyValue('--font-sans').trim();
      if (!computedFont.includes('Outfit') && !shouldHaveInlineFont) {
        console.warn(
          `[ThemeAudit] ⚠️ Typography mismatch: --font-sans does not contain "Outfit". Current value: ${computedFont}`
        );
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [resolvedTheme]);
}
