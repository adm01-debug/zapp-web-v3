import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// Simulating a webhook handler validation logic
const validateWebhookPayload = (payload: any) => {
  if (!payload || typeof payload !== 'object') return false;
  if (!payload.id || typeof payload.id !== 'string') return false;
  // Use a generic UUID regex for the fuzzer (v1-v8, any valid UUID structure)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(payload.id)) return false;
  return true;
};

describe('Webhook Fuzzing', () => {
  it('should handle thousands of random payloads without crashing', () => {
    fc.assert(
      fc.property(fc.anything(), (payload) => {
        try {
          validateWebhookPayload(payload);
          return true;
        } catch (e) {
          return false;
        }
      }),
      { numRuns: 1000 }
    );
  });

  it('should validate generated UUIDs', () => {
    fc.assert(
      fc.property(fc.uuid(), (id) => {
        return validateWebhookPayload({ id });
      }),
      { numRuns: 100 }
    );
  });
});
