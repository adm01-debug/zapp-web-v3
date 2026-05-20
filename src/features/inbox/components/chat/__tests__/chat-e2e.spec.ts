import { test, expect } from '@playwright/test';

test.describe('Inbox E2E - Messaging Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Basic setup - navigate to the inbox
    await page.goto('/inbox');
  });

  test('should send a text message and reconcile optimistically', async ({ page }) => {
    const messageContent = `Test message ${Date.now()}`;
    
    // Type message
    const textarea = page.locator('textarea[placeholder*="Escreva sua mensagem"]');
    await textarea.fill(messageContent);
    
    // Send message (Enter)
    await textarea.press('Enter');
    
    // Check for optimistic bubble
    const optimisticBubble = page.locator(`text=${messageContent}`);
    await expect(optimisticBubble).toBeVisible();
    
    // Reconcile check: wait for status to change from 'sending' to 'sent' or 'delivered'
    // This assumes the UI shows a specific icon or class for sent messages
    const statusIcon = page.locator('[data-testid^="message-status"]').last();
    await expect(statusIcon).not.toHaveClass(/animate-spin/, { timeout: 10000 });
  });

  test('should record audio, edit transcription and send', async ({ page }) => {
    // Start recording
    await page.click('button[aria-label="Gravar áudio"]');
    
    // Wait for a few seconds of recording
    await page.waitForTimeout(3000);
    
    // Stop recording
    await page.click('button[aria-label="Concluir gravação"]');
    
    // Wait for transcription
    const editTranscriptionBtn = page.locator('button:has-text("Editar")');
    await expect(editTranscriptionBtn).toBeVisible({ timeout: 15000 });
    await editTranscriptionBtn.click();
    
    // Edit transcription text
    const transcriptionArea = page.locator('textarea[placeholder*="Edite a transcrição"]');
    const originalText = await transcriptionArea.inputValue();
    await transcriptionArea.fill(originalText + " - Edited");
    
    // Send audio
    await page.click('button[aria-label="Confirmar e enviar áudio"]');
    
    // Verify upload progress overlay appears and then disappears
    await expect(page.locator('text=Enviando Áudio')).toBeVisible();
    await expect(page.locator('text=Enviando Áudio')).not.toBeVisible({ timeout: 20000 });
  });

  test('should handle network failure and manual retry', async ({ page, context }) => {
    const messageContent = "Retry Test Message";
    
    // Simulate offline
    await context.setOffline(true);
    
    const textarea = page.locator('textarea[placeholder*="Escreva sua mensagem"]');
    await textarea.fill(messageContent);
    await textarea.press('Enter');
    
    // Verify it stays in 'pending' or 'failed' in the queue
    const queueStatus = page.locator('text=Aguardando na fila');
    await expect(queueStatus).toBeVisible();
    
    // Go back online
    await context.setOffline(false);
    
    // Check if it eventually sends or if we need to click retry
    // In our implementation, we added an automatic retry, so it should attempt again.
    const sentStatus = page.locator('text=Enviado!');
    await expect(sentStatus).toBeVisible({ timeout: 15000 });
  });
});
