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
    // 1. Login with role-based helper
    await loginAs(page, 'rh_agent');
    
    // 2. Wait for navigation and state stabilization
    await page.waitForURL(/\/team-chat/, { waitUntil: 'networkidle' });
    
    // 3. Role-based UI assertion: check sidebar as a listbox
    const conversationList = page.getByRole('listbox', { name: /lista de conversas/i });
    await expect(conversationList).toBeVisible({ timeout: 15000 });
    
    // TI channel must NOT be present in the view for an RH agent
    const tiChannel = page.getByRole('option').filter({ hasText: /^TI$/ });
    await expect(tiChannel).not.toBeVisible({ timeout: 5000 });

    // 4. Direct Database Isolation (Bypassing UI)
    const tiDeptId = 'd2222222-2222-2222-2222-222222222222';
    const databaseLeachCheck = await page.evaluate(async (deptId) => {
      // Direct attempt to select data from unauthorized department
      const { data } = await (window as any).supabase
        .from('team_conversations')
        .select('id')
        .eq('department_id', deptId);
      return data;
    }, tiDeptId);

    // RLS check: result must be empty
    expect(databaseLeachCheck).toHaveLength(0);
  });

  test('Soft Delete: Admin enforcement and unauthorized recovery block', async ({ page, browser }) => {
    // Setup isolated contexts for cleaner session management
    const adminContext = await browser.newContext();
    const agentContext = await browser.newContext();
    
    const adminPage = await adminContext.newPage();
    const agentPage = await agentContext.newPage();

    // STEP 1: Admin TI creates and soft-deletes a message
    await loginAs(adminPage, 'ti_admin');
    await adminPage.waitForURL(/\/team-chat/);
    
    // Open shared channel
    const sharedChannel = adminPage.getByRole('option', { name: /Geral/i });
    await sharedChannel.click();

    const uniqueMsgContent = `Governed-Content-${Date.now()}`;
    
    // Inject message to ensure we have the exact ID for later RLS verification
    const msgId = await adminPage.evaluate(async (content) => {
      const { data: conv } = await (window as any).supabase
        .from('team_conversations').select('id').eq('name', 'Geral').single();
      const { data: profile } = await (window as any).supabase.from('profiles').select('id').single();

      const { data: msg } = await (window as any).supabase
        .from('team_messages')
        .insert({ conversation_id: conv.id, content, sender_id: profile.id })
        .select().single();
      return msg.id;
    }, uniqueMsgContent);

    // Verify visibility in UI
    await expect(adminPage.getByText(uniqueMsgContent)).toBeVisible();

    // Perform Admin Soft Delete (setting deleted_at)
    await adminPage.evaluate(async (id) => {
      await (window as any).supabase
        .from('team_messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
    }, msgId);

    // STEP 2: RH Agent (Unauthorized) attempt to access
    await loginAs(agentPage, 'rh_agent');
    await agentPage.waitForURL(/\/team-chat/);
    await agentPage.getByRole('option', { name: /Geral/i }).click();

    // UI ASSERTION: Message must be gone for non-admins
    await expect(agentPage.getByText(uniqueMsgContent)).not.toBeVisible({ timeout: 10000 });

    // API ASSERTION: Direct query via Supabase must return null/empty (RLS check)
    const directApiCheck = await agentPage.evaluate(async (id) => {
      const { data } = await (window as any).supabase
        .from('team_messages')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      return data;
    }, msgId);

    expect(directApiCheck).toBeNull();

    await Promise.all([adminContext.close(), agentContext.close()]);
  });

  test('Ticket Transfer: Metadata validation and visibility migration', async ({ page, browser }) => {
    const supportContext = await browser.newContext();
    const financeContext = await browser.newContext();
    const tiContext = await browser.newContext();

    const supportPage = await supportContext.newPage();
    const financePage = await financeContext.newPage();
    const tiPage = await tiContext.newPage();

    // 1. Support Agent initiates transfer via UI
    await loginAs(supportPage, 'transfer_agent');
    await supportPage.waitForURL(/\/team-chat/);

    const financeChannel = supportPage.getByRole('option', { name: /Financeiro/i });
    await expect(financeChannel).toBeVisible({ timeout: 15000 });
    await financeChannel.click();

    // UI flow for transfer
    await supportPage.getByLabel(/Mais ações/i).click();
    await supportPage.getByRole('menuitem', { name: /Transferir/i }).click();
    
    // Select Target Department (TI)
    await supportPage.getByRole('combobox').click();
    await supportPage.getByRole('option', { name: /^TI$/ }).click();
    
    // Submit Transfer
    await supportPage.getByRole('button', { name: /Transferir/i }).click();
    await expect(supportPage.getByText(/Conversa transferida com sucesso/i)).toBeVisible();

    // 2. Validate Metadata & Destination state via API
    const backendState = await supportPage.evaluate(async () => {
      const { data } = await (window as any).supabase
        .from('team_conversations')
        .select('metadata, department_id')
        .eq('name', 'Financeiro')
        .single();
      return data;
    });

    const tiDeptId = 'd2222222-2222-2222-2222-222222222222';
    expect(backendState.department_id).toBe(tiDeptId);
    expect(backendState.metadata).toHaveProperty('transferred_at');
    expect(backendState.metadata.transferred_by).toBe('Support Agent');

    // 3. Verify Visibility Shift across users
    // Finance Agent: Gone
    await loginAs(financePage, 'finance_agent');
    await financePage.waitForURL(/\/team-chat/);
    await expect(financePage.getByRole('option', { name: /Financeiro/i })).not.toBeVisible({ timeout: 5000 });

    // TI Admin: Present
    await loginAs(tiPage, 'ti_admin');
    await tiPage.waitForURL(/\/team-chat/);
    await expect(tiPage.getByRole('option', { name: /Financeiro/i })).toBeVisible({ timeout: 5000 });

    await Promise.all([supportContext.close(), financeContext.close(), tiContext.close()]);
  });
});
