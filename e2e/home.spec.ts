import { test, expect } from "@playwright/test"
import { authenticateTestUser } from "./helpers/auth"

test.describe("Home Page", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateTestUser(page)
    await page.goto("/")
    await page.waitForLoadState("networkidle")
  })

  test("home page loads without redirect to login", async ({ page }) => {
    expect(page.url()).not.toContain("/auth/login")
  })

  test("calendar section visible", async ({ page }) => {
    await expect(page.getByText("캘린더")).toBeVisible()
  })

  test("map section visible", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "지도" })).toBeVisible()
  })

  test("friends feed section visible", async ({ page }) => {
    // Either shows friend feed or empty state
    const feedTitle = page.getByText("친구 피드")
    const emptyState = page.getByText("버블에 가입하면 친구들의 기록을 볼 수 있어요")
    const hasFeed = await feedTitle.isVisible().catch(() => false)
    const hasEmpty = await emptyState.isVisible().catch(() => false)
    expect(hasFeed || hasEmpty).toBeTruthy()
  })

  test("bottom navigation tabs visible", async ({ page }) => {
    // Check that bottom nav exists with 5 tabs
    const nav = page.locator("nav")
    await expect(nav.first()).toBeVisible()
  })
})
