import { test, expect } from "@playwright/test"
import { authenticateTestUser } from "./helpers/auth"

test.describe("Wrapped Page", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateTestUser(page)
    await page.goto("/wrapped")
    await page.waitForLoadState("networkidle")
  })

  test("wrapped page loads without redirect", async ({ page }) => {
    expect(page.url()).toContain("/wrapped")
  })

  test("shows wrapped content or empty state", async ({ page }) => {
    const wrappedTitle = page.getByText("Nyam Wrapped")
    const emptyMsg = page.getByText("올해 기록이 아직 없어요")
    const yearTitle = page.getByText(/\d{4} Nyam Wrapped/)

    const hasTitle = await wrappedTitle.isVisible().catch(() => false)
    const hasEmpty = await emptyMsg.isVisible().catch(() => false)
    const hasYear = await yearTitle.isVisible().catch(() => false)

    expect(hasTitle || hasEmpty || hasYear).toBeTruthy()
  })
})
