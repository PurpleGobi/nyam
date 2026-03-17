import { test, expect } from "@playwright/test"
import { authenticateTestUser } from "./helpers/auth"

test.describe("Compatibility Page", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateTestUser(page)
    await page.goto("/compatibility")
    await page.waitForLoadState("networkidle")
  })

  test("compatibility page loads without redirect", async ({ page }) => {
    expect(page.url()).toContain("/compatibility")
  })

  test("compatibility title visible", async ({ page }) => {
    await expect(page.getByText("맛 궁합 매칭")).toBeVisible()
  })

  test("shows members or empty state", async ({ page }) => {
    // Either shows member search or empty state about joining bubbles
    const emptyMsg = page.getByText("버블에 가입하면 멤버들과 맛 궁합을 비교할 수 있어요")
    const searchInput = page.getByPlaceholder("멤버 검색")
    const checkBtn = page.getByText("궁합 확인하기")

    const hasEmpty = await emptyMsg.isVisible().catch(() => false)
    const hasSearch = await searchInput.isVisible().catch(() => false)
    const hasBtn = await checkBtn.isVisible().catch(() => false)

    expect(hasEmpty || hasSearch || hasBtn).toBeTruthy()
  })
})
