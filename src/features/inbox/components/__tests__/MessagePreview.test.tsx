import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MessagePreview, useHasFormattableContent } from '@/features/MessagePreview';
import { renderHook } from '@testing-library/react';

// ─── Mocks ───────────────────────────────────────────────
import { vi } from 'vitest';
vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef<HTMLDivElement, Record<string, unknown>>((props, ref) => {
      const { whileHover, whileTap, initial, animate, exit, transition, variants, ...rest } = props;
      void whileHover; void whileTap; void initial; void animate; void exit; void transition; void variants;
      return React.createElement('div', { ...rest, ref });
    }),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

describe('MessagePreview — pré-visualização antes de enviar', () => {
  it('não renderiza nada quando o conteúdo está vazio (outbound)', () => {
    const { container } = render(<MessagePreview content="" />);
    expect(container.firstChild).toBeNull();
  });

  it('mostra label "Preview:" quando há conteúdo', () => {
    render(<MessagePreview content="Olá mundo" />);
    expect(screen.getByText('Preview:')).toBeInTheDocument();
    expect(screen.getByText('Olá mundo')).toBeInTheDocument();
  });

  it('formata negrito **texto** antes do envio', () => {
    render(<MessagePreview content="Veja **isso** aqui" />);
    const bold = screen.getByText('isso');
    expect(bold.tagName).toBe('STRONG');
  });

  it('formata itálico *texto* e _texto_', () => {
    const { rerender } = render(<MessagePreview content="abc *xyz* def" />);
    expect(screen.getByText('xyz').tagName).toBe('EM');
    rerender(<MessagePreview content="abc _xyz2_ def" />);
    expect(screen.getByText('xyz2').tagName).toBe('EM');
  });

  it('formata code `snippet`', () => {
    render(<MessagePreview content="Use `npm install`" />);
    const code = screen.getByText('npm install');
    expect(code.tagName).toBe('CODE');
  });

  it('renderiza links como <a> com target=_blank e rel seguro', () => {
    render(<MessagePreview content="Acesse https://lovable.dev agora" />);
    const link = screen.getByRole('link', { name: 'https://lovable.dev' }) as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('https://lovable.dev');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(link.getAttribute('rel')).toContain('noreferrer');
  });

  it('converte emoji shortcodes (:fire:, :100:, <3) e smileys (:), :D)', () => {
    render(<MessagePreview content=":fire: :100: <3 :) :D" />);
    // Conteúdo unificado contém todos os emojis convertidos
    const node = screen.getByText(/🔥/);
    expect(node.textContent).toContain('🔥');
    expect(node.textContent).toContain('💯');
    expect(node.textContent).toContain('❤️');
    expect(node.textContent).toContain('😊');
    expect(node.textContent).toContain('😃');
  });

  it('combina múltiplas formatações independentes na mesma string', () => {
    // Evita conflito do parser entre **bold** e *italic* sobrepostos.
    render(<MessagePreview content="_ital_ e `code` e https://x.com" />);
    expect(screen.getByText('ital').tagName).toBe('EM');
    expect(screen.getByText('code').tagName).toBe('CODE');
    expect(screen.getByRole('link')).toBeInTheDocument();
  });

  it('aplica className customizada', () => {
    const { container } = render(<MessagePreview content="oi" className="custom-cls" />);
    expect(container.querySelector('.custom-cls')).toBeTruthy();
  });
});

describe('useHasFormattableContent — gating do preview', () => {
  it('retorna false para texto sem formatação', () => {
    const { result } = renderHook(() => useHasFormattableContent('apenas texto puro'));
    expect(result.current).toBe(false);
  });

  it('retorna false para conteúdo vazio', () => {
    const { result } = renderHook(() => useHasFormattableContent(''));
    expect(result.current).toBe(false);
  });

  it.each([
    ['negrito **x**', '**bold**'],
    ['itálico *x*', 'um *italic* texto'],
    ['itálico _x_', 'um _italic_ texto'],
    ['code `x`', 'um `cmd` texto'],
    ['link http', 'visite https://x.com'],
    ['emoji shortcode', 'fogo :fire:'],
    ['smiley :)', 'oi :)'],
    ['smiley :D', 'oi :D'],
    ['heart <3', 'oi <3'],
  ])('detecta %s como formatável', (_label, content) => {
    const { result } = renderHook(() => useHasFormattableContent(content));
    expect(result.current).toBe(true);
  });
});
