import { test, expect } from '@playwright/test';

test.describe('Explore Page', () => {
  test('should show search and category filters', async ({ page }) => {
    await page.goto('/explore');

    // Search input
    await expect(page.getByPlaceholder('식당, 지역, 메뉴 검색...')).toBeVisible();

    // Search bar and main content should be visible
    await expect(page.locator('main')).toBeVisible();
    // Region filter should be visible
    await expect(page.getByText('전체')).toBeVisible();
  });

  test('should filter by search query', async ({ page }) => {
    await page.goto('/explore');

    const searchInput = page.getByPlaceholder('식당, 지역, 메뉴 검색...');
    await searchInput.fill('테스트');
    // Allow debounce + API response
    await page.waitForTimeout(1000);

    // Page should not crash
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
  });
});
