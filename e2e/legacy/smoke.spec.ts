import { test, expect } from '@playwright/test';
import { TEST_USER, TEST_PASSWORD } from './test-config';

test.describe('Smoke Suite - Fluxos Críticos', () => {
  
  test('Login e Logout', async ({ page }) => {
    // 1. Navegar para login
    await page.goto('/auth');
    await expect(page).toHaveURL(/.*auth/);
    
    // 2. Preencher credenciais
    await page.fill('input[type="email"]', TEST_USER);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    
    // 3. Validar redirecionamento para Home/Dashboard
    await expect(page).toHaveURL('/', { timeout: 10000 });
    
    // 4. Logout
    // Assumindo que o botão de logout está no Sidebar
    await page.click('[aria-label="Configurações e Perfil"]');
    await page.click('text=Sair');
    
    // 5. Validar redirecionamento para login
    await expect(page).toHaveURL(/.*auth/);
  });

  test('Proteção de Rotas', async ({ page }) => {
    // Tentar acessar uma rota protegida deslogado
    await page.goto('/inbox');
    await expect(page).toHaveURL(/.*auth/);
    
    // Tentar acessar admin deslogado
    await page.goto('/admin/roles');
    await expect(page).toHaveURL(/.*auth/);
  });

  test('CRUD Departamentos (Fluxo Completo)', async ({ page }) => {
    // 1. Login
    await page.goto('/auth');
    await page.fill('input[type="email"]', TEST_USER);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
    
    // 2. Navegar para Departamentos
    await page.goto('/admin/departments');
    
    // 3. Criar
    const deptName = `Depto Teste ${Date.now()}`;
    await page.click('text=Novo Departamento');
    await page.fill('input[placeholder="Nome do departamento"]', deptName);
    await page.click('button:has-text("Criar")');
    
    // 4. Validar na lista
    await expect(page.locator(`text=${deptName}`)).toBeVisible();
    
    // 5. Editar
    await page.click(`tr:has-text("${deptName}") button[aria-label="Editar"]`);
    const updatedName = `${deptName} Editado`;
    await page.fill('input[placeholder="Nome do departamento"]', updatedName);
    await page.click('button:has-text("Salvar Alterações")');
    await expect(page.locator(`text=${updatedName}`)).toBeVisible();
    
    // 6. Deletar
    await page.click(`tr:has-text("${updatedName}") button[aria-label="Excluir"]`);
    await page.click('button:has-text("Confirmar Exclusão")');
    await expect(page.locator(`text=${updatedName}`)).not.toBeVisible();
  });

  test('Sincronização Realtime (Simulação)', async ({ page }) => {
    // 1. Login e Inbox
    await page.goto('/auth');
    await page.fill('input[type="email"]', TEST_USER);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.goto('/inbox');
    
    // 2. Aguardar lista de conversas carregar
    await page.waitForSelector('[role="listitem"]');
    
    // 3. Emitir evento via broadcast (simulando backend)
    // Usamos o console do navegador para interagir com o supabase client global se disponível
    // ou apenas validamos que mensagens enviadas aparecem instantaneamente.
    const testMsg = `Teste Realtime ${Date.now()}`;
    await page.fill('textarea[placeholder="Digite uma mensagem..."]', testMsg);
    await page.keyboard.press('Enter');
    
    // 4. Validar que a mensagem apareceu na UI sem reload
    await expect(page.locator(`text=${testMsg}`)).toBeVisible();
  });
});
