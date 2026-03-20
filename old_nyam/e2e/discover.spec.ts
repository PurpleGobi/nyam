import { test, expect } from "@playwright/test"
import { authenticateTestUser } from "./helpers/auth"

test.describe("Discover Page", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateTestUser(page)
    await page.goto("/discover")
    await page.waitForLoadState("networkidle")
  })

  test("discover page loads without redirect", async ({ page }) => {
    expect(page.url()).toContain("/discover")
  })

  test("search bar visible", async ({ page }) => {
    const searchInput = page.getByPlaceholder("맛집, 메뉴, 와인 검색")
    await expect(searchInput).toBeVisible()
  })

  test("AI recommendation banner visible", async ({ page }) => {
    await expect(page.getByText("AI 맞춤 추천")).toBeVisible()
  })

  test("empty state or results shown", async ({ page }) => {
    // Either shows records or empty state
    const emptyState = page.getByText("아직 공개된 기록이 없어요")
    const trendingLabel = page.getByText("인기 기록")
    const hasEmpty = await emptyState.isVisible().catch(() => false)
    const hasTrending = await trendingLabel.isVisible().catch(() => false)
    expect(hasEmpty || hasTrending).toBeTruthy()
  })
})
