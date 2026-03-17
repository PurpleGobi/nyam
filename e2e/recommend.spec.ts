import { test, expect } from "@playwright/test"
import { authenticateTestUser } from "./helpers/auth"

test.describe("Recommend Page", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateTestUser(page)
    await page.goto("/recommend")
    await page.waitForLoadState("networkidle")
  })

  test("recommend page loads without redirect", async ({ page }) => {
    expect(page.url()).toContain("/recommend")
  })

  test("taste DNA section visible", async ({ page }) => {
    await expect(page.getByText("나의 Taste DNA")).toBeVisible()
  })

  test("scene selection visible", async ({ page }) => {
    await expect(page.getByText("상황 선택")).toBeVisible()
  })

  test("recommend button visible", async ({ page }) => {
    await expect(page.getByText("추천 받기")).toBeVisible()
  })

  test("location button visible", async ({ page }) => {
    await expect(page.getByText("내 위치")).toBeVisible()
  })
})
