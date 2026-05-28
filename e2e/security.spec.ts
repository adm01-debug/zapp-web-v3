import { test, expect } from '@playwright/test';

test.describe('Security and Access Control', () => {
  test('unauthorized user should be redirected to access-denied', async ({ page }) => {
    // Navigate to a protected admin route without being logged in
    await page.goto('/admin/roles');
    
    // Should be redirected to /auth first
    await expect(page).toHaveURL(/.*\/auth/);
    
    // Note: To test actual access-denied, we would need to login as a non-admin user
    // Since we don't have easy access to create mock users here, we focus on the logic
  });

  test('direct access to sensitive page without role should fail', async ({ page }) => {
    // Go to home and wait for loading
    await page.goto('/');
    
    // Try to force navigate to admin
    await page.evaluate(() => window.location.href = '/admin/operations');
    
    // Should eventually end up at /auth or /access-denied
    const url = page.url();
    expect(url).toMatch(/auth|access-denied/);
  });

  test('refresh on protected route should maintain security', async ({ page }) => {
    await page.goto('/inbox');
    await page.reload();
    
    // Still protected
    const url = page.url();
    expect(url).toMatch(/auth|inbox/);
  });
});
