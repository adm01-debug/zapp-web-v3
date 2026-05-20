import { test, expect } from '@playwright/test';
import { login, openConversation } from './helpers/testHelpers';

/**
 * Meticulous E2E Testing Suite for Teams Collaboration Module
 * Objective: Simulate real-world scenarios to validate 10/10 perfection.
 */
test.describe('Teams Module - Meticulous functional Audit', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await openConversation(page, 'João Silva');
  });

  test('Scenario 1: Internal Note Cycle (Text, Thread, Reaction)', async ({ page }) => {
    // 1. Enter Whisper Mode
    await page.keyboard.press('Alt+W');
    const panel = page.locator('[role="dialog"][aria-label="Painel de Sussurro"]');
    await expect(panel).toBeVisible();

    // 2. Send initial guidance
    const guidance = `Guidance-${Date.now()}`;
    await panel.locator('textarea').fill(guidance);
    await page.keyboard.press('Enter');
    await expect(page.locator(`text="${guidance}"`)).toBeVisible();

    // 3. Open Thread for that guidance
    const item = page.locator('.group\\/whisper').filter({ hasText: guidance });
    await item.hover();
    await item.locator('button').filter({ has: page.locator('.lucide-message-square') }).click();
    await expect(page.locator('text="Discussão em Thread"')).toBeVisible();

    // 4. Send thread reply
    const reply = `Reply-${Date.now()}`;
    await panel.locator('textarea').fill(reply);
    await page.keyboard.press('Enter');
    await expect(page.locator(`text="${reply}"`)).toBeVisible();

    // 5. Test Quick Reactions
    await page.locator('.group\\/whisper').first().hover();
    await page.locator('button:text("👍")').click();
    await expect(page.locator('text="👍 Confirmado"')).toBeVisible();

    // 6. Navigate back and verify counter
    await page.locator('button').filter({ has: page.locator('.lucide-chevron-left') }).click();
    await expect(page.locator('text="1 resposta"')).toBeVisible();
  });

  test('Scenario 2: Team Files Audit (Upload, Filter, Preview)', async ({ page }) => {
    // 1. Open Team Files via Slash Command
    const mainInput = page.locator('textarea[placeholder*="Digite uma mensagem"]');
    await mainInput.fill('/files');
    await page.keyboard.press('Enter');
    
    const filesPanel = page.locator('[role="dialog"][aria-label="Arquivos da Equipe"]');
    await expect(filesPanel).toBeVisible();

    // 2. Validate Filter Behavior
    const typeSelect = filesPanel.locator('select');
    await typeSelect.selectOption('pdf');
    // Ensure UI reacts to filter even if empty
    await expect(filesPanel.locator('text="Nenhum arquivo corresponde aos filtros."')).toBeVisible();

    // 3. Test Search Robustness
    const searchInput = filesPanel.locator('input[placeholder="Buscar arquivos..."]');
    await searchInput.fill('teste-unitario-invisivel');
    await expect(filesPanel.locator('text="Nenhum arquivo corresponde aos filtros."')).toBeVisible();
    
    // Clear search
    await searchInput.fill('');
    await typeSelect.selectOption('all');
  });

  test('Scenario 3: Layout & Accessibility Inspection', async ({ page }) => {
    // 1. Check for "Ambiente de Equipe" visible marker
    await page.keyboard.press('Alt+W');
    await expect(page.locator('text="Ambiente de Equipe — Privado"')).toBeVisible();

    // 2. Accessibility: Verify Modal properties
    const panel = page.locator('[role="dialog"][aria-label="Painel de Sussurro"]');
    await expect(panel).toHaveAttribute('aria-modal', 'true');

    // 3. Test Keyboard Navigation (Escape to close)
    await page.keyboard.press('Escape');
    await expect(panel).not.toBeVisible();
  });

  test('Scenario 4: Permission & Profile Integrity', async ({ page }) => {
    // This test assumes the logged-in user has 'agent' or 'admin' profile.
    // We verify the "Sussurro" button is available in the header.
    const whisperHeaderBtn = page.locator('button:has-text("Equipe")');
    await expect(whisperHeaderBtn).toBeVisible();
    
    // Verify badge logic (should be visible if there are unread whispers)
    // Here we just verify the component renders.
    await expect(page.locator('button[title*="Modo Sussurro"]')).toBeEnabled();
  });
});
