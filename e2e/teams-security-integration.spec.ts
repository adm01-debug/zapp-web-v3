import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/testHelpers';

/**
 * Integration Tests for Teams Module - RBAC & RLS Enforcement.
 * This suite validates strict data isolation between departments and correct administrative oversight.
 */
test.describe('Teams - RBAC & RLS Enforcement @teams', () => {
  // Global timeout for the suite to handle multiple user logins
  test.setTimeout(180000);

  // Helper to determine the role being tested (for matrix execution)
  const roleUnderTest = process.env.E2E_ROLE_UNDER_TEST || 'ti_admin';

  test(`Visibility Check for ${roleUnderTest}`, async ({ page }) => {
    await loginAs(page, roleUnderTest as any);
    await page.waitForURL(/\/team-chat/, { waitUntil: 'networkidle' });

    const conversationList = page.getByRole('listbox', { name: /lista de conversas/i });
    await expect(conversationList).toBeVisible({ timeout: 15000 });

    if (roleUnderTest === 'rh_agent') {
      await expect(page.getByRole('option', { name: /^TI$/ })).not.toBeVisible();
      await expect(page.getByRole('option', { name: /^Financeiro$/ })).not.toBeVisible();
    } else if (roleUnderTest === 'finance_agent') {
      await expect(page.getByRole('option', { name: /^Financeiro$/ })).toBeVisible();
      await expect(page.getByRole('option', { name: /^TI$/ })).not.toBeVisible();
    } else if (roleUnderTest === 'ti_admin' || roleUnderTest === 'transfer_agent') {
      await expect(page.getByRole('option', { name: /^TI$/ })).toBeVisible();
    }
  });

  test('Security: Direct Supabase Search/List bypass block (Soft-Deleted)', async ({ page }) => {
    // We only need one role for this specific RLS verification
    await loginAs(page, 'rh_agent');
    await page.waitForURL(/\/team-chat/);

    const tiDeptId = 'd2222222-2222-2222-2222-222222222222';
    
    const securityCheck = await page.evaluate(async (deptId) => {
      const client = (window as any).supabase;
      
      // 1. Attempt to list messages from a conversation in another department
      const { data: listData } = await client
        .from('team_messages')
        .select('*')
        .eq('department_id', deptId); // Assuming department_id is on messages or joined

      // 2. Attempt to fetch soft-deleted messages explicitly
      const { data: deletedData } = await client
        .from('team_messages')
        .select('*')
        .not('deleted_at', 'is', null);

      return { listCount: listData?.length || 0, deletedCount: deletedData?.length || 0 };
    }, tiDeptId);

    expect(securityCheck.listCount).toBe(0);
    expect(securityCheck.deletedCount).toBe(0);
  });

  test('Soft Delete: Admin enforcement and unauthorized recovery block', async ({ page, browser }) => {
    const adminContext = await browser.newContext();
    const agentContext = await browser.newContext();
    
    const adminPage = await adminContext.newPage();
    const agentPage = await agentContext.newPage();

    // STEP 1: Admin TI creates and soft-deletes a message
    await loginAs(adminPage, 'ti_admin');
    await adminPage.waitForURL(/\/team-chat/);
    
    const sharedChannel = adminPage.getByRole('option', { name: /Geral/i });
    await sharedChannel.click();

    const uniqueMsgContent = `Governed-Content-${Date.now()}`;
    
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

    await expect(adminPage.getByText(uniqueMsgContent)).toBeVisible();

    // Perform Admin Soft Delete
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

    await expect(agentPage.getByText(uniqueMsgContent)).not.toBeVisible({ timeout: 10000 });

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

  test('Ticket Transfer: Metadata validation and visibility migration with consistency', async ({ page, browser }) => {
    const supportContext = await browser.newContext();
    const financeContext = await browser.newContext();
    const tiContext = await browser.newContext();

    const supportPage = await supportContext.newPage();
    const financePage = await financeContext.newPage();
    const tiPage = await tiContext.newPage();

    // 1. Setup existing content in Financeiro
    await loginAs(financePage, 'finance_agent');
    await financePage.waitForURL(/\/team-chat/);
    await financePage.getByRole('option', { name: /Financeiro/i }).click();
    const initialMsg = `Pre-Transfer-Check-${Date.now()}`;
    await financePage.evaluate(async (content) => {
      const { data: conv } = await (window as any).supabase
        .from('team_conversations').select('id').eq('name', 'Financeiro').single();
      const { data: profile } = await (window as any).supabase.from('profiles').select('id').single();
      await (window as any).supabase.from('team_messages').insert({ conversation_id: conv.id, content, sender_id: profile.id });
    }, initialMsg);

    // 2. Support Agent initiates transfer via UI
    await loginAs(supportPage, 'transfer_agent');
    await supportPage.waitForURL(/\/team-chat/);

    const financeChannel = supportPage.getByRole('option', { name: /Financeiro/i });
    await expect(financeChannel).toBeVisible({ timeout: 15000 });
    await financeChannel.click();

    await supportPage.getByLabel(/Mais ações/i).click();
    await supportPage.getByRole('menuitem', { name: /Transferir/i }).click();
    await supportPage.getByRole('combobox').click();
    await supportPage.getByRole('option', { name: /^TI$/ }).click();
    await supportPage.getByRole('button', { name: /Transferir/i }).click();
    await expect(supportPage.getByText(/Conversa transferida com sucesso/i)).toBeVisible();

    // 3. Validate Metadata & Persistence via API
    const backendState = await supportPage.evaluate(async () => {
      const { data } = await (window as any).supabase
        .from('team_conversations')
        .select('metadata, department_id, id')
        .eq('name', 'Financeiro')
        .single();
      
      const { data: messages } = await (window as any).supabase
        .from('team_messages')
        .select('content')
        .eq('conversation_id', data.id);
        
      return { ...data, messages };
    });

    const tiDeptId = 'd2222222-2222-2222-2222-222222222222';
    expect(backendState.department_id).toBe(tiDeptId);
    expect(backendState.metadata).toHaveProperty('transferred_at');
    // Ensure previous messages are still there
    expect(backendState.messages.map((m: any) => m.content)).toContain(initialMsg);

    // 4. Verify Visibility Shift
    await financePage.reload();
    await expect(financePage.getByRole('option', { name: /Financeiro/i })).not.toBeVisible({ timeout: 10000 });

    await loginAs(tiPage, 'ti_admin');
    await tiPage.waitForURL(/\/team-chat/);
    await tiPage.getByRole('option', { name: /Financeiro/i }).click();
    await expect(tiPage.getByText(initialMsg)).toBeVisible();

    await Promise.all([supportContext.close(), financeContext.close(), tiContext.close()]);
  });
});
