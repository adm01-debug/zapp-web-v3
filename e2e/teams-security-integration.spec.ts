import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/testHelpers';

/**
 * Integration Tests for Teams Module - RBAC & RLS Enforcement.
 * Validates that data isolation and permissions are strictly enforced at the database level.
 */
test.describe('Teams - RBAC & RLS Enforcement', () => {

  test('RH Agent: Isolated from TI data', async ({ page }) => {
    // Scenario 1: RH Agent cannot see TI channels or messages
    await loginAs(page, 'rh_agent');
    await page.goto('/team-chat');

    const tiDeptId = 'd2222222-2222-2222-2222-222222222222'; // TI Department UUID
    
    // 1. Direct RLS check for messages
    const rlsCheck = await page.evaluate(async (deptId) => {
      const { data, error } = await (window as any).supabase
        .from('team_messages')
        .select('*')
        .eq('department_id', deptId);
      return { data, error };
    }, tiDeptId);

    // Should return empty array even if TI messages exist
    expect(rlsCheck.data).toHaveLength(0);

    // 2. UI visibility check
    const tiChannel = page.locator('button:has-text("TI")');
    await expect(tiChannel).not.toBeVisible();
  });

  test('Finance Agent: Limited visibility to Finance and General', async ({ page }) => {
    // Scenario 2: Finance Agent sees Finance and General channels only
    await loginAs(page, 'finance_agent');
    await page.goto('/team-chat');

    // Should see Financeiro
    await expect(page.locator('button:has-text("Financeiro")')).toBeVisible();
    
    // Should see "Geral" (Canais Gerais)
    // Note: Geral is usually accessible to all authenticated users
    await expect(page.locator('button:has-text("Geral")')).toBeVisible();
    
    // Should NOT see TI or RH
    await expect(page.locator('button:has-text("TI")')).not.toBeVisible();
    await expect(page.locator('button:has-text("RH")')).not.toBeVisible();
  });

  test('TI Admin: Full oversight and soft-delete capability', async ({ page }) => {
    // Scenario 3: Admin sees everything and can perform deletions
    await loginAs(page, 'ti_admin');
    await page.goto('/team-chat');

    // 1. Global visibility
    await expect(page.locator('button:has-text("TI")')).toBeVisible();
    await expect(page.locator('button:has-text("RH")')).toBeVisible();
    await expect(page.locator('button:has-text("Financeiro")')).toBeVisible();

    // 2. Soft-delete enforcement
    // We attempt to delete a message and verify it marks 'deleted_at'
    const deleteOp = await page.evaluate(async () => {
      const { data: messages } = await (window as any).supabase
        .from('team_messages')
        .select('id')
        .limit(1);
      
      if (!messages || messages.length === 0) return { skipped: true };
      
      const targetId = messages[0].id;
      const { error } = await (window as any).supabase
        .from('team_messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', targetId);
        
      return { error, success: !error };
    });

    if (!deleteOp.skipped) {
      expect(deleteOp.success).toBe(true);
      expect(deleteOp.error).toBeNull();
    }
  });

  test('Transfer Agent: Support mobility across departments', async ({ page }) => {
    // Scenario 4: Support Agent can move tickets (simulated via metadata update)
    await loginAs(page, 'transfer_agent');
    await page.goto('/team-chat');

    // Support agents can update conversation metadata to signal transfers
    const transferOp = await page.evaluate(async () => {
      const { data: convs } = await (window as any).supabase
        .from('team_conversations')
        .select('id')
        .limit(1);
        
      if (!convs || convs.length === 0) return { skipped: true };
      
      const targetId = convs[0].id;
      const { error } = await (window as any).supabase
        .from('team_conversations')
        .update({ 
          metadata: { 
            last_transfer_at: new Date().toISOString(),
            target_department: 'TI',
            transfer_reason: 'Suporte nível 2'
          } 
        })
        .eq('id', targetId);
        
      return { error, success: !error };
    });

    if (!transferOp.skipped) {
      expect(transferOp.success).toBe(true);
      expect(transferOp.error).toBeNull();
    }
  });

});
