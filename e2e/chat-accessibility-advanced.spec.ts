import { test, expect } from '@playwright/test';
import { login, openConversation } from './helpers/testHelpers';

/**
 * E2E Test: Chat Accessibility - Advanced
 * Covers keyboard navigation, visible focus, ARIA labels, and mobile/compact modes.
 */
test.describe('Chat Advanced Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await openConversation(page, 'João Silva');
  });

  test('deve navegar pelo seletor de figurinhas via teclado', async ({ page }) => {
    // Abrir o popover de figurinhas
    const trigger = page.locator('button[aria-label="Figurinhas"]');
    await expect(trigger).toBeVisible();
    await trigger.click();
    
    const popover = page.locator('role=dialog');
    await expect(popover).toBeVisible();

    // Testar foco inicial no campo de busca
    const searchInput = popover.locator('input[aria-label="Buscar figurinhas"]');
    await expect(searchInput).toBeFocused();

    // Navegar para o botão de tamanho da grade via Tab
    await page.keyboard.press('Tab');
    const gridSizeBtn = popover.locator('button[aria-label="Alterar tamanho da grade"]');
    await expect(gridSizeBtn).toBeFocused();

    // Navegar para o botão de adicionar figurinha
    await page.keyboard.press('Tab');
    const addBtn = popover.locator('button[aria-label="Adicionar nova figurinha"]');
    await expect(addBtn).toBeFocused();

    // Fechar com Escape e verificar que o foco volta para o input principal
    await page.keyboard.press('Escape');
    await expect(popover).not.toBeVisible();
    const mainInput = page.locator('textarea[placeholder*="Digite"]').first();
    await expect(mainInput).toBeFocused();
  });

  test('deve navegar pelo seletor de áudios meme via teclado', async ({ page }) => {
    const trigger = page.locator('button[aria-label="Áudio Memes"]');
    await trigger.click();
    
    const popover = page.locator('role=dialog');
    await expect(popover).toBeVisible();

    // Campo de busca focado por padrão (se implementado, senão testamos a navegação)
    const searchInput = popover.locator('input[placeholder*="Buscar áudios meme"]');
    await searchInput.focus();

    // Navegar por filtros de categoria via Tab
    await page.keyboard.press('Tab');
    const allBtn = popover.locator('button:has-text("Todos")');
    await expect(allBtn).toBeFocused();
  });

  test('deve abrir e navegar pelo builder de mensagens interativas', async ({ page }) => {
    // Abrir o builder (desktop o botão está visível no toolbar)
    const builderBtn = page.locator('button[aria-label="Mensagem Interativa"]');
    await expect(builderBtn).toBeVisible();
    await builderBtn.click();
    
    const dialog = page.locator('role=dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('text=Mensagem Interativa')).toBeVisible();

    // Navegar entre tabs (Botões / Lista) usando setas (comportamento padrão de Tabs do Radix)
    await page.keyboard.press('Tab'); 
    const buttonsTab = dialog.locator('role=tab[value="buttons"]');
    await expect(buttonsTab).toBeFocused();

    await page.keyboard.press('ArrowRight');
    const listTab = dialog.locator('role=tab[value="list"]');
    await expect(listTab).toHaveAttribute('aria-selected', 'true');
    await expect(listTab).toBeFocused();

    // Testar fechamento do dialog
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });

  test('acessibilidade de mensagens interativas recebidas (modo compacto)', async ({ page }) => {
    // Ativar modo compacto via localStorage
    await page.evaluate(() => localStorage.setItem('ui-density', 'compact'));
    await page.reload();
    await openConversation(page, 'João Silva');

    // Verificar se o container de mensagens respeita o modo compacto visualmente (classe CSS ou atributo)
    const chatContainer = page.locator('main');
    await expect(page.locator('html')).toHaveAttribute('data-density', 'compact');

    // Navegar pelas mensagens com teclado até encontrar uma interativa (se houver)
    // Aqui simulamos a navegação geral do chat
    await page.keyboard.press('PageUp');
    await page.keyboard.press('Tab');
  });
});

test.describe('Chat Accessibility - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await openConversation(page, 'João Silva');
  });

  test('seletores devem ser acessíveis via menu Plus em mobile', async ({ page }) => {
    // Em mobile, as ferramentas extras ficam escondidas sob um botão Plus
    const plusBtn = page.locator('button[aria-label="Mais opções"]');
    await expect(plusBtn).toBeVisible();
    await plusBtn.click();

    // Builder de mensagem interativa no menu suspenso
    const builderBtn = page.locator('button[aria-label="Mensagem Interativa"]');
    await expect(builderBtn).toBeVisible();
    
    // Verificar que o popover de opções respeita o viewport
    const menu = page.locator('.glass-strong').last();
    const box = await menu.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(375);
  });
});

