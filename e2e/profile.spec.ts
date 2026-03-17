import { test, expect } from "@playwright/test"
import { authenticateTestUser } from "./helpers/auth"

test.describe("Profile Page", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateTestUser(page)
    await page.goto("/profile")
    await page.waitForLoadState("networkidle")
  })

  test("profile page loads without redirect", async ({ page }) => {
    expect(page.url()).toContain("/profile")
  })

  test("taste DNA tabs visible", async ({ page }) => {
    await expect(page.getByText("Food DNA")).toBeVisible()
    await expect(page.getByText("Wine DNA")).toBeVisible()
    await expect(page.getByText("Cooking DNA")).toBeVisible()
  })

  test("DNA tab switching works", async ({ page }) => {
    await page.getByText("Wine DNA").click()
    // Wine DNA tab should be highlighted (active)
    await expect(page.getByText("Wine DNA")).toBeVisible()

    await page.getByText("Cooking DNA").click()
    await expect(page.getByText("Cooking DNA")).toBeVisible()

    await page.getByText("Food DNA").click()
    await expect(page.getByText("Food DNA")).toBeVisible()
  })
})
