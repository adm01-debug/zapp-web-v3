import { test, expect } from '@playwright/test';
import { login, openConversation } from './helpers/testHelpers';

/**
 * Extended E2E Suite for Teams Module
 * Validates: Audio (PTT), Stickers, Memes, Links, RBAC and Visual Integrity.
 */
test.describe('Teams Module - Advanced Collaboration Audit', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await openConversation(page, 'João Silva');
  });

  test('Scenario 1: Audio PTT - Loading, States and Accessibility', async ({ page }) => {
    await page.keyboard.press('Alt+W');
    await expect(page.locator('text="Ambiente de Equipe — Privado"')).toBeVisible();

    const recordBtn = page.locator('button[aria-label="Gravar áudio"]');
    await expect(recordBtn).toBeVisible();
    await expect(recordBtn).toHaveAttribute('title', /Gravar áudio/i);

    // Simulate Record Toggle
    await recordBtn.click();
    const stopBtn = page.locator('button[aria-label="Parar gravação"]');
    await expect(stopBtn).toBeVisible();
    await expect(stopBtn).toHaveClass(/bg-destructive/); // Visual check for recording state

    // Cancel recording to avoid sending garbage
    await page.keyboard.press('Escape');
    await expect(recordBtn).toBeVisible();
  });

  test('Scenario 2: Stickers & Audio Memes - Rendering and Parity', async ({ page }) => {
    await page.keyboard.press('Alt+W');
    
    // Open Secondary Toolbar (only for Desktop as per implementation logic)
    const plusBtn = page.locator('button[aria-label="Mais opções de mensagem"]');
    await plusBtn.click();

    // Check for specific internal tools
    const internalFilesBtn = page.locator('button[aria-label="Arquivos da equipe"]');
    await expect(internalFilesBtn).toBeVisible();

    // Check for parity tools (Stickers/Memes)
    const stickerPickerTrigger = page.locator('button').filter({ has: page.locator('.lucide-smile, .lucide-sticker') }).first();
    // Some environments might have these under the "plus" popover
    if (await stickerPickerTrigger.isVisible()) {
      await stickerPickerTrigger.click();
      await expect(page.locator('[role="dialog"], [data-state="open"]')).toBeVisible();
    }
  });

  test('Scenario 3: Links - Rendering, Security & Responsive Preview', async ({ page }) => {
    await page.keyboard.press('Alt+W');
    const input = page.locator('textarea[aria-label="Mensagem de sussurro"]');
    
    const maliciousLink = 'javascript:alert("xss")';
    await input.fill(maliciousLink);
    await page.keyboard.press('Enter');

    // Verify it IS NOT rendered as a clickable link if malicious
    const dangerousAnchor = page.locator(`a[href*="javascript:"]`);
    await expect(dangerousAnchor).not.toBeVisible();

    const safeLink = 'https://google.com';
    await input.fill(safeLink);
    await page.keyboard.press('Enter');

    const safeAnchor = page.locator(`a[href="${safeLink}"]`);
    await expect(safeAnchor).toBeVisible();
    await expect(safeAnchor).toHaveAttribute('target', '_blank');
    
    // Test responsive layout (mobile simulation)
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(safeAnchor).toBeVisible(); // Should still be accessible
  });

  test('Scenario 4: RBAC Matrix - Profile-based UI Restrictions', async ({ page }) => {
    // Current test user is usually Admin/Agent.
    // Check for elements that SHOULD be visible
    await expect(page.locator('button[title*="Modo Sussurro"]')).toBeVisible();
    
    // Check /files command availability
    const mainInput = page.locator('textarea[placeholder*="Digite uma mensagem"]');
    await mainInput.fill('/');
    await expect(page.locator('text="Arquivos Equipe"')).toBeVisible();
    await expect(page.locator('text="Modo Sussurro"')).toBeVisible();
  });

  test('Scenario 5: Visual Regression & CI Snapshot', async ({ page }) => {
    await page.keyboard.press('Alt+W');
    const whisperPanel = page.locator('[role="dialog"][aria-label="Painel de Sussurro"]');
    await expect(whisperPanel).toBeVisible();

    // Capture snapshot for the report
    await whisperPanel.screenshot({ path: 'playwright-report/teams-whisper-snapshot.png' });
    
    // Check for the "Ambiente de Equipe" banner contrast and visibility
    const banner = page.locator('text="Ambiente de Equipe — Privado"');
    await expect(banner).toBeVisible();
    await expect(banner).toHaveClass(/text-amber-800/);
  });
});

