import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/testHelpers';

/**
 * Integration Tests for Teams Module - RBAC & RLS Enforcement.
 * This suite validates strict data isolation between departments and correct administrative oversight.
 */
test.describe('Teams - RBAC & RLS Enforcement', () => {
  // Global timeout for the suite to handle multiple user logins
  test.setTimeout(180000);

  test('RH Agent: Strict isolation from TI (UI & API)', async ({ page }) => {
    // 1. Login and navigate deterministically
    await loginAs(page, 'rh_agent');
    await page.waitForURL(/\/team-chat/);
    
    // 2. Validate UI isolation using role-based selectors
    const sidebar = page.getByRole('listbox', { name: /lista de conversas/i });
    await expect(sidebar).toBeVisible();
    
    // TI channel should NOT be visible to RH agent
    const tiChannel = page.locator('[data-test-name="TI"]');
    await expect(tiChannel).not.toBeVisible({ timeout: 5000 });

    // 3. API Isolation (Direct Supabase Query)
    const tiDeptId = 'd2222222-2222-2222-2222-222222222222';
    const apiCheck = await page.evaluate(async (deptId) => {
      // Direct attempt to fetch TI conversations via Supabase client
      const { data } = await (window as any).supabase
        .from('team_conversations')
        .select('id')
        .eq('department_id', deptId);
      return data;
    }, tiDeptId);

    // RLS must return 0 rows
    expect(apiCheck).toHaveLength(0);
  });

  test('Soft Delete: Admin enforcement and unauthorized recovery block', async ({ page, browser }) => {
    const adminContext = await browser.newContext();
    const agentContext = await browser.newContext();
    
    const adminPage = await adminContext.newPage();
    const agentPage = await agentContext.newPage();

    // 1. Admin TI creates and soft-deletes a message
    await loginAs(adminPage, 'ti_admin');
    await adminPage.waitForURL(/\/team-chat/);
    
    // Select Geral channel
    const geralChannel = adminPage.locator('[data-test-name="Geral"]');
    await geralChannel.click();

    const uniqueMsg = `Delete-Assertion-${Date.now()}`;
    
    // Inject via evaluate to get exact ID for the assertion
    const msgId = await adminPage.evaluate(async (content) => {
      const { data: conv } = await (window as any).supabase
        .from('team_conversations').select('id').eq('name', 'Geral').single();
      const { data: profile } = await (window as any).supabase.from('profiles').select('id').single();

      const { data: msg } = await (window as any).supabase
        .from('team_messages')
        .insert({ conversation_id: conv.id, content, sender_id: profile.id })
        .select().single();
      return msg.id;
    }, uniqueMsg);

    // Assert message is visible initially
    await expect(adminPage.locator(`text="${uniqueMsg}"`)).toBeVisible();

    // Perform soft delete
    await adminPage.evaluate(async (id) => {
      await (window as any).supabase
        .from('team_messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
    }, msgId);

    // 2. RH Agent attempt to recover or view
    await loginAs(agentPage, 'rh_agent');
    await agentPage.waitForURL(/\/team-chat/);
    await agentPage.locator('[data-test-name="Geral"]').click();

    // UI Verification: Message must be gone
    await expect(agentPage.locator(`text="${uniqueMsg}"`)).not.toBeVisible({ timeout: 5000 });

    // API Verification: RLS should return null/empty even for direct ID query
    const apiRecoveryAttempt = await agentPage.evaluate(async (id) => {
      const { data } = await (window as any).supabase
        .from('team_messages')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      return data;
    }, msgId);

    expect(apiRecoveryAttempt).toBeNull();

    await adminContext.close();
    await agentContext.close();
  });

  test('Ticket Transfer: Metadata validation and visibility migration', async ({ page, browser }) => {
    const supportContext = await browser.newContext();
    const financeContext = await browser.newContext();
    const tiContext = await browser.newContext();

    const supportPage = await supportContext.newPage();
    const financePage = await financeContext.newPage();
    const tiPage = await tiContext.newPage();

    // 1. Support Agent initiates transfer
    await loginAs(supportPage, 'transfer_agent');
    await supportPage.waitForURL(/\/team-chat/);

    const targetConv = supportPage.locator('[data-test-name="Financeiro"]');
    await targetConv.click();

    // Open Transfer Dialog
    await supportPage.getByTestId('conversation-more-actions').click();
    await supportPage.getByTestId('transfer-conversation-btn').click();
    
    // Select TI department
    await supportPage.getByTestId('dept-select-trigger').click();
    await supportPage.getByTestId('dept-option-TI').click();
    
    // Confirm and wait for toast
    await supportPage.getByTestId('confirm-transfer-btn').click();
    await expect(supportPage.locator('text="Conversa transferida com sucesso"')).toBeVisible();

    // 2. Validate Metadata on Backend
    const metadataCheck = await supportPage.evaluate(async () => {
      const { data } = await (window as any).supabase
        .from('team_conversations')
        .select('metadata, department_id')
        .eq('name', 'Financeiro')
        .single();
      return data;
    });

    const tiDeptId = 'd2222222-2222-2222-2222-222222222222';
    expect(metadataCheck.department_id).toBe(tiDeptId);
    expect(metadataCheck.metadata).toHaveProperty('transferred_at');
    expect(metadataCheck.metadata.transferred_by).toBe('Support Agent');

    // 3. Verify Visibility Shift
    // Finance Agent must NO LONGER see it
    await loginAs(financePage, 'finance_agent');
    await financePage.waitForURL(/\/team-chat/);
    await expect(financePage.locator('[data-test-name="Financeiro"]')).not.toBeVisible();

    // TI Admin must NOW see it
    await loginAs(tiPage, 'ti_admin');
    await tiPage.waitForURL(/\/team-chat/);
    await expect(tiPage.locator('[data-test-name="Financeiro"]')).toBeVisible();

    await Promise.all([supportContext.close(), financeContext.close(), tiContext.close()]);
  });
});
