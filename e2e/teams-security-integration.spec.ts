import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/testHelpers';

/**
 * Integration Tests for Teams Module - RBAC & RLS Enforcement.
 * This suite validates strict data isolation between departments and correct administrative oversight.
 */
test.describe('Teams - RBAC & RLS Enforcement', () => {
  test.setTimeout(120000); // Extended timeout for multi-context login flows

  test('RH Agent: Isolated from TI data', async ({ page }) => {
    // Ensure RH Agent cannot see TI conversations or messages
    await loginAs(page, 'rh_agent');
    await page.goto('/team-chat');
    
    // 1. Check sidebar: TI department channel should not be listed
    const tiSidebarItem = page.locator('[data-test-name="TI"]');
    await expect(tiSidebarItem).not.toBeVisible({ timeout: 10000 });

    // 2. Direct API Check: Verify RLS blocks fetching messages from TI
    const tiDeptId = 'd2222222-2222-2222-2222-222222222222';
    const leakageCheck = await page.evaluate(async (deptId) => {
      const { data } = await (window as any).supabase
        .from('team_conversations')
        .select('id')
        .eq('department_id', deptId);
      return data;
    }, tiDeptId);

    expect(leakageCheck).toHaveLength(0);
  });

  test('Finance Agent: Limited visibility to Finance and General', async ({ page }) => {
    await loginAs(page, 'finance_agent');
    await page.goto('/team-chat');

    // 1. Visible channels
    await expect(page.locator('[data-test-name="Financeiro"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-test-name="Geral"]')).toBeVisible({ timeout: 10000 });
    
    // 2. Hidden channels
    await expect(page.locator('[data-test-name="TI"]')).not.toBeVisible();
    await expect(page.locator('[data-test-name="RH"]')).not.toBeVisible();
  });

  test('Soft Delete: Admin deletes and Agent cannot recover', async ({ page, browser }) => {
    const adminContext = await browser.newContext();
    const agentContext = await browser.newContext();
    
    const adminPage = await adminContext.newPage();
    const agentPage = await agentContext.newPage();

    // 1. Admin TI creates and deletes a message in a shared channel (Geral)
    await loginAs(adminPage, 'ti_admin');
    await adminPage.goto('/team-chat');
    
    const geralChannel = adminPage.locator('[data-test-name="Geral"]');
    await geralChannel.waitFor({ state: 'visible' });
    await geralChannel.click();

    const uniqueMsg = `Sensitive-Info-${Date.now()}`;
    
    // Inject message directly to get ID easily
    const msgId = await adminPage.evaluate(async (content) => {
      const { data: conv } = await (window as any).supabase
        .from('team_conversations')
        .select('id')
        .eq('name', 'Geral')
        .single();
      
      const { data: profile } = await (window as any).supabase
        .from('profiles')
        .select('id')
        .single();

      const { data: msg } = await (window as any).supabase
        .from('team_messages')
        .insert({ conversation_id: conv.id, content, sender_id: profile.id })
        .select()
        .single();
        
      return msg.id;
    }, uniqueMsg);

    // Soft delete the message
    await adminPage.evaluate(async (id) => {
      await (window as any).supabase
        .from('team_messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
    }, msgId);

    // 2. RH Agent attempts to access the deleted message
    await loginAs(agentPage, 'rh_agent');
    await agentPage.goto('/team-chat');
    
    // Check UI: should not be present
    await agentPage.locator('[data-test-name="Geral"]').click();
    await expect(agentPage.locator(`text="${uniqueMsg}"`)).not.toBeVisible({ timeout: 10000 });

    // Check API: RLS should block recovery
    const recoveryAttempt = await agentPage.evaluate(async (id) => {
      const { data } = await (window as any).supabase
        .from('team_messages')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      return data;
    }, msgId);

    expect(recoveryAttempt).toBeNull();

    await adminContext.close();
    await agentContext.close();
  });

  test('Ticket Transfer: Support Agent mobility', async ({ page, browser }) => {
    const supportContext = await browser.newContext();
    const financeContext = await browser.newContext();
    const tiContext = await browser.newContext();

    const supportPage = await supportContext.newPage();
    const financePage = await financeContext.newPage();
    const tiPage = await tiContext.newPage();

    // 1. Support Agent transfers a Financeiro conversation to TI via UI
    await loginAs(supportPage, 'transfer_agent');
    await supportPage.goto('/team-chat');

    const financeiroChannel = supportPage.locator('[data-test-name="Financeiro"]');
    await expect(financeiroChannel).toBeVisible({ timeout: 15000 });
    await financeiroChannel.click();

    // Open More Actions
    const moreActions = supportPage.locator('[data-testid="conversation-more-actions"]');
    await moreActions.waitFor({ state: 'visible' });
    await moreActions.click();
    
    // Click Transfer
    const transferBtn = supportPage.locator('[data-testid="transfer-conversation-btn"]');
    await transferBtn.waitFor({ state: 'visible' });
    await transferBtn.click();
    
    // Select TI department in the dialog
    const selectTrigger = supportPage.locator('[data-testid="dept-select-trigger"]');
    await selectTrigger.waitFor({ state: 'visible' });
    await selectTrigger.click();
    
    const tiOption = supportPage.locator('[data-testid="dept-option-TI"]');
    await tiOption.waitFor({ state: 'visible' });
    await tiOption.click();
    
    // Confirm transfer
    const confirmBtn = supportPage.locator('[data-testid="confirm-transfer-btn"]');
    await confirmBtn.click();
    
    // Verify toast success
    await expect(supportPage.locator('text="Conversa transferida com sucesso"')).toBeVisible({ timeout: 10000 });

    // 2. Finance Agent should lose visibility
    await loginAs(financePage, 'finance_agent');
    await financePage.goto('/team-chat');
    await expect(financePage.locator('[data-test-name="Financeiro"]')).not.toBeVisible({ timeout: 10000 });

    // 3. TI Admin should see it
    await loginAs(tiPage, 'ti_admin');
    await tiPage.goto('/team-chat');
    await expect(tiPage.locator('[data-test-name="Financeiro"]')).toBeVisible({ timeout: 10000 });

    await supportContext.close();
    await financeContext.close();
    await tiContext.close();
  });

});
