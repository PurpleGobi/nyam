import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/infrastructure/supabase/server"

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
const GEMINI_TIMEOUT_MS = 30_000

interface Recommendation {
  food: string
  reason: string
  tip: string
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { scene, location, additionalContext } = await request.json() as {
    scene?: string
    location?: { lat: number; lng: number }
    additionalContext?: string
  }

  // Taste DNA 조회
  const { data: tasteDna } = await supabase
    .from("taste_dna_restaurant")
    .select("*")
    .eq("user_id", user.id)
    .single()

  const sampleCount = tasteDna?.sample_count ?? 0

  // Style DNA 조회 (장르, 상황 패턴)
  const [genresResult, scenesResult] = await Promise.all([
    supabase
      .from("style_dna_restaurant_genres")
      .select("genre, record_count")
      .eq("user_id", user.id)
      .order("record_count", { ascending: false })
      .limit(5),
    supabase
      .from("style_dna_restaurant_scenes")
      .select("scene, record_count")
      .eq("user_id", user.id)
      .order("record_count", { ascending: false })
      .limit(5),
  ])

  const topGenres = genresResult.data?.map((g) => g.genre) ?? []
  const topScenes = scenesResult.data?.map((s) => s.scene) ?? []

  // Cold start: 기록이 부족해도 기본 추천 제공
  const isColdStart = sampleCount < 5

  const tasteProfile = isColdStart
    ? "이 사용자는 아직 기록이 적어서 맛 프로필이 충분하지 않습니다. 대중적으로 인기 있는 음식 위주로 추천해주세요."
    : [
        `매운맛 선호도: ${Math.round(tasteDna!.flavor_spicy)}/100`,
        `단맛 선호도: ${Math.round(tasteDna!.flavor_sweet)}/100`,
        `짠맛 선호도: ${Math.round(tasteDna!.flavor_salty)}/100`,
        `신맛 선호도: ${Math.round(tasteDna!.flavor_sour)}/100`,
        `감칠맛 선호도: ${Math.round(tasteDna!.flavor_umami)}/100`,
        `풍미 선호도: ${Math.round(tasteDna!.flavor_rich)}/100`,
        topGenres.length > 0 ? `자주 먹는 장르: ${topGenres.join(", ")}` : null,
        topScenes.length > 0 ? `선호 상황: ${topScenes.join(", ")}` : null,
      ].filter(Boolean).join("\n")

  const prompt = [
    "당신은 맛집 추천 전문가입니다. 사용자의 맛 프로필을 기반으로 음식을 추천합니다.",
    "",
    "## 사용자 맛 프로필",
    tasteProfile,
    "",
    scene ? `## 현재 상황: ${scene}` : "",
    location ? `## 위치: 위도 ${location.lat}, 경도 ${location.lng} 근처` : "",
    additionalContext ? `## 추가 요청: ${additionalContext}` : "",
    "",
    "## 지시사항",
    "위 프로필을 기반으로 이 사용자에게 맞는 음식 3가지를 추천하세요.",
    "각 추천에는 구체적인 음식명, 추천 이유, 그리고 실용적인 팁을 포함하세요.",
    "한국의 음식 문화와 트렌드를 반영해주세요.",
    "",
    "반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요:",
    '[{"food":"음식명","reason":"추천 이유 (1-2문장)","tip":"팁 (1문장)"}]',
  ].filter(Boolean).join("\n")

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "AI service not configured" }, { status: 500 })
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS)

    const geminiRes = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
        },
      }),
    })
    clearTimeout(timeout)

    if (!geminiRes.ok) {
      throw new Error(`Gemini API error: ${geminiRes.status}`)
    }

    const geminiData = await geminiRes.json()
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]"

    let recommendations: Recommendation[] = []
    try {
      const parsed = JSON.parse(rawText)
      recommendations = (Array.isArray(parsed) ? parsed : []).map((item: Record<string, unknown>) => ({
        food: String(item.food ?? ""),
        reason: String(item.reason ?? ""),
        tip: String(item.tip ?? ""),
      })).filter((r: Recommendation) => r.food)
    } catch {
      recommendations = []
    }

    return NextResponse.json({
      success: true,
      recommendations,
      isColdStart,
      tasteDna: tasteDna ? {
        spicy: tasteDna.flavor_spicy,
        sweet: tasteDna.flavor_sweet,
        salty: tasteDna.flavor_salty,
        sour: tasteDna.flavor_sour,
        umami: tasteDna.flavor_umami,
        rich: tasteDna.flavor_rich,
      } : null,
      sampleCount,
      filters: { scene, location },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: `AI 추천 실패: ${message}` }, { status: 500 })
  }
}
