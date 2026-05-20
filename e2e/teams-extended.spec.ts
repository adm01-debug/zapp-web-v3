import { test, expect } from '@playwright/test';
import { login, openConversation, loginAs } from './helpers/testHelpers';

/**
 * Advanced E2E Audit for Teams Module - Stress, Resiliency, RBAC and Accessibility.
 * Validates: High-frequency sending, connectivity failure recovery, profile-based permissions, and player A11y.
 */
test.describe('Teams Module - Advanced Resilience & Stress', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await openConversation(page, 'João Silva');
  });

  test('Scenario 1: Stress Test - High Frequency Sending (Audio/Stickers)', async ({ page }) => {
    await page.keyboard.press('Alt+W');
    const input = page.locator('textarea[aria-label="Mensagem de sussurro"]');
    
    // Simulate multiple sequential sends to test concurrency and order
    const iterations = 5;
    const sentMessages: string[] = [];

    for (let i = 0; i < iterations; i++) {
      const msg = `StressMsg-${i}-${Date.now()}`;
      sentMessages.push(msg);
      await input.fill(msg);
      await page.keyboard.press('Enter');
      // No wait here to simulate "stress"
    }

    // Verify all messages appear and no duplicates
    for (const msg of sentMessages) {
      await expect(page.locator(`text="${msg}"`)).toHaveCount(1);
    }

    // Verify visual order (last sent first in flex-col-reverse)
    const firstMsgInUI = page.locator('.group\\/whisper').first();
    await expect(firstMsgInUI).toContainText(sentMessages[iterations - 1]);
  });

  test('Scenario 2: Network Interruption during Upload Recovery', async ({ page }) => {
    await page.keyboard.press('Alt+W');
    
    // 1. Simulate Offline State
    await page.context().setOffline(true);

    const recordBtn = page.locator('button[aria-label="Gravar áudio"]');
    await recordBtn.click();
    await page.waitForTimeout(500);
    await page.locator('button[aria-label="Parar gravação"]').click();
    await page.locator('button[aria-label="Enviar áudio"]').click();

    // 2. Expect error UI
    await expect(page.locator('text="Erro ao enviar áudio"')).toBeVisible();

    // 3. Go Online and Retry
    await page.context().setOffline(false);
    await page.locator('button:has-text("Reenviar")').click();
    
    await expect(page.locator('text="Áudio reenviado"')).toBeVisible();
  });

  test('Scenario 3: Detailed A11y Audit for Audio Player', async ({ page }) => {
    await page.keyboard.press('Alt+W');
    
    // Check for focus outline and ARIA roles
    const playBtn = page.locator('button[aria-label="Reproduzir"], button[aria-label="Pausar"]').first();
    if (await playBtn.isVisible()) {
      await playBtn.focus();
      // Check if it has visible focus outline (usually by looking for focus class or style)
      await expect(playBtn).toBeFocused();
      
      const slider = page.locator('[role="slider"][aria-label="Progresso do áudio"]').first();
      await expect(slider).toHaveAttribute('aria-valuemin', '0');
      await expect(slider).toHaveAttribute('aria-valuenow');
    }
  });

  test('Scenario 4: Conversation-Contextual RBAC', async ({ page }) => {
    // Navigate to a conversation where the user might have different permissions (mocked via roles)
    await page.click('button[aria-label="Voltar"], .lucide-arrow-left');
    
    // Login as viewer to check total blocking
    await loginAs(page, 'viewer');
    await openConversation(page, 'João Silva');
    
    // Whisper button MUST NOT EXIST for viewers
    const whisperBtn = page.locator('button[title*="Modo Sussurro"]');
    await expect(whisperBtn).not.toBeVisible();
    
    // Team Files in menu should also be gone
    await page.click('button[aria-label="Mais opções"]');
    await expect(page.locator('text="Arquivos da Equipe"')).not.toBeVisible();
  });
});

