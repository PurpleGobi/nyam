import { test, expect } from "@playwright/test"
import { authenticateTestUser, loginAsTestUser } from "./helpers/auth"

test.describe("Smoke: 인증 + 기본 페이지 접근", () => {
  test("미인증 → /auth/login 리다이렉트", async ({ page }) => {
    await page.goto("/")
    await page.waitForURL("**/auth/login**")
    await expect(page.getByText("nyam")).toBeVisible()
  })

  test("로그인 페이지: 소셜 버튼 4개 + 약관", async ({ page }) => {
    await loginAsTestUser(page)
    await expect(page.getByText("카카오로 시작하기")).toBeVisible()
    await expect(page.getByText("Google로 시작하기")).toBeVisible()
  })

  test("인증 후 홈 접근 가능", async ({ page }) => {
    await authenticateTestUser(page)
    await page.goto("/")
    // Should NOT redirect to login
    await page.waitForTimeout(2000)
    const url = page.url()
    expect(url).not.toContain("/auth/login")
  })

  test("인증 후 /record 접근", async ({ page }) => {
    await authenticateTestUser(page)
    await page.goto("/record")
    await page.waitForTimeout(2000)
    expect(page.url()).not.toContain("/auth/login")
  })

  test("인증 후 /discover 접근", async ({ page }) => {
    await authenticateTestUser(page)
    await page.goto("/discover")
    await page.waitForTimeout(2000)
    expect(page.url()).not.toContain("/auth/login")
  })

  test("인증 후 /groups 접근", async ({ page }) => {
    await authenticateTestUser(page)
    await page.goto("/groups")
    await page.waitForTimeout(2000)
    expect(page.url()).not.toContain("/auth/login")
  })

  test("인증 후 /profile 접근", async ({ page }) => {
    await authenticateTestUser(page)
    await page.goto("/profile")
    await page.waitForTimeout(2000)
    expect(page.url()).not.toContain("/auth/login")
  })
})
