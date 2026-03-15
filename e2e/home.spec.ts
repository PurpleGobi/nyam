import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should render greeting and situation buttons', async ({ page }) => {
    await page.goto('/');

    // Header
    await expect(page.locator('header')).toContainText('nyam');

    // Greeting section should be visible (use main to scope away from header h1)
    await expect(page.locator('main').getByRole('heading', { level: 1 })).toBeVisible();

    // Situation buttons
    await expect(page.getByText('어떤 상황인가요?')).toBeVisible();
    await expect(page.getByText('비즈니스 점심')).toBeVisible();
    await expect(page.getByText('데이트')).toBeVisible();
    await expect(page.getByText('혼밥')).toBeVisible();

    // Recent restaurants section
    await expect(page.getByText('최근 검증된 맛집')).toBeVisible();
  });

  test('situation button should navigate to explore', async ({ page }) => {
    await page.goto('/');
    await page.getByText('비즈니스 점심').click();
    await expect(page).toHaveURL(/\/explore\?situation=business-lunch/);
  });
});
