import { test, expect } from '@playwright/test';

test.describe('Explore Page', () => {
  test('should show search and category filters', async ({ page }) => {
    await page.goto('/explore');

    // Search input
    await expect(page.getByPlaceholder('맛집 이름으로 검색...')).toBeVisible();

    // Category filter chips should be visible
    await expect(page.getByText('한식')).toBeVisible();
    await expect(page.getByText('일식')).toBeVisible();
    await expect(page.getByText('중식')).toBeVisible();
    await expect(page.getByText('양식')).toBeVisible();
  });

  test('should filter by search query', async ({ page }) => {
    await page.goto('/explore');

    const searchInput = page.getByPlaceholder('맛집 이름으로 검색...');
    await searchInput.fill('테스트');
    // Allow debounce
    await page.waitForTimeout(500);

    // Page should not crash
    await expect(page.locator('main')).toBeVisible();
  });
});
