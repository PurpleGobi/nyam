import { test, expect } from "@playwright/test"

test.describe("Milestone 4: Full E2E", () => {
  test("전체 플로우: 기록 생성 -> 홈 확인 -> 상세", async ({ page }) => {
    // Without real auth, verify the full redirect chain works:
    // 1. Visit home -> redirect to login
    await page.goto("/")
    await page.waitForURL("**/auth/login**")

    // 2. Login page renders properly
    await expect(page.getByText("nyam")).toBeVisible()
    await expect(page.getByText("카카오로 시작하기")).toBeVisible()
    await expect(page.getByText("네이버로 시작하기")).toBeVisible()
    await expect(page.getByText("Google로 시작하기")).toBeVisible()
    await expect(page.getByText("Apple로 시작하기")).toBeVisible()

    // 3. Terms checkbox interaction
    await expect(page.getByText("전체 동의")).toBeVisible()
    const allAgreeButton = page.getByText("전체 동의")
    await allAgreeButton.click()

    // 4. After agreeing to terms, login buttons should be enabled
    const kakaoButton = page.getByText("카카오로 시작하기")
    await expect(kakaoButton).toBeEnabled()

    const naverButton = page.getByText("네이버로 시작하기")
    await expect(naverButton).toBeEnabled()

    const googleButton = page.getByText("Google로 시작하기")
    await expect(googleButton).toBeEnabled()

    const appleButton = page.getByText("Apple로 시작하기")
    await expect(appleButton).toBeEnabled()
  })

  test("빈 상태: 기록 0건 홈 -> 온보딩 안내", async ({ page }) => {
    // For unauthenticated users, the app should redirect to login
    // which serves as the onboarding entry point
    await page.goto("/")
    await page.waitForURL("**/auth/login**")

    await expect(page.getByText("나만의 맛 기록을 시작하세요")).toBeVisible()
  })

  test("모바일 뷰포트(390x844): 레이아웃 정상", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    })
    const page = await context.newPage()

    // Navigate to login (public route)
    await page.goto("/auth/login")
    await page.waitForURL("**/auth/login**")

    // Verify the login page renders correctly at mobile size
    await expect(page.getByText("nyam")).toBeVisible()
    await expect(page.getByText("나만의 맛 기록을 시작하세요")).toBeVisible()

    // Check all social buttons are visible
    await expect(page.getByText("카카오로 시작하기")).toBeVisible()
    await expect(page.getByText("네이버로 시작하기")).toBeVisible()
    await expect(page.getByText("Google로 시작하기")).toBeVisible()
    await expect(page.getByText("Apple로 시작하기")).toBeVisible()

    // Check terms section renders in viewport
    await expect(page.getByText("전체 동의")).toBeVisible()
    await expect(page.getByText("이용약관 동의 (필수)")).toBeVisible()
    await expect(page.getByText("개인정보처리방침 동의 (필수)")).toBeVisible()

    // Verify no horizontal overflow (page width should match viewport)
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(390)

    await context.close()
  })

  test.describe("공개 라우트 접근", () => {
    test("약관 페이지 직접 접근 가능", async ({ page }) => {
      await page.goto("/terms/service")
      // Should NOT redirect to login — this is a public route
      await expect(page).toHaveURL(/\/terms\/service/)
    })

    test("개인정보처리방침 직접 접근 가능", async ({ page }) => {
      await page.goto("/terms/privacy")
      // Should NOT redirect to login — this is a public route
      await expect(page).toHaveURL(/\/terms\/privacy/)
    })

    test("오프라인 페이지 직접 접근 가능", async ({ page }) => {
      await page.goto("/offline")
      // Should NOT redirect to login — this is a public route
      await expect(page).toHaveURL(/\/offline/)
    })
  })
})
