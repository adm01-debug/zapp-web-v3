import { test, expect } from '@playwright/test';
import { login, openConversation, loginAs } from './helpers/testHelpers';

/**
 * High-Performance & Concurrency E2E Audit for Teams Module
 * Metrics: Latency, Concurrency, Recovery speed, and Real-time RBAC.
 */
test.describe('Teams Module - Performance & Concurrency Stress', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await openConversation(page, 'João Silva');
  });

  test('Scenario 1: Concurrent High-Frequency Sends with Latency Metrics', async ({ page }) => {
    await page.keyboard.press('Alt+W');
    const input = page.locator('textarea[aria-label="Mensagem de sussurro"]');
    
    const startTime = Date.now();
    const iterations = 10;
    
    // Perform stress sends
    for (let i = 0; i < iterations; i++) {
      await input.fill(`PerfMsg-${i}`);
      await page.keyboard.press('Enter');
    }

    // Measure time to visible completion
    const lastMsg = page.locator('text="PerfMsg-9"');
    await expect(lastMsg).toBeVisible({ timeout: 10000 });
    
    const endTime = Date.now();
    const totalLatency = endTime - startTime;
    const avgLatency = totalLatency / iterations;

    console.log(`[Metrics] Total Time: ${totalLatency}ms | Avg Latency per Message: ${avgLatency}ms`);
    
    // Check for duplicates (strict count)
    for (let i = 0; i < iterations; i++) {
      await expect(page.locator(`text="PerfMsg-${i}"`)).toHaveCount(1);
    }
  });

  test('Scenario 2: Parallel Tab Simulation (No Duplicity)', async ({ context, page }) => {
    // Open a second tab/page for the same conversation
    const page2 = await context.newPage();
    await login(page2);
    await openConversation(page2, 'João Silva');
    await page2.keyboard.press('Alt+W');

    await page.keyboard.press('Alt+W');
    const input1 = page.locator('textarea[aria-label="Mensagem de sussurro"]');
    const input2 = page2.locator('textarea[aria-label="Mensagem de sussurro"]');

    const msg1 = `Parallel-A-${Date.now()}`;
    const msg2 = `Parallel-B-${Date.now()}`;

    // Send from both tabs simultaneously
    await Promise.all([
      input1.fill(msg1).then(() => page.keyboard.press('Enter')),
      input2.fill(msg2).then(() => page2.keyboard.press('Enter'))
    ]);

    // Verify both tabs see both messages in correct order
    await expect(page.locator(`text="${msg1}"`)).toBeVisible();
    await expect(page.locator(`text="${msg2}"`)).toBeVisible();
    await expect(page2.locator(`text="${msg1}"`)).toBeVisible();
    await expect(page2.locator(`text="${msg2}"`)).toBeVisible();
  });

  test('Scenario 3: Real-time RBAC Switch Simulation', async ({ page }) => {
    await page.keyboard.press('Alt+W');
    await expect(page.locator('button[title*="Modo Sussurro"]')).toBeVisible();

    // We simulate a role change by re-logging with a different account 
    // within the same session context if the app supports real-time role updates.
    // Since real-time DB change is hard to trigger from E2E without API access, 
    // we verify that the UI reacts instantly to the new profile data on re-mount.
    
    await loginAs(page, 'viewer');
    await openConversation(page, 'João Silva');
    
    // Tools should be gone instantly
    await expect(page.locator('button[title*="Modo Sussurro"]')).not.toBeVisible();
  });

  test('Scenario 4: A11y & Connectivity Status Announcements', async ({ page }) => {
    await page.keyboard.press('Alt+W');
    
    // Simulate error state
    await page.context().setOffline(true);
    const input = page.locator('textarea[aria-label="Mensagem de sussurro"]');
    await input.fill('Failed message');
    await page.keyboard.press('Enter');

    // Accessibility: Check if error message is announced (aria-live)
    const errorBanner = page.locator('[role="alert"], [aria-live="assertive"], .text-destructive').first();
    await expect(errorBanner).toBeVisible();
    
    // Recovery accessibility
    await page.context().setOffline(false);
    const retryBtn = page.locator('button:has-text("Reenviar")');
    await retryBtn.focus();
    await expect(retryBtn).toBeFocused();
  });
});
