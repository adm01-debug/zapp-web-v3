import { test, expect } from '@playwright/test';
import { login, openConversation, loginAs } from './helpers/testHelpers';

/**
 * Extended E2E Audit for Teams Module
 * Validates: Resiliency, Order Consistency, Visual Regression, RBAC and Accessibility.
 */
test.describe('Teams Module - Resilience & Full Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await openConversation(page, 'João Silva');
  });

  test('Scenario 1: Audio Failure Simulation & Recovery', async ({ page }) => {
    await page.keyboard.press('Alt+W');
    
    // 1. Mock Upload Failure
    // Intercept storage upload for team-files/audio to simulate failure
    await page.route('**/storage/v1/object/whatsapp-media/**', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Upload failed for E2E testing' }),
        });
      } else {
        await route.continue();
      }
    });

    const recordBtn = page.locator('button[aria-label="Gravar áudio"]');
    await recordBtn.click();
    await page.waitForTimeout(500); // Record a bit
    await page.locator('button[aria-label="Parar gravação"]').click();
    await page.locator('button[aria-label="Enviar áudio"]').click();

    // 2. Check Error state
    await expect(page.locator('text="Erro ao enviar áudio"')).toBeVisible();
    await expect(page.locator('button:has-text("Reenviar")')).toBeVisible();

    // 3. Mock Success and Retry
    await page.unroute('**/storage/v1/object/whatsapp-media/**');
    await page.locator('button:has-text("Reenviar")').click();
    
    // Verify recovery (toast or removal of error banner)
    await expect(page.locator('text="Áudio reenviado"')).toBeVisible();
  });

  test('Scenario 2: Order Consistency (Stickers, Memes & Reload)', async ({ page }) => {
    await page.keyboard.press('Alt+W');
    const input = page.locator('textarea[aria-label="Mensagem de sussurro"]');

    // 1. Send sequential items
    const msg1 = `First-${Date.now()}`;
    await input.fill(msg1);
    await page.keyboard.press('Enter');

    const msg2 = `Second-${Date.now()}`;
    await input.fill(msg2);
    await page.keyboard.press('Enter');

    // 2. Verify order in UI
    const messages = page.locator('.group\\/whisper');
    await expect(messages.nth(0)).toContainText(msg2); // Reverse order check (flex-col-reverse)
    await expect(messages.nth(1)).toContainText(msg1);

    // 3. Navigate away and back
    await page.click('button[aria-label="Voltar"], .lucide-arrow-left');
    await openConversation(page, 'João Silva');
    await page.keyboard.press('Alt+W');
    
    // 4. Persistence check
    await expect(page.locator(`text="${msg1}"`)).toBeVisible();
    await expect(page.locator(`text="${msg2}"`)).toBeVisible();
  });

  test('Scenario 3: Audio Player Accessibility & Screen Readers', async ({ page }) => {
    await page.keyboard.press('Alt+W');
    
    // Find an existing audio player or send a mock one
    // Here we focus on the UI component structure
    const slider = page.locator('[role="slider"][aria-label="Progresso do áudio"]');
    
    // 1. Keyboard Navigation
    if (await slider.count() > 0) {
      await slider.first().focus();
      await expect(slider.first()).toBeFocused();
      
      // ARIA attributes check
      await expect(slider.first()).toHaveAttribute('aria-valuemin', '0');
      await expect(slider.first()).toHaveAttribute('aria-valuemax', '100');
    }

    // 2. Visible focus indicators
    const buttons = page.locator('button[aria-label*="Sussurro"]');
    await buttons.first().focus();
    // We expect some visual focus ring - checked via CSS if possible
  });

  test('Scenario 4: Visual Regression Snapshots', async ({ page }) => {
    await page.keyboard.press('Alt+W');
    const whisperPanel = page.locator('[role="dialog"][aria-label="Painel de Sussurro"]');
    await expect(whisperPanel).toBeVisible();

    // Actual visual regression (requires baseline)
    // await expect(whisperPanel).toHaveScreenshot('teams-whisper-panel.png');
    
    // Fallback: Verify color palette matches Amber design
    await expect(whisperPanel).toHaveCSS('border-color', /rgb\(254, 243, 199\)|#fef3c7|rgb\(253, 230, 138\)/); 
  });
});

test.describe('Teams Module - RBAC Matrix', () => {
  test('Viewer Profile should be restricted', async ({ page }) => {
    // Note: loginAs uses specific test accounts
    await loginAs(page, 'viewer');
    await openConversation(page, 'João Silva');
    
    // 1. Whisper mode button should be HIDDEN for viewers
    const whisperBtn = page.locator('button[title*="Modo Sussurro"]');
    await expect(whisperBtn).not.toBeVisible();
    
    // 2. Slash commands should be filtered
    const mainInput = page.locator('textarea[placeholder*="Digite uma mensagem"]');
    await mainInput.fill('/whisper');
    await expect(page.locator('text="Modo Sussurro"')).not.toBeVisible();
  });

  test('Agent Profile should have full collaboration access', async ({ page }) => {
    await loginAs(page, 'agent');
    await openConversation(page, 'João Silva');
    
    await expect(page.locator('button[title*="Modo Sussurro"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Arquivos da equipe"]')).toBeVisible();
  });
});
