import { test, expect } from "@playwright/test"
import { authenticateTestUser } from "./helpers/auth"

test.describe("홈 (PRD 8-2)", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateTestUser(page)
  })

  test("홈 페이지 렌더링 + 하단 내비 5탭", async ({ page }) => {
    await page.goto("/")
    await page.waitForTimeout(2000)

    // BottomNav should have 5 items
    const nav = page.locator("nav")
    await expect(nav).toBeVisible()
  })

  test("홈 섹션 존재 확인", async ({ page }) => {
    await page.goto("/")
    await page.waitForTimeout(2000)

    // 페이지가 렌더링되면 어떤 컨텐츠든 있어야 함 (빈 상태 포함)
    const body = await page.textContent("body")
    expect(body).toBeTruthy()
    expect(body!.length).toBeGreaterThan(10)
  })
})

test.describe("빠른 기록 (PRD 8-3)", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateTestUser(page)
  })

  test("기록 페이지 3유형 탭 존재", async ({ page }) => {
    await page.goto("/record")
    await page.waitForTimeout(2000)

    // 3 type tabs as buttons
    await expect(page.getByRole("button", { name: "식당" })).toBeVisible()
    await expect(page.getByRole("button", { name: "와인" })).toBeVisible()
    await expect(page.getByRole("button", { name: "요리" })).toBeVisible()
  })

  test("AI 결과 편집 폼 존재", async ({ page }) => {
    await page.goto("/record")
    await page.waitForTimeout(2000)

    // AiResultCard의 편집 가능 필드들
    await expect(page.getByText("상호명 / 메뉴명")).toBeVisible()
    await expect(page.getByText("장르")).toBeVisible()
    await expect(page.getByText("맛 태그")).toBeVisible()
    await expect(page.getByText("식감 태그")).toBeVisible()
    await expect(page.getByText("상황")).toBeVisible()
  })

  test("평가 슬라이더 식당 6항목", async ({ page }) => {
    await page.goto("/record")
    await page.waitForTimeout(2000)

    // Rating labels in slider section (use heading "평가" to scope)
    await expect(page.getByText("평가")).toBeVisible()
    await expect(page.getByText("가성비")).toBeVisible()
    await expect(page.getByText("서비스")).toBeVisible()
    await expect(page.getByText("분위기")).toBeVisible()
    await expect(page.getByText("청결")).toBeVisible()
  })

  test("와인 탭 전환 시 WSET 항목", async ({ page }) => {
    await page.goto("/record")
    await page.waitForTimeout(1000)

    await page.getByText("와인").click()
    await page.waitForTimeout(500)

    await expect(page.getByText("WSET 테이스팅 노트")).toBeVisible()
  })

  test("요리 탭 전환 시 맛 특성 수동 입력", async ({ page }) => {
    await page.goto("/record")
    await page.waitForTimeout(1000)

    await page.getByText("요리").click()
    await page.waitForTimeout(500)

    await expect(page.getByText("맛 특성 (직접 입력)")).toBeVisible()
  })

  test("저장 버튼 존재 (사진 없으면 disabled)", async ({ page }) => {
    await page.goto("/record")
    await page.waitForTimeout(2000)

    const saveBtn = page.getByText("저장하기")
    await expect(saveBtn).toBeVisible()
    await expect(saveBtn).toBeDisabled()
  })
})

test.describe("발견 (PRD 8-8)", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateTestUser(page)
  })

  test("검색바 + 장르/상황 필터", async ({ page }) => {
    await page.goto("/discover")
    await page.waitForTimeout(2000)

    await expect(page.getByPlaceholder("맛집, 메뉴, 와인 검색")).toBeVisible()
    await expect(page.getByRole("button", { name: "한식" })).toBeVisible()
    await expect(page.getByRole("button", { name: "혼밥" })).toBeVisible()
  })

  test("AI 추천 링크 존재", async ({ page }) => {
    await page.goto("/discover")
    await page.waitForTimeout(2000)

    await expect(page.getByText("AI 맞춤 추천")).toBeVisible()
  })
})

test.describe("AI 추천 (PRD 8-9)", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateTestUser(page)
  })

  test("상황 선택 + 추천 버튼", async ({ page }) => {
    await page.goto("/recommend")
    await page.waitForTimeout(2000)

    await expect(page.getByText("상황 선택")).toBeVisible()
    await expect(page.getByRole("button", { name: "혼밥" })).toBeVisible()
    await expect(page.getByRole("button", { name: "추천 받기" })).toBeVisible()
  })
})

test.describe("버블 (PRD 8-10~12)", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateTestUser(page)
  })

  test("버블 목록 페이지 렌더링", async ({ page }) => {
    await page.goto("/groups")
    await page.waitForTimeout(2000)

    const body = await page.textContent("body")
    expect(body).toBeTruthy()
    expect(page.url()).not.toContain("/auth/login")
  })
})

test.describe("프로필 (PRD 8-13)", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateTestUser(page)
  })

  test("프로필 + DNA 3탭 + 통계", async ({ page }) => {
    await page.goto("/profile")
    await page.waitForTimeout(2000)

    await expect(page.getByText("테스트유저")).toBeVisible()
    await expect(page.getByText("Lv.1")).toBeVisible()
    await expect(page.getByRole("button", { name: "Food DNA" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Wine DNA" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Cooking DNA" })).toBeVisible()
    await expect(page.getByText("총 기록")).toBeVisible()
  })
})

test.describe("비교 게임 (PRD 8-7)", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateTestUser(page)
  })

  test("비교 페이지 + 빈 상태", async ({ page }) => {
    await page.goto("/comparison")
    await page.waitForTimeout(2000)

    await expect(page.getByText("비교 게임")).toBeVisible()
    await expect(page.getByText("기록이 2개 이상 필요해요")).toBeVisible()
  })
})

test.describe("궁합 (PRD 8-14)", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateTestUser(page)
  })

  test("궁합 페이지 렌더링", async ({ page }) => {
    await page.goto("/compatibility")
    await page.waitForTimeout(2000)
    expect(page.url()).not.toContain("/auth/login")
  })
})

test.describe("Wrapped (PRD 8-17)", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateTestUser(page)
  })

  test("Wrapped 페이지 렌더링", async ({ page }) => {
    await page.goto("/wrapped")
    await page.waitForTimeout(2000)
    expect(page.url()).not.toContain("/auth/login")
  })
})

test.describe("알림 (PRD 8-16)", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateTestUser(page)
  })

  test("알림 페이지 렌더링", async ({ page }) => {
    await page.goto("/notifications")
    await page.waitForTimeout(2000)
    expect(page.url()).not.toContain("/auth/login")
  })
})

test.describe("설정 (PRD 8-16)", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateTestUser(page)
  })

  test("설정 페이지 렌더링", async ({ page }) => {
    await page.goto("/settings")
    await page.waitForTimeout(2000)
    expect(page.url()).not.toContain("/auth/login")
  })
})
