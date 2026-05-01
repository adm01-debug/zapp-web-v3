import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MessageStatus } from '@/features/inbox/components/MessageStatus';

/**
 * Garante que mensagens de áudio com status 'played' renderizam o ícone
 * CheckCheck (double check) com a cor `text-info`, igual ao 'read' do
 * WhatsApp Web — sinalizando que o áudio foi reproduzido pelo destinatário.
 */
describe('MessageStatus — played (áudio reproduzido)', () => {
  it('renderiza o ícone CheckCheck com classe text-info', () => {
    const { container } = render(<MessageStatus status="played" />);

    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    // lucide-react expõe o nome do ícone via atributo `class` (lucide-check-check)
    // ou `data-lucide`. Validamos via classe semântica de cor + contagem de paths.
    expect(svg?.getAttribute('class') ?? '').toContain('text-info');
    // CheckCheck tem 2 paths (dois "checks"); Check simples tem 1.
    const paths = svg?.querySelectorAll('path') ?? [];
    expect(paths.length).toBeGreaterThanOrEqual(2);
  });

  it('expõe o label "Reproduzido" quando showLabel=true', () => {
    const { getAllByText } = render(<MessageStatus status="played" showLabel />);
    expect(getAllByText('Reproduzido').length).toBeGreaterThan(0);
  });

  it('usa text-info também no texto do label', () => {
    const { container } = render(<MessageStatus status="played" showLabel />);
    const label = container.querySelector('span > span');
    expect(label?.className ?? '').toContain('text-info');
  });

  it('diferencia visualmente de delivered (text-muted-foreground)', () => {
    const { container: played } = render(<MessageStatus status="played" />);
    const { container: delivered } = render(<MessageStatus status="delivered" />);
    expect(played.querySelector('svg')?.getAttribute('class') ?? '').toContain('text-info');
    expect(delivered.querySelector('svg')?.getAttribute('class') ?? '').toContain('text-muted-foreground');
  });
});
