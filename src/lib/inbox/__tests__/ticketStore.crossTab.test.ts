import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ticketStore } from '../ticketStore';

const STORAGE_KEY = 'inbox.tickets.overlay.v1';

/**
 * Cross-tab cache invalidation tests.
 *
 * The ticket store keeps an in-memory `cachedOverlay` so that
 * `useSyncExternalStore` receives a stable reference between renders.
 * When another tab mutates `localStorage`, the browser fires a native
 * `storage` event — the store MUST invalidate the cache so the next
 * `snapshot()` returns the freshly-persisted overlay (not the stale ref).
 *
 * These tests also assert that every local mutation (`bootstrap`,
 * `setStatus`, `assign`) updates the cached reference AND persists to
 * localStorage, so a sibling tab subscribing to `storage` will see it.
 */
describe('ticketStore — cross-tab cache invalidation', () => {
  beforeEach(() => {
    window.localStorage.clear();
    // Force cache reset by simulating an external clear
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
  });

  it('invalidates cache when storage event fires from another tab', () => {
    const unsubscribe = ticketStore.subscribe(() => undefined);
    ticketStore.setStatus('contact-1', 'in_progress', 'agent-a');
    const before = ticketStore.snapshot();
    expect(before['contact-1']?.status).toBe('in_progress');

    // Simulate another tab writing directly to localStorage
    const externalOverlay = {
      'contact-1': {
        status: 'resolved' as const,
        assignedTo: 'agent-b',
        queueId: null,
        openedAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        resolvedAt: '2026-01-02T00:00:00.000Z',
        events: [],
      },
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(externalOverlay));
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));

    const after = ticketStore.snapshot();
    expect(after).not.toBe(before); // reference changed → cache was invalidated
    expect(after['contact-1']?.status).toBe('resolved');
    expect(after['contact-1']?.assignedTo).toBe('agent-b');
    unsubscribe();
  });

  it('ignores storage events for unrelated keys', () => {
    ticketStore.setStatus('contact-1', 'in_progress', 'agent-a');
    const before = ticketStore.snapshot();

    window.localStorage.setItem('some.other.key', 'foo');
    window.dispatchEvent(new StorageEvent('storage', { key: 'some.other.key' }));

    const after = ticketStore.snapshot();
    expect(after).toBe(before); // same reference — cache untouched
  });

  it('notifies subscribers on cross-tab storage events', () => {
    const listener = vi.fn();
    const unsubscribe = ticketStore.subscribe(listener);

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ 'contact-x': { status: 'open', assignedTo: null, queueId: null, openedAt: 'x', updatedAt: 'x', events: [] } }),
    );
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it.each([
    ['bootstrap', () => ticketStore.bootstrap('c-boot')],
    ['setStatus', () => ticketStore.setStatus('c-status', 'resolved', 'agent')],
    ['assign', () => ticketStore.assign('c-assign', 'agent-1', 'agent')],
  ])('mutation "%s" persists to localStorage (visible to other tabs)', (_name, mutate) => {
    mutate();
    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(Object.keys(parsed).length).toBeGreaterThan(0);
  });

  it.each([
    ['setStatus', () => ticketStore.setStatus('c1', 'in_progress', 'agent')],
    ['assign', () => ticketStore.assign('c1', 'agent-1', 'agent')],
  ])('mutation "%s" produces a new snapshot reference', (_name, mutate) => {
    const before = ticketStore.snapshot();
    mutate();
    const after = ticketStore.snapshot();
    expect(after).not.toBe(before);
  });

  it('snapshot returns stable reference between reads (no spurious invalidation)', () => {
    ticketStore.setStatus('c-stable', 'in_progress', 'agent');
    const a = ticketStore.snapshot();
    const b = ticketStore.snapshot();
    const c = ticketStore.snapshot();
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('round-trips local mutation → external storage event → fresh snapshot', () => {
    ticketStore.setStatus('c-rt', 'in_progress', 'agent-a');
    const local = ticketStore.snapshot();
    expect(local['c-rt']?.status).toBe('in_progress');

    // Another tab resolves the same ticket
    const externalOverlay = {
      ...local,
      'c-rt': { ...local['c-rt']!, status: 'resolved' as const, resolvedAt: '2026-02-01T00:00:00.000Z' },
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(externalOverlay));
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));

    const fresh = ticketStore.snapshot();
    expect(fresh['c-rt']?.status).toBe('resolved');
    expect(fresh['c-rt']?.resolvedAt).toBe('2026-02-01T00:00:00.000Z');
  });
});
