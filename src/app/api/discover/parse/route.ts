import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/infrastructure/supabase/server"
import { callGemini } from "@/infrastructure/api/gemini"
import { FOOD_CATEGORIES } from "@/shared/constants/categories"
import { RESTAURANT_SCENES } from "@/shared/constants/scenes"

const GENRE_VALUES = FOOD_CATEGORIES.map((c) => c.value)
const GENRE_LABELS = FOOD_CATEGORIES.map((c) => `${c.value}(${c.label})`)
const SCENE_VALUES = RESTAURANT_SCENES.map((s) => s.value)

interface ParseResult {
  area: string | null
  scene: string | null
  genre: string | null
}

/**
 * POST /api/discover/parse
 *
 * Parse natural language query into structured discover filters using LLM.
 * Target: < 2 seconds response time.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const query = typeof body.query === "string" ? body.query.trim() : ""
  const filterContext = body.filterContext as {
    scenes?: string[]
    areas?: string[]
    isNearby?: boolean
  } | undefined

  if (!query || query.length > 200) {
    return NextResponse.json({ error: "유효한 검색어를 입력해주세요" }, { status: 400 })
  }

  // Build filter context hint for LLM
  const contextHints: string[] = []
  if (filterContext?.scenes && filterContext.scenes.length > 0) {
    contextHints.push(`사용자가 이미 선택한 씬: [${filterContext.scenes.join(", ")}]`)
  }
  if (filterContext?.areas && filterContext.areas.length > 0) {
    contextHints.push(`사용자가 이미 선택한 지역: [${filterContext.areas.join(", ")}]`)
  }
  if (filterContext?.isNearby) {
    contextHints.push("사용자가 '내주변' 모드를 활성화한 상태입니다")
  }
  const contextBlock = contextHints.length > 0
    ? `\n\n사용자 필터 컨텍스트:\n${contextHints.join("\n")}\n이미 선택된 필터가 있으면 텍스트에서 해당 정보는 무시하고 추가 정보만 추출하세요.`
    : ""

  try {
    const prompt = `사용자가 식당 추천을 요청했습니다. 아래 텍스트에서 지역, 상황, 음식 장르를 추출하세요.

입력: "${query}"${contextBlock}

추출 규칙:
- area: 지역명 (예: "강남역", "성수동", "홍대", "이태원"). 없으면 null.
- scene: 다음 중 하나만: [${SCENE_VALUES.join(", ")}]. 없으면 null.
  - "점심", "런치" → "간단점심"
  - "혼자", "나홀로" → "혼밥"
  - "술", "한잔", "회식" → "술자리"
  - "친구", "모임" → "친구모임"
  - "커플", "연인", "기념일" → "데이트"
  - "아이", "패밀리" → "가족"
  - "접대", "미팅" → "비즈니스"
  - "아침", "브런치" → "브런치"
- genre: 다음 중 하나만: [${GENRE_LABELS.join(", ")}]. 없으면 null.
  - "파스타", "스테이크" → "western"
  - "초밥", "라멘", "우동" → "japanese"
  - "삼겹살", "갈비", "고깃집" → "bbq"
  - "떡볶이", "김밥" → "snack"
  - "아무거나", "뭐든" → null (특정 장르 아님)

JSON만 출력하세요: { "area": ..., "scene": ..., "genre": ... }`

    const result = await callGemini([{ text: prompt }], 0.1) as unknown as ParseResult

    const parsed: ParseResult = {
      area: typeof result.area === "string" ? result.area : null,
      scene: (SCENE_VALUES as readonly string[]).includes(result.scene as string) ? result.scene : null,
      genre: (GENRE_VALUES as readonly string[]).includes(result.genre as string) ? result.genre : null,
    }

    console.log(`[Discover Parse] "${query}" → area=${parsed.area} scene=${parsed.scene} genre=${parsed.genre}`)

    return NextResponse.json({ success: true, parsed })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[Discover Parse] Error:", message)
    return NextResponse.json({ error: "파싱 실패" }, { status: 500 })
  }
}
