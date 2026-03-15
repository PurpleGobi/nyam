import { test, expect } from '@playwright/test';

test.describe('Auth', () => {
  test('login page should show sign-in buttons', async ({ page }) => {
    await page.goto('/auth/login');

    await expect(page.locator('main').getByText('nyam')).toBeVisible();
    await expect(page.getByText('카카오로 시작하기')).toBeVisible();
    await expect(page.getByText('Google로 시작하기')).toBeVisible();
  });

  test('activity page should show login prompt for unauthenticated users', async ({ page }) => {
    await page.goto('/activity');

    await expect(page.getByText('로그인이 필요해요')).toBeVisible();
  });

  test('profile page should show login prompt for unauthenticated users', async ({ page }) => {
    await page.goto('/profile');

    await expect(page.getByText('로그인하고 시작해보세요')).toBeVisible();
  });
});
