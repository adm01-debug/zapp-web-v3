import { test, expect } from './fixtures/auth';
import { MOCK_QR_CODE_RESPONSE, TEST_INSTANCE } from './fixtures/test-data';

test.describe('Conexão WhatsApp', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Mock da Evolution API — toda chamada de connect retorna QR fake
    await page.route('**/functions/v1/evolution-api**', async (route) => {
      const url = route.request().url();
      if (url.includes('/instance/connect') || url.includes('connect')) {
        return route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify(MOCK_QR_CODE_RESPONSE) });
      }
      if (url.includes('/instance/create')) {
        return route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ instance: { instanceName: TEST_INSTANCE, status: 'created' } }) });
      }
      return route.continue();
    });
  });

  test('cria instância e exibe QR code', async ({ authenticatedPage: page }) => {
    await page.goto('/admin/connections');
    // Acesso pode ser negado se o usuário não for admin
    if (page.url().includes('/auth') || page.url() === '/') {
      test.skip(true, 'Usuário de teste sem acesso admin a /admin/connections');
    }

    const newBtn = page.getByRole('button', { name: /nova conex|adicionar|criar/i }).first();
    await expect(newBtn).toBeVisible({ timeout: 10_000 });
    await newBtn.click();

    const nameInput = page.getByLabel(/nome|instance/i).first();
    await nameInput.fill(TEST_INSTANCE);

    await page.getByRole('button', { name: /criar|conectar|salvar/i }).first().click();

    // QR code aparece (img com src data:image)
    const qr = page.locator('img[src^="data:image"], canvas').first();
    await expect(qr).toBeVisible({ timeout: 15_000 });
  });
});
