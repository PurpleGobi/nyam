import { test, expect } from "@playwright/test"
import { authenticateTestUser, loginAsTestUser } from "./helpers/auth"

test.describe("Auth - Login Page", () => {
  test("login page renders logo and subtitle", async ({ page }) => {
    await loginAsTestUser(page)
    await expect(page.getByText("nyam")).toBeVisible()
    await expect(page.getByText("나만의 맛 기록을 시작하세요")).toBeVisible()
  })

  test("4 social login buttons visible", async ({ page }) => {
    await loginAsTestUser(page)
    await expect(page.getByText("카카오로 시작하기")).toBeVisible()
    await expect(page.getByText("네이버로 시작하기")).toBeVisible()
    await expect(page.getByText("Google로 시작하기")).toBeVisible()
    await expect(page.getByText("Apple로 시작하기")).toBeVisible()
  })

  test("terms agreement checkboxes visible", async ({ page }) => {
    await loginAsTestUser(page)
    await expect(page.getByText("전체 동의")).toBeVisible()
    await expect(page.getByText("이용약관 동의 (필수)")).toBeVisible()
    await expect(page.getByText("개인정보처리방침 동의 (필수)")).toBeVisible()
  })

  test("buttons disabled before terms agreement", async ({ page }) => {
    await loginAsTestUser(page)
    const kakaoButton = page.getByText("카카오로 시작하기")
    await expect(kakaoButton).toBeDisabled()
  })

  test("buttons enabled after agreeing to all terms", async ({ page }) => {
    await loginAsTestUser(page)
    await page.getByText("전체 동의").click()
    await expect(page.getByText("카카오로 시작하기")).toBeEnabled()
    await expect(page.getByText("네이버로 시작하기")).toBeEnabled()
    await expect(page.getByText("Google로 시작하기")).toBeEnabled()
    await expect(page.getByText("Apple로 시작하기")).toBeEnabled()
  })

  test("unauthenticated redirect to login with next param", async ({ page }) => {
    await page.goto("/profile")
    await page.waitForURL("**/auth/login**")
    const url = new URL(page.url())
    expect(url.pathname).toBe("/auth/login")
    expect(url.searchParams.get("next")).toBe("/profile")
  })

  test("all protected routes redirect to login", async ({ page }) => {
    const routes = ["/", "/discover", "/record", "/groups", "/profile", "/comparison", "/notifications", "/settings", "/wrapped", "/recommend"]
    for (const route of routes) {
      await page.goto(route)
      await page.waitForURL("**/auth/login**")
      await expect(page).toHaveURL(/\/auth\/login/)
    }
  })

  test("public routes accessible without auth", async ({ page }) => {
    await page.goto("/terms/service")
    await expect(page).toHaveURL(/\/terms\/service/)

    await page.goto("/terms/privacy")
    await expect(page).toHaveURL(/\/terms\/privacy/)

    await page.goto("/offline")
    await expect(page).toHaveURL(/\/offline/)
  })

  test("authenticated user can access home", async ({ page }) => {
    await authenticateTestUser(page)
    await page.goto("/")
    // Should NOT redirect to login
    await page.waitForLoadState("networkidle")
    expect(page.url()).not.toContain("/auth/login")
  })

  test("mobile viewport (390x844) layout", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    })
    const page = await context.newPage()
    await page.goto("/auth/login")
    await page.waitForURL("**/auth/login**")

    await expect(page.getByText("nyam")).toBeVisible()
    await expect(page.getByText("카카오로 시작하기")).toBeVisible()

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(390)
    await context.close()
  })
})
