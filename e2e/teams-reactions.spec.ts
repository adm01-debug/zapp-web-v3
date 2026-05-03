import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/testHelpers';

/**
 * E2E Tests for Teams Message Reactions.
 * Validates adding, toggling, real-time synchronization, accessibility, and ordering.
 */
test.describe('Teams - Message Reactions @teams @reactions', () => {
  test.setTimeout(120000);

  test('Add and remove reaction with optimistic UI', async ({ page }) => {
    await loginAs(page, 'ti_admin');
    await page.waitForURL(/\/team-chat/, { waitUntil: 'networkidle' });

    const geralConv = page.getByRole('option', { name: /Geral/i });
    await geralConv.waitFor({ state: 'visible' });
    await geralConv.click();

    const uniqueText = `Reaction-Test-${Date.now()}`;
    const input = page.getByPlaceholder(/escreva uma mensagem/i);
    await input.fill(uniqueText);
    await input.press('Enter');

    const message = page.getByText(uniqueText);
    await expect(message).toBeVisible();

    const messageContainer = page.locator(`[data-testid^="message-"]`).filter({ hasText: uniqueText });
    const reactionTrigger = messageContainer.locator('[data-testid^="reaction-trigger-"]');
    
    await messageContainer.hover();
    await reactionTrigger.waitFor({ state: 'visible' });
    await reactionTrigger.click();

    const heartEmoji = page.getByRole('gridcell', { name: /❤️/ });
    await heartEmoji.click();

    const reactionBadge = messageContainer.locator('button').filter({ hasText: '❤️' });
    await expect(reactionBadge).toBeVisible();
    await expect(reactionBadge).toContainText('1');
    
    await reactionBadge.click();
    await expect(reactionBadge).not.toBeVisible();
  });

  test('Optimistic UI rollback on backend failure', async ({ page }) => {
    await loginAs(page, 'ti_admin');
    await page.waitForURL(/\/team-chat/, { waitUntil: 'networkidle' });

    await page.getByRole('option', { name: /Geral/i }).click();
    const uniqueText = `Rollback-Test-${Date.now()}`;
    await page.getByPlaceholder(/escreva uma mensagem/i).fill(uniqueText);
    await page.getByPlaceholder(/escreva uma mensagem/i).press('Enter');

    const messageContainer = page.locator(`[data-testid^="message-"]`).filter({ hasText: uniqueText });
    await messageContainer.hover();
    
    // Intercept and fail the reaction request
    await page.route('**/rest/v1/team_message_reactions*', route => {
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Permission denied', message: 'Simulated failure' })
      });
    });

    await messageContainer.locator('[data-testid^="reaction-trigger-"]').click();
    await page.getByRole('gridcell', { name: /👍/ }).click();

    // Should appear optimistically
    const reactionBadge = messageContainer.locator('button').filter({ hasText: '👍' });
    await expect(reactionBadge).toBeVisible();

    // Should disappear after failure (rollback)
    await expect(reactionBadge).not.toBeVisible({ timeout: 10000 });
    
    // Check for error toast
    await expect(page.getByText(/Erro ao reagir/i)).toBeVisible();
  });

  test('Accessibility and keyboard navigation', async ({ page }) => {
    await loginAs(page, 'ti_admin');
    await page.waitForURL(/\/team-chat/, { waitUntil: 'networkidle' });

    await page.getByRole('option', { name: /Geral/i }).click();
    const uniqueText = `A11y-Test-${Date.now()}`;
    await page.getByPlaceholder(/escreva uma mensagem/i).fill(uniqueText);
    await page.getByPlaceholder(/escreva uma mensagem/i).press('Enter');

    const messageContainer = page.locator(`[data-testid^="message-"]`).filter({ hasText: uniqueText });
    
    // 1. Focus the trigger with keyboard
    const trigger = messageContainer.locator('[data-testid^="reaction-trigger-"]');
    await trigger.focus();
    await expect(trigger).toBeFocused();
    
    // 2. Open picker with Enter
    await page.keyboard.press('Enter');
    const picker = page.getByRole('dialog', { name: /Escolher um emoji/i });
    await expect(picker).toBeVisible();

    // 3. Navigate with Tab
    const firstEmoji = page.getByRole('gridcell').first();
    await firstEmoji.focus();
    await expect(firstEmoji).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('gridcell').nth(1)).toBeFocused();

    // 4. Select with Enter
    const emojiText = await page.getByRole('gridcell').nth(2).innerText();
    await page.keyboard.press('Enter');
    await expect(picker).not.toBeVisible();

    // 5. Validate reaction badge has correct ARIA labels
    const badge = messageContainer.locator('button').filter({ hasText: emojiText });
    await expect(badge).toHaveAttribute('aria-pressed', 'true');
    await expect(badge).toHaveAttribute('aria-label', new RegExp(`${emojiText}, 1 reações. Você reagiu.`, 'i'));
    
    // 6. Close picker with Escape
    await trigger.click();
    await expect(picker).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(picker).not.toBeVisible();
  });

  test('Popularity ordering and grouped count', async ({ page, browser }) => {
    await loginAs(page, 'ti_admin');
    await page.waitForURL(/\/team-chat/, { waitUntil: 'networkidle' });

    await page.getByRole('option', { name: /Geral/i }).click();
    const uniqueText = `Order-Test-${Date.now()}`;
    await page.getByPlaceholder(/escreva uma mensagem/i).fill(uniqueText);
    await page.getByPlaceholder(/escreva uma mensagem/i).press('Enter');

    const messageContainer = page.locator(`[data-testid^="message-"]`).filter({ hasText: uniqueText });
    
    // Add two different reactions
    await messageContainer.hover();
    await messageContainer.locator('[data-testid^="reaction-trigger-"]').click();
    await page.getByRole('gridcell', { name: /❤️/ }).click();
    
    await messageContainer.hover();
    await messageContainer.locator('[data-testid^="reaction-trigger-"]').click();
    await page.getByRole('gridcell', { name: /🔥/ }).click();

    // Now add a second reaction to "🔥" from another user context to test ordering
    const user2Context = await browser.newContext();
    const user2Page = await user2Context.newPage();
    await loginAs(user2Page, 'rh_agent');
    await user2Page.waitForURL(/\/team-chat/);
    await user2Page.getByRole('option', { name: /Geral/i }).click();
    
    const u2MsgContainer = user2Page.locator(`[data-testid^="message-"]`).filter({ hasText: uniqueText });
    await u2MsgContainer.locator('button').filter({ hasText: '🔥' }).click();
    
    // Wait for update in main page
    const fireBadge = messageContainer.locator('button').filter({ hasText: '🔥' });
    await expect(fireBadge).toContainText('2');
    
    // Check ordering: 🔥 (2) should be before ❤️ (1)
    const reactionButtons = messageContainer.locator('button[aria-pressed]');
    const firstReactionText = await reactionButtons.first().innerText();
    expect(firstReactionText).toContain('🔥');
    expect(firstReactionText).toContain('2');
    
    const secondReactionText = await reactionButtons.nth(1).innerText();
    expect(secondReactionText).toContain('❤️');
    expect(secondReactionText).toContain('1');

    await user2Context.close();
  });

  test('Real-time sync on toggle/remove', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const p1 = await context1.newPage();
    const p2 = await context2.newPage();

    await Promise.all([loginAs(p1, 'ti_admin'), loginAs(p2, 'rh_agent')]);
    
    for (const p of [p1, p2]) {
      await p.waitForURL(/\/team-chat/);
      await p.getByRole('option', { name: /Geral/i }).click();
    }

    const uniqueText = `Toggle-Sync-${Date.now()}`;
    await p1.getByPlaceholder(/escreva uma mensagem/i).fill(uniqueText);
    await p1.getByPlaceholder(/escreva uma mensagem/i).press('Enter');

    // Both react
    const m1 = p1.locator(`[data-testid^="message-"]`).filter({ hasText: uniqueText });
    const m2 = p2.locator(`[data-testid^="message-"]`).filter({ hasText: uniqueText });
    
    await m1.hover();
    await m1.locator('[data-testid^="reaction-trigger-"]').click();
    await p1.getByRole('gridcell', { name: /👍/ }).click();
    
    await expect(m2.locator('button').filter({ hasText: '👍' })).toBeVisible();
    await m2.locator('button').filter({ hasText: '👍' }).click();
    
    // Count should be 2 for both
    await expect(m1.locator('button').filter({ hasText: '👍' })).toContainText('2');
    await expect(m2.locator('button').filter({ hasText: '👍' })).toContainText('2');

    // P1 removes reaction
    await m1.locator('button').filter({ hasText: '👍' }).click();
    
    // P2 should see count update to 1 immediately
    await expect(m2.locator('button').filter({ hasText: '👍' })).toContainText('1', { timeout: 10000 });

    await context1.close();
    await context2.close();
  });
});
