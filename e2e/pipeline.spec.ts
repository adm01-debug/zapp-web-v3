import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/testHelpers';

test.describe('Pipeline Builder E2E', () => {
  test('Admin: can create and reorder stages', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/pipeline-builder');
    
    // Check if the page loads
    await expect(page.locator('h1:has-text("Pipeline")')).toBeVisible();
    
    // Test adding a stage
    const addStageBtn = page.getByRole('button', { name: /nova etapa/i }).first();
    if (await addStageBtn.isVisible()) {
      await addStageBtn.click();
      await page.getByLabel(/nome/i).fill('Fuzz Stage');
      await page.getByRole('button', { name: /salvar/i }).click();
      
      await expect(page.locator('text="Fuzz Stage"')).toBeVisible();
    }
    
    // Test drag and drop (simulated)
    const stages = page.locator('[data-testid="pipeline-stage"]');
    if (await stages.count() >= 2) {
      const first = stages.nth(0);
      const second = stages.nth(1);
      await first.dragTo(second);
      // Wait for auto-save notification
      await expect(page.locator('text="Ordem atualizada"')).toBeVisible();
    }
  });
});
