import { describe, it, expect } from 'vitest';
import * as inboxHooks from '../index';

describe('Inbox Hooks Barrel Export', () => {
  it('should export required hooks without resolution conflicts', () => {
    // Lista de membros essenciais que DEVEM estar disponíveis e sem erros de ambiguidade
    expect(inboxHooks.useRealtimeInbox).toBeDefined();
    expect(inboxHooks.useMessages).toBeDefined();
    expect(inboxHooks.useMessageStatus).toBeDefined();
  });

  it('should not have undefined exports (indicates naming conflicts or broken paths)', () => {
    const exports = Object.keys(inboxHooks);
    for (const key of exports) {
      // @ts-ignore - dinamic check
      expect(inboxHooks[key]).not.toBeUndefined();
    }
  });
});
