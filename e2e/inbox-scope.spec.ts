import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/testHelpers';

test.describe('Inbox - Scope Switcher E2E', () => {
  test('Manager: switching scopes filters conversations correctly', async ({ page }) => {
    // manager has access to 'mine', 'department', and 'all'
    await loginAs(page, 'manager');
    await page.goto('/inbox');

    // Default scope should be 'mine'
    await expect(page.locator('button[aria-selected="true"]:has-text("Meus")')).toBeVisible();
    
    // Switch to 'Departamento'
    await page.click('button:has-text("Departamento")');
    await expect(page.locator('button[aria-selected="true"]:has-text("Departamento")')).toBeVisible();
    // URL should reflect scope change
    await expect(page).toHaveURL(/scope=department/);

    // Switch to 'Todos depts.'
    await page.click('button:has-text("Todos depts.")');
    await expect(page.locator('button[aria-selected="true"]:has-text("Todos depts.")')).toBeVisible();
    await expect(page).toHaveURL(/scope=all/);

    // Reload page and check if scope is persisted from URL
    await page.reload();
    await expect(page.locator('button[aria-selected="true"]:has-text("Todos depts.")')).toBeVisible();
    await expect(page).toHaveURL(/scope=all/);
  });

  test('Agent: restricted to "mine" scope only', async ({ page }) => {
    await loginAs(page, 'agent');
    await page.goto('/inbox');

    // Agent should not see 'Departamento' or 'Todos depts.' buttons
    await expect(page.locator('button:has-text("Departamento")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Todos depts.")')).not.toBeVisible();
  });
});
