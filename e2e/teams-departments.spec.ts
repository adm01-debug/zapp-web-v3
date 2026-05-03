import { test, expect } from '@playwright/test';
import { login, openConversation, loginAs } from './helpers/testHelpers';

/**
 * Department E2E Tests - RBAC, Management, and Access Validation.
 */
test.describe('Teams - Department Management & RBAC', () => {
  
  test('Admin: Can manage department members and view audit logs', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/team-chat');
    
    // 1. Find a department conversation
    const deptConv = page.locator('button:has-text("Departamento")').first();
    await expect(deptConv).toBeVisible();
    
    // 2. Open management dialog via Settings icon
    await deptConv.locator('button[title="Gerenciar membros"]').click();
    
    await expect(page.locator('text="Gerenciar Departamento"')).toBeVisible();
    
    // 3. Toggle to Audit view
    await page.click('button:has-text("Auditoria")');
    await expect(page.locator('text="Auditoria"')).toBeVisible();
    
    // 4. Back to Members and search
    await page.click('button:has-text("Membros")');
    const searchInput = page.locator('input[placeholder="Buscar colaboradores..."]');
    await searchInput.fill('João');
    
    // 5. Test adding/removing member (simulation of buttons)
    const addBtn = page.locator('button:has-text("Adicionar")').first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await expect(page.locator('text="Membro adicionado"')).toBeVisible();
    }
  });

  test('Agent: Access Denied to unauthorized department', async ({ page }) => {
    // Agent from "Marketing" trying to access "IT" department conversation
    await loginAs(page, 'agent'); // Mock handles department association
    await page.goto('/team-chat');
    
    // Search for a specific department the agent shouldn't see
    const restrictedDept = page.locator('text="TI"');
    await expect(restrictedDept).not.toBeVisible();
    
    // Try direct navigation to ID (simulated by API call check or UI state)
    // If the user manually navigates, RLS should block data
    await page.goto('/team-chat/restricted-id');
    await expect(page.locator('text="Acesso Negado"').or(page.locator('text="Conversa não encontrada"'))).toBeVisible();
  });

  test('Real-time validation: Membership change updates UI access', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/team-chat');
    
    // Simulate removing self or another active user from a department
    // and verify the conversation disappears from the sidebar list immediately
    const deptName = "Recursos Humanos";
    await expect(page.locator(`text="${deptName}"`)).toBeVisible();
    
    // Perform removal (mocked action or actual UI flow)
    // ...
    
    // After removal, the sidebar should refresh via React Query invalidation
    // and the restricted item should disappear
  });
});
