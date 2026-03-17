import { test, expect } from "@playwright/test"
import { authenticateTestUser } from "./helpers/auth"

test.describe("Settings Page", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateTestUser(page)
    await page.goto("/settings")
    await page.waitForLoadState("networkidle")
  })

  test("settings page loads without redirect", async ({ page }) => {
    expect(page.url()).toContain("/settings")
  })

  test("settings title visible", async ({ page }) => {
    await expect(page.getByText("설정")).toBeVisible()
  })

  test("account section visible", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "계정", exact: true })).toBeVisible()
  })

  test("appearance section visible", async ({ page }) => {
    await expect(page.getByText("테마")).toBeVisible()
  })

  test("notification settings visible", async ({ page }) => {
    await expect(page.getByText("푸시 알림")).toBeVisible()
  })

  test("privacy section visible", async ({ page }) => {
    await expect(page.getByText("이용약관")).toBeVisible()
    await expect(page.getByText("개인정보처리방침")).toBeVisible()
  })

  test("app version visible", async ({ page }) => {
    await expect(page.getByText("앱 버전")).toBeVisible()
  })

  test("logout button visible", async ({ page }) => {
    await expect(page.getByText("로그아웃")).toBeVisible()
  })

  test("account deletion button visible", async ({ page }) => {
    await expect(page.getByText("계정 탈퇴")).toBeVisible()
  })
})
