import { test, expect } from "@playwright/test"
import { authenticateTestUser } from "./helpers/auth"

test.describe("Notifications Page", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateTestUser(page)
    await page.goto("/notifications")
    await page.waitForLoadState("networkidle")
  })

  test("notifications page loads without redirect", async ({ page }) => {
    expect(page.url()).toContain("/notifications")
  })

  test("shows notifications or empty state", async ({ page }) => {
    // Either shows notification items or empty state
    const emptyTitle = page.getByText("알림이 없어요")
    const emptyDesc = page.getByText("새로운 소식이 오면 여기에 표시돼요")
    const unreadHeader = page.getByText(/읽지 않은 알림/)

    const hasEmpty = await emptyTitle.isVisible().catch(() => false)
    const hasUnread = await unreadHeader.isVisible().catch(() => false)

    // One of these should be true
    expect(hasEmpty || hasUnread).toBeTruthy()
  })
})
