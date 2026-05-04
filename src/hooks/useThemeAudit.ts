import { useEffect } from 'react';

/**
 * Hook para detecção automática de inconsistências visuais (cores fixas hardcoded)
 * que violam o padrão "Preto OLED puro" (HSL 0 0% 0%).
 */
export const useThemeAudit = () => {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const audit = () => {
        const elements = document.querySelectorAll('*');
        const violations: string[] = [];
        
        elements.forEach((el) => {
          const style = window.getComputedStyle(el);
          const bg = style.backgroundColor;
          
          // Detecta "quase preto" ou cores cinzas que deveriam ser OLED Black (0, 0, 0)
          // ou herdar das variáveis CSS.
          if (bg === 'rgb(31, 41, 55)' || bg === 'rgb(17, 24, 39)' || bg === 'rgb(9, 9, 11)') {
            const path = getElementPath(el);
            violations.push(`[OLED Audit] Background inconsistente (${bg}) em: ${path}`);
          }
        });

        if (violations.length > 0) {
          console.group('🔍 Relatório de Inconsistências OLED');
          console.warn(`${violations.length} elementos encontrados com cores de fundo não-OLED.`);
          violations.forEach(v => console.log(v));
          console.groupEnd();
        }
      };

      // Aguarda o carregamento completo para auditar
      const timer = setTimeout(audit, 2000);
      return () => clearTimeout(timer);
    }
  }, []);
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
