import type { Page } from "@playwright/test"

/**
 * Navigate to the login page.
 * Real OAuth flow cannot be tested in E2E, so this helper simply
 * ensures the browser lands on /auth/login where social buttons are visible.
 */
export async function loginAsTestUser(page: Page): Promise<void> {
  await page.goto("/auth/login")
  await page.waitForURL("**/auth/login**")
}

/**
 * Stub for mocking auth state.
 *
 * In a real setup this would inject Supabase session cookies so that the
 * middleware considers the user authenticated. For now it is a no-op
 * placeholder — tests that require an authenticated session should be
 * skipped or should verify the redirect-to-login behaviour instead.
 */
export async function mockAuthState(page: Page): Promise<void> {
  // TODO: Implement cookie-based session injection when test infrastructure
  //       supports a dedicated test user (e.g. via Supabase service_role).
  void page
}
