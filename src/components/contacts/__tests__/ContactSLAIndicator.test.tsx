/**
 * ContactSLAIndicator.test.tsx
 * Tests for the SLA badge component.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContactSLAIndicator, SLAStatus } from '@/components/contacts/ContactSLAIndicator';

describe('ContactSLAIndicator', () => {
  it('renders nothing for status "none"', () => {
    const { container } = render(<ContactSLAIndicator status="none" />);
    expect(container.innerHTML).toBe('');
  });

  it('renders "Dentro do SLA" for within status', () => {
    render(<ContactSLAIndicator status="within" remainingMinutes={30} />);
    expect(screen.getByText('Dentro do SLA')).toBeDefined();
    expect(screen.getByText('(30min)')).toBeDefined();
  });

  it('renders warning with animation', () => {
    render(<ContactSLAIndicator status="warning" remainingMinutes={5} />);
    expect(screen.getByText('SLA pr\u00f3ximo')).toBeDefined();
  });

  it('renders breached status', () => {
    render(<ContactSLAIndicator status="breached" remainingMinutes={-10} />);
    expect(screen.getByText('SLA estourado')).toBeDefined();
    expect(screen.getByText('(10min atr\u00e1s)')).toBeDefined();
  });

  it('renders paused status', () => {
    render(<ContactSLAIndicator status="paused" />);
    expect(screen.getByText('SLA pausado')).toBeDefined();
  });

  it('formats hours correctly', () => {
    render(<ContactSLAIndicator status="within" remainingMinutes={90} />);
    expect(screen.getByText('(1h30min)')).toBeDefined();
  });

  it('formats exact hours', () => {
    render(<ContactSLAIndicator status="within" remainingMinutes={120} />);
    expect(screen.getByText('(2h)')).toBeDefined();
  });

  it('has proper aria-label', () => {
    render(<ContactSLAIndicator status="within" remainingMinutes={15} />);
    const badge = screen.getByLabelText(/SLA: Dentro do SLA/);
    expect(badge).toBeDefined();
  });
});
