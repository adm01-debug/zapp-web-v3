import { describe, it, expect, vi } from 'vitest';
import { asTyped, fromUnknown, mockOf, asMock, globalAs } from '../typing';

interface WebhookResponse {
  signature_valid: boolean;
  event_type: string;
}

describe('test/typing helpers', () => {
  it('asTyped narrows unknown to T and preserves the same reference', () => {
    const raw: unknown = { signature_valid: true, event_type: 'messages.upsert' };
    const typed = asTyped<WebhookResponse>(raw);
    expect(typed.signature_valid).toBe(true);
    expect(typed).toBe(raw);
  });

  it('fromUnknown is an alias for asTyped', () => {
    const raw: unknown = { signature_valid: false, event_type: 'x' };
    const typed = fromUnknown<WebhookResponse>(raw);
    expect(typed.event_type).toBe('x');
  });

  it('mockOf builds a partial-as-full fixture without explicit cast', () => {
    const partial = mockOf<WebhookResponse>({ signature_valid: true });
    expect(partial.signature_valid).toBe(true);
    // event_type is unset on purpose — runtime is the consumer's problem
    expect((partial as Partial<WebhookResponse>).event_type).toBeUndefined();
  });

  it('asMock exposes vi.fn API on a generic callable', () => {
    const fn = vi.fn((a: number) => a * 2);
    asMock(fn).mockReturnValueOnce(99);
    expect(fn(1)).toBe(99);
    expect(fn(3)).toBe(6);
  });

  it('globalAs returns the global with a typed shape', () => {
    const g = globalAs<{ __typingHelperMarker?: number }>();
    g.__typingHelperMarker = 42;
    expect(globalAs<{ __typingHelperMarker?: number }>().__typingHelperMarker).toBe(42);
    delete g.__typingHelperMarker;
  });
});
