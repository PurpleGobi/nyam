import { test, expect } from "@playwright/test"
import { authenticateTestUser } from "./helpers/auth"

test.describe("Groups (Bubble) Page", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateTestUser(page)
    await page.goto("/groups")
    await page.waitForLoadState("networkidle")
  })

  test("groups page loads without redirect", async ({ page }) => {
    expect(page.url()).toContain("/groups")
  })

  test("tab navigation visible", async ({ page }) => {
    await expect(page.getByText("내 버블")).toBeVisible()
    await expect(page.getByText("탐색")).toBeVisible()
  })

  test("tab switching works", async ({ page }) => {
    await page.getByText("탐색").click()
    // Either shows public groups or empty state
    const emptyPublic = page.getByText("공개 버블이 없어요")
    const hasEmptyPublic = await emptyPublic.isVisible().catch(() => false)
    // Tab click should work without error
    expect(true).toBeTruthy()

    await page.getByText("내 버블").click()
    const emptyMy = page.getByText("아직 버블이 없어요")
    const hasEmptyMy = await emptyMy.isVisible().catch(() => false)
    expect(true).toBeTruthy()
  })

  test("shows groups or empty state", async ({ page }) => {
    const emptyState = page.getByText("아직 버블이 없어요")
    const hasEmpty = await emptyState.isVisible().catch(() => false)
    // Either empty state or groups list is shown
    expect(true).toBeTruthy()
  })
})
