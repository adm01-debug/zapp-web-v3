/**
 * Type-level contract test: the payload returned by
 * `useMessageStatus().getMessageStatusDetail(id)` must be a strict superset
 * of the `<MessageStatus detail={…}>` prop.
 *
 * The whole point of `MessageStatusDetailFields` is that callers can do:
 *
 *   const detail = getMessageStatusDetail(id);
 *   if (detail) <MessageStatus status={detail.status} detail={detail} />;
 *
 * If the shared shapes ever drift, this file fails to compile. Vitest just
 * needs ONE runtime assertion so the file is picked up — the real coverage
 * lives in the type system.
 */
import { describe, it, expectTypeOf, expect } from 'vitest';
import type {
  MessageStatusDetail,
  MessageStatusDetailFields,
  MessageUIStatus,
  MessageStatusDbRow,
} from '@/types/messageStatus';

describe('messageStatus shared types', () => {
  it('MessageStatusDetail extends MessageStatusDetailFields', () => {
    expectTypeOf<MessageStatusDetail>().toMatchTypeOf<MessageStatusDetailFields>();
    expectTypeOf<MessageStatusDetail>().toHaveProperty('status').toEqualTypeOf<MessageUIStatus>();
  });

  it('MessageStatusDetailFields is structurally Omit<MessageStatusDetail, "status">', () => {
    type Stripped = Omit<MessageStatusDetail, 'status'>;
    expectTypeOf<MessageStatusDetailFields>().toEqualTypeOf<Stripped>();
  });

  it('MessageUIStatus covers all UI-rendered states', () => {
    // Compile-time exhaustiveness — if any literal is removed from the
    // union, this assignment fails.
    const all: MessageUIStatus[] = [
      'sending', 'pending', 'retrying',
      'sent', 'delivered', 'read', 'played',
      'failed', 'failed_auth', 'failed_retries',
    ];
    expect(all).toHaveLength(10);
  });

  it('MessageStatusDbRow exposes the columns selected by the hook', () => {
    expectTypeOf<MessageStatusDbRow>().toHaveProperty('id').toEqualTypeOf<string>();
    expectTypeOf<MessageStatusDbRow>().toHaveProperty('status').toEqualTypeOf<MessageUIStatus>();
    expectTypeOf<MessageStatusDbRow>().toHaveProperty('status_updated_at').toEqualTypeOf<string>();
    // error_code / error_reason are nullable optionals.
    expectTypeOf<MessageStatusDbRow['error_code']>().toEqualTypeOf<string | null | undefined>();
    expectTypeOf<MessageStatusDbRow['error_reason']>().toEqualTypeOf<string | null | undefined>();
  });
});
