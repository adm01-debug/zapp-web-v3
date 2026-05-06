import { useEffect, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { STORAGE_KEY, DEFAULT_PRESET_ID, PRESETS } from '@/components/settings/theme/presets';

export interface AuditResult {
  oledPass: boolean;
  fontPass: boolean;
  colorPass: boolean;
  violations: string[];
}

/**
 * Hook para detecção automática de inconsistências visuais (cores fixas hardcoded)
 * que violam o padrão "Preto OLED puro" (HSL 0 0% 0%).
 * Agora também valida a integridade das fontes (Theme Safeguard).
 */
export const useThemeAudit = () => {
  const { resolvedTheme } = useTheme();
  const [result, setResult] = useState<AuditResult>({
    oledPass: true,
    fontPass: true,
    colorPass: true,
    violations: []
  });

  useEffect(() => {
    // Audit logic
    const runAudit = () => {
      // 1. OLED Audit
      const elements = document.querySelectorAll('*');
      const oledViolations: string[] = [];
      
      elements.forEach((el) => {
        const style = window.getComputedStyle(el);
        const bg = style.backgroundColor;
        
        if (bg === 'rgb(31, 41, 55)' || bg === 'rgb(17, 24, 39)' || bg === 'rgb(9, 9, 11)') {
          const path = getElementPath(el);
          oledViolations.push(`[OLED Audit] Background inconsistente (${bg}) em: ${path}`);
        }
      });

      if (oledViolations.length > 0) {
        console.group('🔍 Relatório de Inconsistências OLED');
        console.warn(`${oledViolations.length} elementos encontrados com cores de fundo não-OLED.`);
        oledViolations.forEach(v => console.log(v));
        console.groupEnd();
      }

      // 2. Font Safeguard Audit
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
          `[ThemeAudit] ⚠️ Font leak detected! Inline fonts found ("${inlineSans}") but preset "${presetId}" does not define one. This might override tokens.css.`
        );
      }

      const computedFont = getComputedStyle(root).getPropertyValue('--font-sans').trim();
      if (!computedFont.includes('Inter') && !shouldHaveInlineFont) {
        console.warn(
          `[ThemeAudit] ⚠️ Typography mismatch: --font-sans does not contain "Inter". Current value: ${computedFont}`
        );
      }
    };

    // Delay audit to allow all initializers to run
    const timer = setTimeout(runAudit, 2500);
    return () => clearTimeout(timer);
  }, [resolvedTheme]);
};

function getElementPath(el: Element): string {
  const path = [];
  let current: Element | null = el;
  while (current && current !== document.body) {
    let name = current.tagName.toLowerCase();
    if (current.id) name += `#${current.id}`;
    if (current.className) name += `.${Array.from(current.classList).join('.')}`;
    path.unshift(name);
    current = current.parentElement;
  }
  return path.join(' > ');
}
