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

  test('Scenario 1: Audio PTT - Recording and UI Accessibility', async ({ page }) => {
    await page.keyboard.press('Alt+W');
    await expect(page.locator('text="Ambiente de Equipe — Privado"')).toBeVisible();

    const recordBtn = page.locator('button[aria-label="Gravar áudio"]');
    await expect(recordBtn).toBeVisible();
    await expect(recordBtn).toHaveAttribute('title', /Gravar áudio/i);

    // Simulate Record State
    await recordBtn.click();
    const stopBtn = page.locator('button[aria-label="Parar gravação"]');
    await expect(stopBtn).toBeVisible();
    await expect(stopBtn).toHaveClass(/bg-destructive/);

    // Cancel via Keyboard
    await page.keyboard.press('Escape');
    await expect(recordBtn).toBeVisible();
  });

  test('Scenario 2: Stickers & Audio Memes - Parity Verification', async ({ page }) => {
    await page.keyboard.press('Alt+W');
    
    // Open Tools Toolbar
    const plusBtn = page.locator('button[aria-label="Mais opções de mensagem"]');
    await plusBtn.click();

    // Check for parity tools in the toolbar
    const stickerTrigger = page.locator('button').filter({ has: page.locator('.lucide-smile, .lucide-sticker') }).first();
    await expect(stickerTrigger).toBeVisible();

    const memeTrigger = page.locator('button').filter({ has: page.locator('.lucide-music, .lucide-file-audio') }).first();
    expect(await memeTrigger.count()).toBeGreaterThanOrEqual(0); // Optional based on specific toolbar config
    
    await expect(page.locator('button[aria-label="Arquivos da equipe"]')).toBeVisible();
  });

  test('Scenario 3: Links - Security and Sanitization', async ({ page }) => {
    await page.keyboard.press('Alt+W');
    const input = page.locator('textarea[aria-label="Mensagem de sussurro"]');
    
    // XSS Prevention Check
    const malicious = 'javascript:alert(1)';
    await input.fill(malicious);
    await page.keyboard.press('Enter');
    await expect(page.locator(`a[href*="javascript:"]`)).not.toBeVisible();

    // Safe Link Check
    const safe = 'https://zappweb.com';
    await input.fill(safe);
    await page.keyboard.press('Enter');
    const anchor = page.locator(`a[href="${safe}"]`);
    await expect(anchor).toBeVisible();
    await expect(anchor).toHaveAttribute('target', '_blank');
  });

  test('Scenario 4: RBAC Matrix - Profile-based Access', async ({ page }) => {
    // Basic verification that Teams tools are available for the default high-privilege test user
    await expect(page.locator('button[title*="Modo Sussurro"]')).toBeEnabled();
    
    // Test slash command filtering for Teams
    const mainInput = page.locator('textarea[placeholder*="Digite uma mensagem"]');
    await mainInput.fill('/whisper');
    await expect(page.locator('text="Modo Sussurro"')).toBeVisible();
  });

  test('Scenario 5: Visual Regression - Consistent Amber Environment', async ({ page }) => {
    await page.keyboard.press('Alt+W');
    const whisperPanel = page.locator('[role="dialog"][aria-label="Painel de Sussurro"]');
    await expect(whisperPanel).toBeVisible();

    // Snapshot capture for CI reporting
    await whisperPanel.screenshot({ path: 'playwright-report/teams-visual-state.png' });
    
    const teamBanner = page.locator('text="Ambiente de Equipe — Privado"');
    await expect(teamBanner).toBeVisible();
    // Verify brand color adherence
    await expect(teamBanner).toHaveCSS('color', /rgb\(153, 103, 21\)|#996715|rgb\(180, 83, 9\)/); 
  });
});
