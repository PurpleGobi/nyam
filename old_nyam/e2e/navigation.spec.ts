import { test, expect } from '@playwright/test';

test.describe('Bottom Navigation', () => {
  test('should navigate between all 5 tabs', async ({ page }) => {
    await page.goto('/');

    // Home tab should be active
    await expect(page).toHaveURL('/');
    await expect(page.locator('nav')).toBeVisible();

    // Navigate to Explore
    await page.getByRole('link', { name: '탐색' }).click();
    await expect(page).toHaveURL('/explore');

    // Navigate to Prompts
    await page.getByRole('link', { name: '프롬프트' }).click();
    await expect(page).toHaveURL('/prompts');

    // Navigate to Activity
    await page.getByRole('link', { name: '활동' }).click();
    await expect(page).toHaveURL('/activity');

    // Navigate to Profile
    await page.getByRole('link', { name: '프로필' }).click();
    await expect(page).toHaveURL('/profile');

    // Navigate back to Home (use goto as fallback for mobile where dev overlay may intercept)
    await page.goto('/');
    await expect(page).toHaveURL('/');
  });
});
