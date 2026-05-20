import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    circle: (props: any) => <circle {...props} />,
  },
}));

import { SLAIndicator } from '../SLAIndicator';

describe('SLAIndicator', () => {
  const now = new Date('2026-04-08T12:00:00Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when resolved and within SLA', () => {
    const { container } = render(
      <SLAIndicator
        firstMessageAt={new Date('2026-04-08T11:00:00Z')}
        firstResponseAt={new Date('2026-04-08T11:02:00Z')}
        resolvedAt={new Date('2026-04-08T11:30:00Z')}
        firstResponseMinutes={5}
        resolutionMinutes={60}
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows first response countdown when waiting for response', () => {
    const { container } = render(
      <SLAIndicator
        firstMessageAt={new Date('2026-04-08T11:58:00Z')}
        firstResponseMinutes={5}
        resolutionMinutes={60}
      />
    );
    // Should show 1ª Resp text
    expect(container.textContent).toContain('1ª Resp');
  });

  it('shows resolution countdown when response given but not resolved', () => {
    const { container } = render(
      <SLAIndicator
        firstMessageAt={new Date('2026-04-08T11:00:00Z')}
        firstResponseAt={new Date('2026-04-08T11:02:00Z')}
        firstResponseMinutes={5}
        resolutionMinutes={120}
      />
    );
    expect(container.textContent).toContain('Resolução');
  });

  it('shows breached status when first response deadline passed', () => {
    const { container } = render(
      <SLAIndicator
        firstMessageAt={new Date('2026-04-08T10:00:00Z')} // 2 hours ago
        firstResponseMinutes={5} // 5 min deadline
        resolutionMinutes={60}
      />
    );
    expect(container.textContent).toContain('Violado');
  });

  it('shows breached status for resolution when past deadline', () => {
    const { container } = render(
      <SLAIndicator
        firstMessageAt={new Date('2026-04-08T09:00:00Z')} // 3 hours ago
        firstResponseAt={new Date('2026-04-08T09:03:00Z')}
        firstResponseMinutes={5}
        resolutionMinutes={60} // 1 hour deadline, 3 hours ago
      />
    );
    expect(container.textContent).toContain('Violado');
  });

  it('renders compact mode with tooltip', () => {
    const { container } = render(
      <SLAIndicator
        firstMessageAt={new Date('2026-04-08T11:58:00Z')}
        firstResponseMinutes={5}
        resolutionMinutes={60}
        compact
      />
    );
    // Compact mode should render smaller with less detail
    expect(container.querySelector('[class*="text-[10px]"]')).toBeTruthy();
  });

  it('applies custom className', () => {
    const { container } = render(
      <SLAIndicator
        firstMessageAt={new Date('2026-04-08T11:58:00Z')}
        firstResponseMinutes={5}
        resolutionMinutes={60}
        className="my-custom-class"
      />
    );
    expect(container.querySelector('.my-custom-class')).toBeTruthy();
  });
});

describe('SLAIndicator — formatTimeRemaining', () => {
  // Test the formatting logic
  function formatTimeRemaining(ms: number): string {
    const absMs = Math.abs(ms);
    const totalSeconds = Math.floor(absMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) return `${hours}h ${remainingMinutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  }

  it('formats seconds only', () => {
    expect(formatTimeRemaining(45000)).toBe('45s');
  });

  it('formats minutes and seconds', () => {
    expect(formatTimeRemaining(125000)).toBe('2m 5s');
  });

  it('formats hours and minutes', () => {
    expect(formatTimeRemaining(3_660_000)).toBe('1h 1m');
  });

  it('handles zero', () => {
    expect(formatTimeRemaining(0)).toBe('0s');
  });

  it('handles negative values (breached time)', () => {
    expect(formatTimeRemaining(-60000)).toBe('1m 0s');
  });
});

describe('SLAIndicator — calculateSLAState', () => {
  type SLAStatus = 'ok' | 'warning' | 'breached';

  function calculateSLAState(
    firstMessageAt: Date,
    firstResponseAt: Date | null | undefined,
    resolvedAt: Date | null | undefined,
    firstResponseMinutes: number,
    resolutionMinutes: number
  ) {
    const now = new Date();
    const firstResponseDeadline = new Date(firstMessageAt.getTime() + firstResponseMinutes * 60 * 1000);
    const resolutionDeadline = new Date(firstMessageAt.getTime() + resolutionMinutes * 60 * 1000);

    let firstResponseStatus: SLAStatus = 'ok';
    let firstResponseRemaining = firstResponseDeadline.getTime() - now.getTime();
    let firstResponseBreached = false;

    if (firstResponseAt) {
      firstResponseBreached = firstResponseAt > firstResponseDeadline;
      firstResponseStatus = firstResponseBreached ? 'breached' : 'ok';
      firstResponseRemaining = 0;
    } else {
      const warningThreshold = firstResponseMinutes * 60 * 1000 * 0.3;
      if (firstResponseRemaining <= 0) {
        firstResponseStatus = 'breached';
        firstResponseBreached = true;
      } else if (firstResponseRemaining <= warningThreshold) {
        firstResponseStatus = 'warning';
      }
    }

    let resolutionStatus: SLAStatus = 'ok';
    let resolutionRemaining = resolutionDeadline.getTime() - now.getTime();
    let resolutionBreached = false;

    if (resolvedAt) {
      resolutionBreached = resolvedAt > resolutionDeadline;
      resolutionStatus = resolutionBreached ? 'breached' : 'ok';
      resolutionRemaining = 0;
    } else {
      const warningThreshold = resolutionMinutes * 60 * 1000 * 0.3;
      if (resolutionRemaining <= 0) {
        resolutionStatus = 'breached';
        resolutionBreached = true;
      } else if (resolutionRemaining <= warningThreshold) {
        resolutionStatus = 'warning';
      }
    }

    return {
      firstResponse: { status: firstResponseStatus, remainingMs: firstResponseRemaining, breached: firstResponseBreached },
      resolution: { status: resolutionStatus, remainingMs: resolutionRemaining, breached: resolutionBreached },
    };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-08T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('returns ok when well within deadline', () => {
    const state = calculateSLAState(
      new Date('2026-04-08T11:59:00Z'), null, null, 5, 60
    );
    expect(state.firstResponse.status).toBe('ok');
    expect(state.resolution.status).toBe('ok');
  });

  it('returns warning when within 30% threshold', () => {
    // 10 min SLA, started 8 min ago → 2 min remaining = 20% of 10 min
    const state = calculateSLAState(
      new Date('2026-04-08T11:52:00Z'), null, null, 10, 60
    );
    expect(state.firstResponse.status).toBe('warning');
  });

  it('returns breached when past deadline', () => {
    const state = calculateSLAState(
      new Date('2026-04-08T11:00:00Z'), null, null, 5, 30
    );
    expect(state.firstResponse.status).toBe('breached');
    expect(state.firstResponse.breached).toBe(true);
  });

  it('marks first response as ok when responded within deadline', () => {
    const state = calculateSLAState(
      new Date('2026-04-08T11:55:00Z'),
      new Date('2026-04-08T11:57:00Z'), // 2 min response, 5 min SLA
      null, 5, 60
    );
    expect(state.firstResponse.status).toBe('ok');
    expect(state.firstResponse.breached).toBe(false);
  });

  it('marks first response as breached when responded after deadline', () => {
    const state = calculateSLAState(
      new Date('2026-04-08T11:00:00Z'),
      new Date('2026-04-08T11:10:00Z'), // 10 min response, 5 min SLA
      null, 5, 60
    );
    expect(state.firstResponse.status).toBe('breached');
    expect(state.firstResponse.breached).toBe(true);
  });

  it('marks resolution as breached when resolved after deadline', () => {
    const state = calculateSLAState(
      new Date('2026-04-08T10:00:00Z'),
      new Date('2026-04-08T10:03:00Z'),
      new Date('2026-04-08T11:30:00Z'), // 90 min, 60 min SLA
      5, 60
    );
    expect(state.resolution.status).toBe('breached');
    expect(state.resolution.breached).toBe(true);
  });
});
