import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/testHelpers';

/**
 * E2E Tests for Teams Message Reactions.
 * Validates adding, toggling, and real-time synchronization.
 */
test.describe('Teams - Message Reactions @teams @reactions', () => {
  test.setTimeout(120000);

  test('Add and remove reaction with optimistic UI', async ({ page }) => {
    await loginAs(page, 'ti_admin');
    await page.waitForURL(/\/team-chat/, { waitUntil: 'networkidle' });

    // Select the "Geral" conversation
    const geralConv = page.getByRole('option', { name: /Geral/i });
    await geralConv.waitFor({ state: 'visible' });
    await geralConv.click();

    // Send a unique message to test reactions on it
    const uniqueText = `Reaction-Test-${Date.now()}`;
    const input = page.getByPlaceholder(/escreva uma mensagem/i);
    await input.fill(uniqueText);
    await input.press('Enter');

    // Wait for the message to appear
    const message = page.getByText(uniqueText);
    await expect(message).toBeVisible();

    // Find the reaction trigger (SmilePlus icon)
    const messageContainer = page.locator(`[data-testid^="message-"]`).filter({ hasText: uniqueText });
    const reactionTrigger = messageContainer.locator('[data-testid^="reaction-trigger-"]');
    
    // Hover to reveal trigger and click it
    await messageContainer.hover();
    await reactionTrigger.waitFor({ state: 'visible' });
    await reactionTrigger.click();

    // Pick an emoji (e.g., ❤️)
    const heartEmoji = page.getByRole('gridcell', { name: /❤️/ });
    await heartEmoji.click();

    // Validate reaction appeared in UI immediately (optimistic) and persists
    const reactionBadge = messageContainer.locator('[data-testid^="reaction-"][data-testid$="❤️"]');
    await expect(reactionBadge).toBeVisible();
    await expect(reactionBadge).toContainText('1');
    
    // Toggle (remove) the reaction
    await reactionBadge.click();
    await expect(reactionBadge).not.toBeVisible();
  });

  test('Real-time synchronization between two users', async ({ browser }) => {
    const adminContext = await browser.newContext();
    const agentContext = await browser.newContext();
    
    const adminPage = await adminContext.newPage();
    const agentPage = await agentContext.newPage();

    // Login both users
    await Promise.all([
      loginAs(adminPage, 'ti_admin'),
      loginAs(agentPage, 'rh_agent') // Assuming both have access to a shared space or I'll use a specific dept
    ]);

    // Go to "Geral" in both (shared conversation)
    for (const p of [adminPage, agentPage]) {
      await p.waitForURL(/\/team-chat/, { waitUntil: 'networkidle' });
      const geral = p.getByRole('option', { name: /Geral/i });
      await geral.waitFor({ state: 'visible' });
      await geral.click();
    }

    const uniqueText = `Sync-Test-${Date.now()}`;
    await adminPage.getByPlaceholder(/escreva uma mensagem/i).fill(uniqueText);
    await adminPage.getByPlaceholder(/escreva uma mensagem/i).press('Enter');

    // Ensure both see the message
    await expect(adminPage.getByText(uniqueText)).toBeVisible();
    await expect(agentPage.getByText(uniqueText)).toBeVisible();

    // Admin reacts
    const adminMsgContainer = adminPage.locator(`[data-testid^="message-"]`).filter({ hasText: uniqueText });
    await adminMsgContainer.hover();
    await adminMsgContainer.locator('[data-testid^="reaction-trigger-"]').click();
    await adminPage.getByRole('gridcell', { name: /🔥/ }).click();

    // Verify Agent sees it in real-time
    const agentMsgContainer = agentPage.locator(`[data-testid^="message-"]`).filter({ hasText: uniqueText });
    const agentReactionBadge = agentMsgContainer.locator('[data-testid^="reaction-"][data-testid$="🔥"]');
    await expect(agentReactionBadge).toBeVisible({ timeout: 10000 });
    await expect(agentReactionBadge).toContainText('1');

    // Agent adds their own reaction to the same emoji
    await agentReactionBadge.click();
    await expect(agentReactionBadge).toContainText('2');
    
    // Verify Admin sees the count update to 2
    const adminReactionBadge = adminMsgContainer.locator('[data-testid^="reaction-"][data-testid$="🔥"]');
    await expect(adminReactionBadge).toContainText('2', { timeout: 10000 });

    await adminContext.close();
    await agentContext.close();
  });
});
