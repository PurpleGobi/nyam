import { test, expect } from "@playwright/test"
import { authenticateTestUser } from "./helpers/auth"

test.describe("Group Creation", () => {
  test("create a new bubble end-to-end", async ({ page }) => {
    // 1. Authenticate
    await authenticateTestUser(page)

    // 2. Navigate to groups page
    await page.goto("/groups")
    await page.waitForLoadState("networkidle")

    // Verify we're on the groups page (not redirected to login)
    expect(page.url()).toContain("/groups")

    // 3. Click the + button to open create modal
    const createBtn = page.locator("button").filter({ has: page.locator("svg.lucide-plus") })
    await expect(createBtn).toBeVisible({ timeout: 5000 })
    await createBtn.click()

    // 4. Verify modal is open
    const modalTitle = page.getByText("새 버블 만들기")
    await expect(modalTitle).toBeVisible({ timeout: 3000 })

    // 5. Fill in the form
    const nameInput = page.locator('input[placeholder="버블 이름"]')
    await expect(nameInput).toBeVisible()
    await nameInput.fill("테스트 버블 " + Date.now())

    const descInput = page.locator('textarea[placeholder="설명 (선택)"]')
    await descInput.fill("Playwright 자동 테스트로 생성된 버블입니다")

    // 6. Select public access type
    await page.getByRole("button", { name: "공개", exact: true }).click()

    // 7. Click 만들기 button
    const submitBtn = page.getByRole("button", { name: "만들기" })
    await expect(submitBtn).toBeEnabled()

    // Listen for console errors & network failures
    const errors: string[] = []
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text())
    })
    page.on("requestfailed", (req) => {
      errors.push(`Request failed: ${req.url()} ${req.failure()?.errorText}`)
    })

    // Intercept the Supabase insert request
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes("supabase.co") && res.url().includes("groups"),
      { timeout: 10000 },
    ).catch(() => null)

    await submitBtn.click()

    // 8. Wait for the response
    const response = await responsePromise

    if (response) {
      const status = response.status()
      console.log(`Supabase groups response status: ${status}`)

      if (status >= 400) {
        const body = await response.text().catch(() => "")
        console.log(`Supabase groups error body: ${body}`)
      }
    } else {
      console.log("No Supabase groups request intercepted within timeout")
    }

    // 9. Check for errors
    if (errors.length > 0) {
      console.log("Errors during creation:", errors)
    }

    // 10. Wait a bit and check if modal closed (success indicator)
    await page.waitForTimeout(3000)
    const modalStillVisible = await modalTitle.isVisible().catch(() => false)
    console.log(`Modal still visible after submit: ${modalStillVisible}`)

    // If modal is still visible, check for loading state
    if (modalStillVisible) {
      const loadingBtn = page.getByRole("button", { name: "만드는 중..." })
      const isStillLoading = await loadingBtn.isVisible().catch(() => false)
      console.log(`Still showing loading state: ${isStillLoading}`)
    }

    // Capture screenshot for debugging
    await page.screenshot({ path: "e2e/screenshots/group-create-result.png", fullPage: true })
  })
})
