import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/testHelpers';

/**
 * Integration Tests for Teams Module - RBAC & RLS Enforcement.
 * Validates that data isolation and permissions are strictly enforced at the database level.
 */
test.describe('Teams - RBAC & RLS Enforcement', () => {

  test('Soft Delete: Admin deletes and Agent cannot recover', async ({ page, browser }) => {
    // 1. Admin TI creates and then soft-deletes a message
    const tiAdminPage = await browser.newPage();
    await loginAs(tiAdminPage, 'ti_admin');
    await tiAdminPage.goto('/team-chat');

    const uniqueContent = `Admin-Delete-Test-${Date.now()}`;
    
    // Create a message in TI channel
    const msgData = await tiAdminPage.evaluate(async (content) => {
      const { data: profile } = await (window as any).supabase
        .from('profiles')
        .select('id, department_id')
        .single();
        
      const { data: conv } = await (window as any).supabase
        .from('team_conversations')
        .select('id')
        .eq('name', 'TI')
        .single();

      const { data: msg } = await (window as any).supabase
        .from('team_messages')
        .insert({
          conversation_id: conv.id,
          content: content,
          sender_id: profile.id
        })
        .select()
        .single();
        
      return msg;
    }, uniqueContent);

    expect(msgData).toBeDefined();

    // Soft delete it
    await tiAdminPage.evaluate(async (msgId) => {
      await (window as any).supabase
        .from('team_messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', msgId);
    }, msgData.id);

    // 2. RH Agent tries to fetch that specific message (direct API attack)
    const rhPage = await browser.newPage();
    await loginAs(rhPage, 'rh_agent');
    
    const leakCheck = await rhPage.evaluate(async (msgId) => {
      const { data, error } = await (window as any).supabase
        .from('team_messages')
        .select('*')
        .eq('id', msgId)
        .maybeSingle();
      return { data, error };
    }, msgData.id);

    // Should be null/empty due to RLS (deleted_at IS NULL)
    expect(leakCheck.data).toBeNull();
    
    await tiAdminPage.close();
    await rhPage.close();
  });

  test('Ticket Transfer: Metadata & Department movement', async ({ page, browser }) => {
    // 1. Support Agent transfers a Financeiro conversation to TI
    const supportPage = await browser.newPage();
    await loginAs(supportPage, 'transfer_agent');
    await supportPage.goto('/team-chat');

    const tiDeptId = 'd2222222-2222-2222-2222-222222222222';
    
    const transferResult = await supportPage.evaluate(async (newDeptId) => {
      const { data: conv } = await (window as any).supabase
        .from('team_conversations')
        .select('id')
        .eq('name', 'Financeiro')
        .single();

      const { error } = await (window as any).supabase
        .from('team_conversations')
        .update({ 
          department_id: newDeptId,
          metadata: { 
            transferred_at: new Date().toISOString(),
            reason: 'Escalado para TI' 
          } 
        })
        .eq('id', conv.id);
        
      return { convId: conv.id, success: !error };
    }, tiDeptId);

    expect(transferResult.success).toBe(true);

    // 2. Finance Agent should lose visibility (unless explicitly a member)
    const financePage = await browser.newPage();
    await loginAs(financePage, 'finance_agent');
    
    const financeVisibility = await financePage.evaluate(async (convId) => {
      const { data } = await (window as any).supabase
        .from('team_conversations')
        .select('id')
        .eq('id', convId)
        .maybeSingle();
      return data;
    }, transferResult.convId);

    expect(financeVisibility).toBeNull();

    // 3. TI Admin should still see it
    const tiPage = await browser.newPage();
    await loginAs(tiPage, 'ti_admin');
    
    const tiVisibility = await tiPage.evaluate(async (convId) => {
      const { data } = await (window as any).supabase
        .from('team_conversations')
        .select('id')
        .eq('id', convId)
        .maybeSingle();
      return data;
    }, transferResult.convId);

    expect(tiVisibility).not.toBeNull();

    await supportPage.close();
    await financePage.close();
    await tiPage.close();
  });

  test('RH Agent: Strict isolation from TI', async ({ page }) => {
    await loginAs(page, 'rh_agent');
    await page.goto('/team-chat');

    const tiDeptId = 'd2222222-2222-2222-2222-222222222222';
    
    const rlsCheck = await page.evaluate(async (deptId) => {
      const { data } = await (window as any).supabase
        .from('team_messages')
        .select('id')
        .eq('department_id', deptId); // Assuming department_id is on messages or joined
      return data;
    }, tiDeptId);

    // The previous migration didn't add department_id to messages, visibility is via conversation_id
    // But RH Agent shouldn't be able to see TI conversations anyway.
    const convCheck = await page.evaluate(async (deptId) => {
      const { data } = await (window as any).supabase
        .from('team_conversations')
        .select('id')
        .eq('department_id', deptId);
      return data;
    }, tiDeptId);

    expect(convCheck).toHaveLength(0);
  });
});
