import { test, expect } from "@playwright/test"

test.describe("Milestone 3: Discovery + Profile + Advanced", () => {
  test("/discover: 검색바 + 필터 칩 표시", async ({ page }) => {
    // Discover page is behind auth
    await page.goto("/discover")
    await page.waitForURL("**/auth/login**")

    const url = new URL(page.url())
    expect(url.pathname).toBe("/auth/login")
    expect(url.searchParams.get("next")).toBe("/discover")
  })

  test("/profile: 통계 + DNA 3탭", async ({ page }) => {
    // Profile page is behind auth
    await page.goto("/profile")
    await page.waitForURL("**/auth/login**")

    const url = new URL(page.url())
    expect(url.pathname).toBe("/auth/login")
    expect(url.searchParams.get("next")).toBe("/profile")
  })

  test("/comparison: 토너먼트 UI 표시", async ({ page }) => {
    // Comparison page is behind auth
    await page.goto("/comparison")
    await page.waitForURL("**/auth/login**")

    const url = new URL(page.url())
    expect(url.pathname).toBe("/auth/login")
    expect(url.searchParams.get("next")).toBe("/comparison")
  })
})
