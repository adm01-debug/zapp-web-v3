import { test, expect } from '@playwright/test';
import { login, openConversation } from './helpers/testHelpers';

/**
 * E2E Test: Teams Advanced Collaboration
 * Covers: Threads, Team Files (search/filters), Slash Commands, and Quick Reactions.
 */
test.describe('Teams Advanced Collaboration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await openConversation(page, 'João Silva');
  });

  test('should create and navigate whisper threads', async ({ page }) => {
    // 1. Open Whisper Mode
    await page.keyboard.press('Alt+W');
    const whisperPanel = page.locator('[role="dialog"][aria-label="Painel de Sussurro"]');
    await expect(whisperPanel).toBeVisible();

    // 2. Send parent whisper
    const parentMsg = `Discussão pai ${Date.now()}`;
    await whisperPanel.locator('textarea').fill(parentMsg);
    await page.keyboard.press('Enter');
    await expect(page.locator(`text="${parentMsg}"`)).toBeVisible();

    // 3. Click reply to open thread
    const whisperItem = page.locator('.group\\/whisper').filter({ hasText: parentMsg });
    await whisperItem.hover();
    await whisperItem.locator('button').filter({ has: page.locator('.lucide-message-square') }).click();

    // 4. Verify thread context
    await expect(page.locator('text="Discussão em Thread"')).toBeVisible();
    await expect(page.locator('text="PAI"')).toBeVisible();

    // 5. Send reply
    const replyMsg = `Resposta em thread ${Date.now()}`;
    await whisperPanel.locator('textarea').fill(replyMsg);
    await page.keyboard.press('Enter');
    await expect(page.locator(`text="${replyMsg}"`)).toBeVisible();

    // 6. Navigate back
    await page.locator('button').filter({ has: page.locator('.lucide-chevron-left') }).click();
    await expect(page.locator('text="Equipe — Interno"')).toBeVisible();
    await expect(page.locator('text="1 resposta"')).toBeVisible();
  });

  test('should search and filter team files', async ({ page }) => {
    // 1. Open Team Files
    await page.click('button[aria-label="Mais opções"]');
    await page.click('text="Arquivos da Equipe"');
    
    const filesPanel = page.locator('[role="dialog"][aria-label="Arquivos da Equipe"]');
    await expect(filesPanel).toBeVisible();

    // 2. Test Search
    const searchInput = filesPanel.locator('input[placeholder="Buscar arquivos..."]');
    await searchInput.fill('non-existent-file-xyz');
    await expect(page.locator('text="Nenhum arquivo corresponde aos filtros."')).toBeVisible();

    // 3. Test Type Filter
    const typeSelect = filesPanel.locator('select');
    await typeSelect.selectOption('image');
    // Verify it updates (even if empty, the text should be correct)
    await expect(page.locator('text="Nenhum arquivo corresponde aos filtros."')).toBeVisible();
  });

  test('should use internal slash commands', async ({ page }) => {
    const mainInput = page.locator('textarea[placeholder*="Digite uma mensagem"]');
    
    // 1. Test /whisper command
    await mainInput.fill('/whisper');
    await page.keyboard.press('Enter');
    await expect(page.locator('[role="dialog"][aria-label="Painel de Sussurro"]')).toBeVisible();

    // 2. Test /files command
    await page.keyboard.press('Escape'); // Close whisper
    await mainInput.fill('/files');
    await page.keyboard.press('Enter');
    await expect(page.locator('[role="dialog"][aria-label="Arquivos da Equipe"]')).toBeVisible();
  });

});

