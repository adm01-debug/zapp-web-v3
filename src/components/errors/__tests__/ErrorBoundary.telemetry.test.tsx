import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  getLogger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }),
}));

import { ErrorBoundary } from '../ErrorBoundary';
import { getTelemetrySnapshot, resetTelemetry } from '@/lib/clientTelemetry';

function Bomb({ message, name }: { message: string; name?: string }): React.ReactElement {
  const err = new Error(message);
  if (name) err.name = name;
  throw err;
}

describe('ErrorBoundary → clientTelemetry', () => {
  beforeEach(() => {
    resetTelemetry();
    // Silence React's noisy uncaught-error logs in test output.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('records a timeout event when render fails with a TimeoutError', () => {
    render(
      <ErrorBoundary>
        <Bomb message="Query timed out. Try narrower filters." name="TimeoutError" />
      </ErrorBoundary>,
    );
    const snap = getTelemetrySnapshot();
    expect(snap.total).toBe(1);
    const ev = snap.recentEvents[0];
    expect(ev.severity).toBe('timeout');
    expect(ev.target).toBe('render:timeout');
    expect(ev.source).toBe('externalProxy');
    expect(ev.errorMessage).toMatch(/\[ErrorBoundary\]/);
  });

  it('records an error event for an external proxy failure', () => {
    render(
      <ErrorBoundary>
        <Bomb message="External DB proxy error: boom" />
      </ErrorBoundary>,
    );
    const ev = getTelemetrySnapshot().recentEvents[0];
    expect(ev.severity).toBe('error');
    expect(ev.source).toBe('externalProxy');
    expect(ev.target).toBe('externalProxy:render');
  });

  it('records a generic error for an unrelated render bug', () => {
    render(
      <ErrorBoundary>
        <Bomb message="Cannot read properties of undefined (reading foo)" />
      </ErrorBoundary>,
    );
    const ev = getTelemetrySnapshot().recentEvents[0];
    expect(ev.severity).toBe('error');
    expect(ev.source).toBe('lovableCloud');
    expect(ev.target).toBe('render:error');
  });

  it('extracts correlationId embedded in the error message', () => {
    render(
      <ErrorBoundary>
        <Bomb message="rpc failed [cid=ab12cd34] timeout" name="TimeoutError" />
      </ErrorBoundary>,
    );
    const ev = getTelemetrySnapshot().recentEvents[0];
    expect(ev.correlationId).toBe('ab12cd34');
    expect(ev.severity).toBe('timeout');
  });

  it('still calls the user-provided onError handler', () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <Bomb message="oops" />
      </ErrorBoundary>,
    );
    expect(onError).toHaveBeenCalledTimes(1);
    expect(getTelemetrySnapshot().total).toBe(1);
  });
});
