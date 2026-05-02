import { describe, it, expect, vi } from 'vitest';
import { validateEntityAccess, validateRpcAccess } from '../sentinel';

describe('Datasource Sentinel', () => {
  it('should throw error when evolution_* table is accessed via lovable client in dev', () => {
    // Force DEV mode for test
    vi.stubEnv('DEV', 'true');
    
    expect(() => validateEntityAccess('evolution_messages', 'lovable')).toThrow(
      /SECURITY VIOLATION/
    );
    
    vi.unstubAllEnvs();
  });

  it('should NOT throw when evolution_* table is accessed via external client', () => {
    vi.stubEnv('DEV', 'true');
    
    expect(() => validateEntityAccess('evolution_messages', 'external')).not.toThrow();
    
    vi.unstubAllEnvs();
  });

  it('should throw error when evolution RPC is called via lovable client', () => {
    vi.stubEnv('DEV', 'true');
    
    expect(() => validateRpcAccess('rpc_list_messages_lite', 'lovable')).toThrow(
      /SECURITY VIOLATION/
    );
    
    vi.unstubAllEnvs();
  });

  it('should NOT throw when lovable table is accessed via lovable client', () => {
    vi.stubEnv('DEV', 'true');
    
    expect(() => validateEntityAccess('profiles', 'lovable')).not.toThrow();
    
    vi.unstubAllEnvs();
  });
});
