import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/testHelpers';

/**
 * E2E Tests for Teams Message Reactions.
 * Validates adding, toggling, real-time synchronization, accessibility, and ordering.
 */
test.describe('Teams - Message Reactions @teams @reactions', () => {
  test.setTimeout(180000);

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

  test('Optimistic UI rollback on backend failure (401/500)', async ({ page }) => {
    await loginAs(page, 'ti_admin');
    await page.waitForURL(/\/team-chat/, { waitUntil: 'networkidle' });

    await page.getByRole('option', { name: /Geral/i }).click();
    const uniqueText = `Rollback-Error-Test-${Date.now()}`;
    await page.getByPlaceholder(/escreva uma mensagem/i).fill(uniqueText);
    await page.getByPlaceholder(/escreva uma mensagem/i).press('Enter');

    const messageContainer = page.locator(`[data-testid^="message-"]`).filter({ hasText: uniqueText });
    await messageContainer.hover();
    
    const errors = [401, 500];
    for (const errorCode of errors) {
      // Intercept and fail the reaction request
      await page.route('**/rest/v1/team_message_reactions*', route => {
        route.fulfill({
          status: errorCode,
          contentType: 'application/json',
          body: JSON.stringify({ error: `Simulated ${errorCode}`, message: 'Failure' })
        });
      }, { times: 1 });

      await messageContainer.locator('[data-testid^="reaction-trigger-"]').click();
      await page.getByRole('gridcell', { name: /👍/ }).click();

      // Should appear optimistically
      const reactionBadge = messageContainer.locator('button').filter({ hasText: '👍' });
      await expect(reactionBadge).toBeVisible();

      // Should disappear after failure (rollback)
      await expect(reactionBadge).not.toBeVisible({ timeout: 10000 });
      
      // Check for error toast
      await expect(page.getByText(/Erro ao reagir/i)).toBeVisible();
      // Dismiss toast to clean up for next iteration if needed
      await page.keyboard.press('Escape');
    }
  });

  test('Accessibility and keyboard navigation under scroll', async ({ page }) => {
    await loginAs(page, 'ti_admin');
    await page.waitForURL(/\/team-chat/, { waitUntil: 'networkidle' });

    await page.getByRole('option', { name: /Geral/i }).click();
    
    // Fill chat with many messages to force scroll
    const input = page.getByPlaceholder(/escreva uma mensagem/i);
    for (let i = 0; i < 20; i++) {
      await input.fill(`Scroll-Msg-${i}`);
      await input.press('Enter');
    }

    const uniqueText = `A11y-Scroll-Test-${Date.now()}`;
    await input.fill(uniqueText);
    await input.press('Enter');

    const messageContainer = page.locator(`[data-testid^="message-"]`).filter({ hasText: uniqueText });
    
    // Scroll to the message if it's not visible
    await messageContainer.scrollIntoViewIfNeeded();
    
    const trigger = messageContainer.locator('[data-testid^="reaction-trigger-"]');
    await trigger.focus();
    await expect(trigger).toBeFocused();
    
    await page.keyboard.press('Enter');
    const picker = page.getByRole('dialog', { name: /Escolher um emoji/i });
    await expect(picker).toBeVisible();

    // Navigate with Tab and arrows (Radix/Popover usually supports keyboard)
    await page.keyboard.press('Tab');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    
    // Check for visible focus
    const focusedEmoji = page.locator('button:focus');
    await expect(focusedEmoji).toBeVisible();
    await expect(focusedEmoji).toHaveAttribute('role', 'gridcell');

    await page.keyboard.press('Enter');
    await expect(picker).not.toBeVisible();

    const badge = messageContainer.locator('button[aria-pressed="true"]');
    await expect(badge).toBeVisible();
  });

  test('Popularity ordering updates instantly for all clients', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const p1 = await context1.newPage();
    const p2 = await context2.newPage();

    await Promise.all([loginAs(p1, 'ti_admin'), loginAs(p2, 'rh_agent')]);
    
    for (const p of [p1, p2]) {
      await p.waitForURL(/\/team-chat/);
      await p.getByRole('option', { name: /Geral/i }).click();
    }

    const uniqueText = `Instant-Order-${Date.now()}`;
    await p1.getByPlaceholder(/escreva uma mensagem/i).fill(uniqueText);
    await p1.getByPlaceholder(/escreva uma mensagem/i).press('Enter');

    const m1 = p1.locator(`[data-testid^="message-"]`).filter({ hasText: uniqueText });
    const m2 = p2.locator(`[data-testid^="message-"]`).filter({ hasText: uniqueText });
    
    // Step 1: P1 adds ❤️ (count 1)
    await m1.hover();
    await m1.locator('[data-testid^="reaction-trigger-"]').click();
    await p1.getByRole('gridcell', { name: /❤️/ }).click();
    
    // Step 2: P1 adds 🔥 (count 1)
    await m1.hover();
    await m1.locator('[data-testid^="reaction-trigger-"]').click();
    await p1.getByRole('gridcell', { name: /🔥/ }).click();

    // Check P2 sees both. Initial order: ❤️ first (alphabetical or insertion)
    await expect(m2.locator('button').filter({ hasText: '❤️' })).toContainText('1');
    await expect(m2.locator('button').filter({ hasText: '🔥' })).toContainText('1');

    // Step 3: P2 reacts to 🔥 -> 🔥 count 2, should move to first position
    await m2.locator('button').filter({ hasText: '🔥' }).click();
    
    await expect(m1.locator('button').filter({ hasText: '🔥' })).toContainText('2');
    
    // Validate order on both pages
    for (const page of [p1, p2]) {
      const container = page.locator(`[data-testid^="message-"]`).filter({ hasText: uniqueText });
      const firstBadge = container.locator('button[aria-pressed]').first();
      await expect(firstBadge).toContainText('🔥');
      await expect(firstBadge).toContainText('2');
    }

    // Step 4: P2 removes 🔥 reaction -> 🔥 count 1, ❤️ should be first (if alphabetical ties)
    await m2.locator('button').filter({ hasText: '🔥' }).click();
    await expect(m1.locator('button').filter({ hasText: '🔥' })).toContainText('1');
    
    // ❤️ comes before 🔥 alphabetically (if counts equal)
    const firstBadgeAfterRemove = m1.locator('button[aria-pressed]').first();
    await expect(firstBadgeAfterRemove).toContainText('❤️');

    await context1.close();
    await context2.close();
  });

  test('Race condition: Simultaneous toggles stay consistent', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const p1 = await context1.newPage();
    const p2 = await context2.newPage();

    await Promise.all([loginAs(p1, 'ti_admin'), loginAs(p2, 'rh_agent')]);
    
    for (const p of [p1, p2]) {
      await p.waitForURL(/\/team-chat/);
      await p.getByRole('option', { name: /Geral/i }).click();
    }

    const uniqueText = `Race-Condition-${Date.now()}`;
    await p1.getByPlaceholder(/escreva uma mensagem/i).fill(uniqueText);
    await p1.getByPlaceholder(/escreva uma mensagem/i).press('Enter');

    const m1 = p1.locator(`[data-testid^="message-"]`).filter({ hasText: uniqueText });
    const m2 = p2.locator(`[data-testid^="message-"]`).filter({ hasText: uniqueText });
    
    // Ensure message is visible for both
    await expect(m2).toBeVisible();

    // Trigger reaction picker for both
    await m1.hover();
    await m1.locator('[data-testid^="reaction-trigger-"]').click();
    await m2.hover();
    await m2.locator('[data-testid^="reaction-trigger-"]').click();

    // Toggle same emoji (👍) almost at the same time
    await Promise.all([
      p1.getByRole('gridcell', { name: /👍/ }).click(),
      p2.getByRole('gridcell', { name: /👍/ }).click()
    ]);

    // Eventually both should settle on 2
    await expect(m1.locator('button').filter({ hasText: '👍' })).toContainText('2', { timeout: 15000 });
    await expect(m2.locator('button').filter({ hasText: '👍' })).toContainText('2', { timeout: 15000 });

    // Now remove almost simultaneously
    await Promise.all([
      m1.locator('button').filter({ hasText: '👍' }).click(),
      m2.locator('button').filter({ hasText: '👍' }).click()
    ]);

    // Eventually both should show 0 (badge disappears)
    await expect(m1.locator('button').filter({ hasText: '👍' })).not.toBeVisible({ timeout: 15000 });
    await expect(m2.locator('button').filter({ hasText: '👍' })).not.toBeVisible({ timeout: 15000 });

    await context1.close();
    await context2.close();
  });
});
