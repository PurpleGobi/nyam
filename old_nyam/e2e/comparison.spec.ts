import { test, expect } from "@playwright/test"
import { authenticateTestUser } from "./helpers/auth"

test.describe("Comparison Page", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateTestUser(page)
    await page.goto("/comparison")
    await page.waitForLoadState("networkidle")
  })

  test("comparison page loads without redirect", async ({ page }) => {
    expect(page.url()).toContain("/comparison")
  })

  test("comparison game title visible", async ({ page }) => {
    await expect(page.getByText("비교 게임")).toBeVisible()
  })

  test("shows appropriate state based on records", async ({ page }) => {
    // Either insufficient records state, ready-to-start state, or active game
    const insufficientMsg = page.getByText("기록이 2개 이상 필요해요")
    const startBtn = page.getByText("시작하기")
    const goRecordBtn = page.getByText("기록하러 가기")

    const hasInsufficient = await insufficientMsg.isVisible().catch(() => false)
    const hasStart = await startBtn.isVisible().catch(() => false)
    const hasGoRecord = await goRecordBtn.isVisible().catch(() => false)

    // One of these states should be visible
    expect(hasInsufficient || hasStart || hasGoRecord).toBeTruthy()
  })
})
