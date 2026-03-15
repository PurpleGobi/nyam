import { test, expect } from '@playwright/test';

test.describe('Prompts Page', () => {
  test('should show category tabs', async ({ page }) => {
    await page.goto('/prompts');

    await expect(page.getByText('AI 프롬프트')).toBeVisible();

    // Category tabs
    await expect(page.getByRole('button', { name: '전체' })).toBeVisible();
    await expect(page.getByRole('button', { name: '리뷰 검증' })).toBeVisible();
    await expect(page.getByRole('button', { name: '상황 추천' })).toBeVisible();
  });

  test('should switch categories', async ({ page }) => {
    await page.goto('/prompts');

    await page.getByRole('button', { name: '리뷰 검증' }).click();
    // Page should not crash
    await expect(page.locator('main')).toBeVisible();
  });
});
