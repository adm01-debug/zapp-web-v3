import { test, expect } from '@playwright/test';
import { login, openConversation } from './helpers/testHelpers';

/**
 * E2E Test: Chat Advanced Features - Resilience, Permissions & Responsive
 * Covers: Permissions, Error States, Retries, Draft persistence and Mobile Layout.
 */
test.describe('Chat Advanced Features - Permissions & Resilience', () => {
  
  test.describe('Permissões por Perfil', () => {
    test('agente comum não deve ver botão de gerenciar figurinhas/memes se restrito', async ({ page }) => {
      // Login como agente (assumindo que o mock do profile venha via API/Session)
      await login(page, 'agente@zappweb.com', 'agente123');
      await openConversation(page, 'João Silva');
      
      await page.keyboard.press('Control+Shift+S');
      const picker = page.locator('[role="dialog"], [data-testid="sticker-picker"]');
      
      // Botão de upload/gerenciamento não deve estar visível para agente comum
      const uploadBtn = picker.locator('button[aria-label*="upload"], button:has-text("Adicionar")');
      await expect(uploadBtn).not.toBeVisible();
    });

    test('admin deve ter acesso total a gerenciamento de mídia interativa', async ({ page }) => {
      await login(page, 'admin@zappweb.com', 'admin123');
      await openConversation(page, 'João Silva');
      
      await page.keyboard.press('Control+Shift+S');
      const uploadBtn = page.locator('button[aria-label*="upload"], button:has-text("Adicionar")').first();
      await expect(uploadBtn).toBeVisible();
    });
  });

  test.describe('Resiliência e Erros', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
      await openConversation(page, 'João Silva');
    });

    test('deve mostrar erro e permitir retry ao falhar envio de figurinha', async ({ page }) => {
      // Forçar falha
      await page.evaluate(() => localStorage.setItem('debug_chat_failure_rate', '1.0'));
      
      await page.keyboard.press('Control+Shift+S');
      await page.locator('[role="gridcell"], .sticker-item').first().click();
      
      const errorBanner = page.locator('text=Falha ao enviar');
      await expect(errorBanner).toBeVisible({ timeout: 5000 });
      
      const retryBtn = page.locator('button:has-text("Reenviar")');
      await expect(retryBtn).toBeVisible();
      
      // Remove falha e tenta de novo
      await page.evaluate(() => localStorage.setItem('debug_chat_failure_rate', '0.0'));
      await retryBtn.click();
      
      await expect(errorBanner).not.toBeVisible();
      await page.evaluate(() => localStorage.removeItem('debug_chat_failure_rate'));
    });
  });

  test.describe('Persistência de Rascunhos (Drafts)', () => {
    test('rascunho deve ser preservado ao navegar entre figurinhas e conversas', async ({ page }) => {
      await login(page);
      await openConversation(page, 'João Silva');
      
      const input = page.locator('textarea[placeholder*="Digite"]').first();
      await input.fill('Texto persistente');
      
      // Abre seletor de figurinhas
      await page.keyboard.press('Control+Shift+S');
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      
      // Troca de conversa
      await page.locator('[data-testid="conversation-item"]').nth(1).click();
      await expect(input).toHaveValue(''); // Conversa nova, input vazio
      
      // Volta para a conversa original
      await page.locator('[data-testid="conversation-item"]:has-text("João Silva")').click();
      await expect(input).toHaveValue('Texto persistente');
      
      // Seletor de figurinhas deve fechar ao trocar de contexto, mas rascunho fica
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    });
  });

  test.describe('Responsividade e Layout Compacto', () => {
    test.use({ viewport: { width: 375, height: 812 } }); // iPhone 12/13 size

    test('seletor de figurinhas deve ser usável em telas mobile', async ({ page }) => {
      await login(page);
      await openConversation(page, 'João Silva');
      
      await page.keyboard.press('Control+Shift+S');
      const picker = page.locator('[role="dialog"]');
      
      // Em mobile o seletor geralmente é um Drawer (vaul) ou ocupa mais espaço
      const box = await picker.boundingBox();
      expect(box?.width).toBeGreaterThan(300);
      
      // Itens devem ser clicáveis
      const firstItem = picker.locator('[role="gridcell"]').first();
      await expect(firstItem).toBeVisible();
      await firstItem.tap(); // Simula toque
    });

    test('layout compacto não deve quebrar botões interativos', async ({ page }) => {
      await login(page);
      // Ativa modo compacto no header se disponível
      const compactBtn = page.locator('button[aria-label*="compacto"], .density-toggle');
      if (await compactBtn.isVisible()) await compactBtn.click();
      
      await openConversation(page, 'João Silva');
      
      // Envia uma interativa fictícia
      const input = page.locator('textarea[placeholder*="Mensagem"]').first();
      await input.fill('/buttons');
      await page.keyboard.press('Enter');
      
      const buttons = page.locator('button:has-text("Confirmar")');
      await expect(buttons).toBeVisible();
      
      // Verifica alinhamento (não deve estar sobreposto)
      const box = await buttons.boundingBox();
      expect(box?.height).toBeGreaterThan(20);
    });
  });
});
