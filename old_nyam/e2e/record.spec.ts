import { test, expect } from "@playwright/test"
import { authenticateTestUser } from "./helpers/auth"

test.describe("Record Page (Quick Capture)", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateTestUser(page)
    await page.goto("/record")
    await page.waitForLoadState("networkidle")
  })

  test("record page loads without redirect", async ({ page }) => {
    expect(page.url()).toContain("/record")
  })

  test("rating section visible", async ({ page }) => {
    await expect(page.getByText("평가")).toBeVisible()
  })

  test("comment textarea visible", async ({ page }) => {
    const textarea = page.getByPlaceholder("한줄 메모 (선택)")
    await expect(textarea).toBeVisible()
  })

  test("save button visible", async ({ page }) => {
    await expect(page.getByText("저장하기")).toBeVisible()
  })
})
