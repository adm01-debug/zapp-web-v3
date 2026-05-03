import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/testHelpers';

/**
 * Integration Tests for Teams Module - Database/RLS Enforcement.
 * This test suite validates that data leakage is prevented at the network level.
 */
test.describe('Teams - Data Isolation & RLS Integrity', () => {

  test('Security: Agent cannot fetch messages from unauthorized department via API', async ({ page }) => {
    // 1. Login as an Agent from "Marketing"
    await loginAs(page, 'agent'); 
    await page.goto('/team-chat');

    // 2. Intercept and monitor Supabase REST calls
    const unauthorizedDeptId = 'd2222222-2222-2222-2222-222222222222'; // TI Department
    
    // 3. Attempt to force a fetch for TI messages through the console (simulating a direct API attack)
    const dataLeakageAttempt = await page.evaluate(async (deptId) => {
      // Accessing supabase client directly from window (common in Lovable/Vite builds)
      const { data, error } = await (window as any).supabase
        .from('team_messages')
        .select('*')
        .eq('conversation_id', deptId);
      return { data, error };
    }, unauthorizedDeptId).catch(err => ({ error: err }));

    // 4. Validate that RLS blocked the data (should return empty array or error)
    // In Supabase RLS, selecting unauthorized rows usually returns an empty array, not a 403
    if (dataLeakageAttempt.data) {
      expect(dataLeakageAttempt.data.length).toBe(0);
    }
  });

  test('Security: Unauthorized user cannot join department via direct RPC manipulation', async ({ page }) => {
    await loginAs(page, 'agent');
    await page.goto('/team-chat');

    // Attempt to call manage_department_member RPC (which is SECURITY DEFINER)
    // It should fail because the internal plpgsql check validates the requester is an admin.
    const rpcAttack = await page.evaluate(async () => {
      const { error } = await (window as any).supabase.rpc('manage_department_member', {
        _admin_user_id: 'any-id',
        _target_profile_id: 'my-id',
        _department_id: 'd2222222-2222-2222-2222-222222222222',
        _action: 'add'
      });
      return { error };
    });

    expect(rpcAttack.error).toBeDefined();
    expect(rpcAttack.error.message).toContain('Acesso negado');
  });

  test('Audit: Every membership change creates a verifiable record', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/team-chat');

    // 1. Capture audit logs count before action
    const initialLogs = await page.evaluate(async () => {
      const { count } = await (window as any).supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('entity_type', 'department');
      return count || 0;
    });

    // 2. Perform a department management action (Add/Remove)
    // Note: We use the UI to trigger the actual backend logic
    const deptConv = page.locator('button:has-text("Marketing")').first();
    await deptConv.locator('button[title="Gerenciar membros"]').click();
    await page.locator('button:has-text("Adicionar")').first().click();
    await page.waitForTimeout(1000); // Wait for async RPC and Audit Insert

    // 3. Verify that audit log count increased
    const finalLogs = await page.evaluate(async () => {
      const { count } = await (window as any).supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('entity_type', 'department');
      return count || 0;
    });

    expect(finalLogs).toBeGreaterThan(initialLogs);
  });
});
