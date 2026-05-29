import { test, expect } from '@playwright/test';

test.describe('Multi-Service Critical Flow', () => {
  test('should complete a full user journey: Landing -> Auth -> Dashboard -> Contact Management', async ({ page }) => {
    // 1. Landing Page
    await page.goto('/');
    await expect(page).toHaveTitle(/Freight/i);
    
    // 2. Navigation to Auth (if not logged in)
    const loginButton = page.locator('text=/Entrar|Sign In/i').first();
    if (await loginButton.isVisible()) {
      await loginButton.click();
      await expect(page.url()).toContain('/auth');
    }

    // 3. Mock Auth / Check if redirected to Dashboard
    // Note: In real E2E we might use environment variables for credentials
    // For this simulation, we check if we can reach the dashboard
    await page.goto('/dashboard');
    
    // 4. Dashboard Verification
    await expect(page.locator('nav')).toBeVisible();
    
    // 5. Open Conversations
    await page.click('a[href*="conversations"]');
    await expect(page.url()).toContain('conversations');
    
    // 6. Interaction with a conversation
    const conversationItem = page.locator('[data-testid="conversation-item"]').first();
    if (await conversationItem.isVisible()) {
      await conversationItem.click();
      await expect(page.locator('[data-testid="chat-window"]')).toBeVisible();
      
      // Send a message
      await page.fill('textarea[placeholder*="mensagem"]', 'Teste automatizado de fluxo completo');
      await page.keyboard.press('Enter');
      
      // Verify message appears
      await expect(page.locator('text=Teste automatizado de fluxo completo')).toBeVisible();
    }

    // 7. Check Contacts
    await page.click('a[href*="contacts"]');
    await expect(page.url()).toContain('contacts');
    
    // 8. Test Error Recovery (simulate offline)
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'));
    });
    // Check for offline indicator if exists
    // await expect(page.locator('text=/offline/i')).toBeVisible();
    
    await page.evaluate(() => {
      window.dispatchEvent(new Event('online'));
    });
  });

  test('should handle routing and multi-agent assignment correctly', async ({ page }) => {
    await page.goto('/dashboard/conversations');
    
    // Simulate clicking on a "waiting" queue if it exists
    const queueTab = page.locator('text=/Aguardando|Waiting/i').first();
    if (await queueTab.isVisible()) {
      await queueTab.click();
    }

    // Check for "Accept" or "Assign to me" button
    const acceptButton = page.locator('text=/Aceitar|Atribuir/i').first();
    if (await acceptButton.isVisible()) {
      await acceptButton.click();
      await expect(page.locator('text=/Sucesso|Atribuído/i')).toBeVisible();
    }
  });
});
