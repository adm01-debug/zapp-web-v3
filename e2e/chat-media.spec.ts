import { test, expect } from '@playwright/test';
import { login, openConversation } from './helpers/testHelpers';

/**
 * E2E Test: Chat Media Handling
 * Covers: Audio (PTT), Images, Files, and Retry states.
 */
test.describe('Chat Media Handling', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await openConversation(page, 'João Silva'); // Helper uses this mock name
  });

  test('should simulate sending an audio message (PTT)', async ({ page }) => {
    // Look for audio record button
    const recordBtn = page.locator('button[aria-label*="grav"], button[aria-label*="Audio"]').first();
    await expect(recordBtn).toBeVisible();
    
    // Simulate recording start
    await recordBtn.click();
    
    // Audio recorder should appear
    const recorder = page.locator('text=00:0');
    await expect(recorder).toBeVisible();
    
    // Stop and send (mocked by clicking the send button in the recorder)
    const stopBtn = page.locator('button[aria-label*="Enviar"], button[aria-label*="Send"]').last();
    await stopBtn.click();
    
    // Should show a placeholder for the sending audio or the audio bubble
    await expect(page.locator('audio').last()).toBeAttached();
  });

  test('should show progress UI when sending a file', async ({ page }) => {
    // Enable simulation for slower upload
    await page.evaluate(() => {
      localStorage.setItem('debug_chat_latency', '2000');
    });

    const fileInput = page.locator('input[type="file"]').first();
    
    // Create a dummy file
    const fileContent = 'Dummy file content';
    await fileInput.setInputFiles({
      name: 'test-document.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(fileContent),
    });

    // Send the message
    await page.keyboard.press('Enter');

    // Progress bar should be visible
    const progressBar = page.locator('text=Enviando...');
    await expect(progressBar).toBeVisible();
    
    // Wait for completion
    await expect(progressBar).not.toBeVisible({ timeout: 10000 });
    
    // Cleanup
    await page.evaluate(() => localStorage.removeItem('debug_chat_latency'));
  });

  test('should show retry banner on delivery failure', async ({ page }) => {
    // Enable simulation for failure
    await page.evaluate(() => {
      localStorage.setItem('debug_chat_failure_rate', '1.0');
    });

    const input = page.locator('textarea[placeholder*="Digite"]').first();
    await input.fill('Mensagem que vai falhar');
    await page.keyboard.press('Enter');

    // Error banner should appear
    const errorBanner = page.locator('text=Falha ao enviar');
    await expect(errorBanner).toBeVisible({ timeout: 5000 });
    
    // Should have a retry button
    const retryBtn = page.locator('button:has-text("Reenviar")');
    await expect(retryBtn).toBeVisible();

    // Disable failure for retry
    await page.evaluate(() => {
      localStorage.setItem('debug_chat_failure_rate', '0.0');
    });

    await retryBtn.click();
    await expect(errorBanner).not.toBeVisible();

    // Cleanup
    await page.evaluate(() => localStorage.removeItem('debug_chat_failure_rate'));
  });

  test('should filter search results by media type and date', async ({ page }) => {
    // Open chat search (Ctrl+F or shortcut)
    await page.keyboard.press('Control+f');
    
    const searchBar = page.locator('role=search');
    await expect(searchBar).toBeVisible();

    // 1. Filter by "Imagens" chip
    const imageFilter = page.locator('button:has-text("Imagens")');
    if (await imageFilter.isVisible()) {
      await imageFilter.click();
      
      // If there are results, they should show a count and results should contain images
      const countLabel = page.locator('[aria-live="polite"]');
      await expect(countLabel).toBeVisible();
    }

    // 2. Filter by Date (Open popover)
    const dateBtn = page.locator('button:has-text("Qualquer data"), button:has-text(" interação")');
    await dateBtn.click();
    
    const todayOption = page.locator('button:has-text("Hoje")');
    await expect(todayOption).toBeVisible();
    await todayOption.click();
    
    // Button label should update
    await expect(page.locator('button:has-text("Hoje")')).toBeVisible();
  });
});
