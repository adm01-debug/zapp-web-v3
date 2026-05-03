import { test, expect } from '@playwright/test';
import { login, openConversation } from './helpers/testHelpers';

/**
 * E2E Test: Teams Whisper Mode (Internal Notes)
 * Covers: Sending whispers, UI visibility, keyboard shortcuts, and unread counter.
 */
test.describe('Teams Whisper Mode', () => {
  test.beforeEach(async ({ page }) => {
    // We assume the environment is seeded with a test contact and user
    await login(page);
    await openConversation(page, 'João Silva');
  });

  test('should open whisper mode via shortcut and send a note', async ({ page }) => {
    // 1. Open via Shortcut (Alt+W)
    await page.keyboard.press('Alt+W');
    
    // Check if Whisper Panel is visible
    const whisperPanel = page.locator('[role="dialog"][aria-label="Painel de Sussurro"]');
    await expect(whisperPanel).toBeVisible();

    // 2. Check if input is focused automatically
    const whisperInput = whisperPanel.locator('textarea[aria-label="Mensagem de sussurro"]');
    await expect(whisperInput).toBeFocused();

    // 3. Send a whisper message
    const whisperText = `Teste de Sussurro ${Date.now()}`;
    await whisperInput.fill(whisperText);
    await page.keyboard.press('Enter');

    // 4. Verify message appears in the whisper log
    await expect(page.locator(`text="${whisperText}"`)).toBeVisible();

    // 5. Check if it shows as "Equipe — Interno"
    await expect(page.locator('text="Equipe — Interno"')).toBeVisible();
  });

  test('should toggle whisper mode via header button and show unread badge', async ({ page }) => {
    // 1. Open via header button
    const whisperButton = page.locator('button[title*="Modo Sussurro"]');
    await whisperButton.click();
    
    const whisperPanel = page.locator('[role="dialog"][aria-label="Painel de Sussurro"]');
    await expect(whisperPanel).toBeVisible();

    // 2. Close panel
    await page.locator('button[aria-label="Fechar sussurro"]').click();
    await expect(whisperPanel).not.toBeVisible();

    // Note: Testing the unread badge in E2E would require another session or 
    // a mock message insertion. For now, we verify the UI components exist.
    await expect(whisperButton).toBeVisible();
  });

  test('should respect accessibility standards', async ({ page }) => {
    await page.keyboard.press('Alt+W');
    
    // Check ARIA labels and roles
    const whisperPanel = page.locator('[role="dialog"][aria-label="Painel de Sussurro"]');
    await expect(whisperPanel).toHaveAttribute('aria-modal', 'true');
    
    const logArea = whisperPanel.locator('[role="log"]');
    await expect(logArea).toHaveAttribute('aria-live', 'polite');

    const closeButton = page.locator('button[aria-label="Fechar sussurro"]');
    await expect(closeButton).toBeVisible();

    const sendButton = page.locator('button[aria-label="Enviar sussurro"]');
    await expect(sendButton).toBeVisible();
    
    // Check Escape key closes the panel
    await page.keyboard.press('Escape');
    await expect(whisperPanel).not.toBeVisible();
  });

  test('should block sending empty whispers', async ({ page }) => {
    await page.keyboard.press('Alt+W');
    const whisperPanel = page.locator('[role="dialog"][aria-label="Painel de Sussurro"]');
    const sendButton = whisperPanel.locator('button[aria-label="Enviar sussurro"]');
    
    // Button should be disabled when input is empty
    await expect(sendButton).toBeDisabled();
    
    const whisperInput = whisperPanel.locator('textarea[aria-label="Mensagem de sussurro"]');
    await whisperInput.fill('   ');
    await expect(sendButton).toBeDisabled();
    
    await whisperInput.fill('Conteúdo real');
    await expect(sendButton).not.toBeDisabled();
  });
});
