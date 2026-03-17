import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/infrastructure/supabase/server"

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { recordId } = await request.json() as { recordId: string }

  if (!recordId) {
    return NextResponse.json({ error: "recordId is required" }, { status: 400 })
  }

  const { data: record } = await supabase
    .from("records")
    .select("*, record_ai_analyses(*)")
    .eq("id", recordId)
    .eq("user_id", user.id)
    .single()

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 })
  }

  // Skip for cooking - user manually inputs taste profile
  if (record.record_type === "cooking") {
    return NextResponse.json({ success: true, skipped: true, reason: "cooking type uses manual input" })
  }

  const analyses = record.record_ai_analyses as Array<Record<string, unknown>> | null
  const latestAnalysis = analyses?.[0]

  if (!latestAnalysis) {
    return NextResponse.json({ error: "No AI analysis found. Run enrich first." }, { status: 400 })
  }

  if (record.record_type === "restaurant") {
    const restaurantName = (latestAnalysis.identified_restaurant as Record<string, unknown>)?.name ?? record.menu_name ?? "unknown"
    const orderedItems = (latestAnalysis.ordered_items as Array<Record<string, unknown>>)?.map((item) => item.name).join(", ") ?? ""

    const prompt = `당신은 음식 맛 분석 전문가입니다. "${restaurantName}"의 메뉴 "${orderedItems}"의 객관적 맛 특성을 0-100 점수로 평가하세요.

응답 형식 (JSON):
{
  "spicy": 0-100,
  "sweet": 0-100,
  "salty": 0-100,
  "sour": 0-100,
  "umami": 0-100,
  "rich": 0-100,
  "summary": "한줄 요약",
  "confidence": 0.0-1.0
}`

    const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
      }),
    })

    if (!geminiResponse.ok) {
      return NextResponse.json({ error: "AI taste profile generation failed" }, { status: 500 })
    }

    const geminiData = await geminiResponse.json()
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}"

    let profile: Record<string, unknown>
    try {
      profile = JSON.parse(rawText)
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 })
    }

    await supabase.from("record_taste_profiles").upsert({
      record_id: recordId,
      spicy: profile.spicy ?? null,
      sweet: profile.sweet ?? null,
      salty: profile.salty ?? null,
      sour: profile.sour ?? null,
      umami: profile.umami ?? null,
      rich: profile.rich ?? null,
      source: "ai",
      confidence: profile.confidence ?? 0.5,
      summary: profile.summary ?? null,
    }, { onConflict: "record_id" })

    return NextResponse.json({ success: true, profile })
  }

  // Wine type - WSET tasting
  if (record.record_type === "wine") {
    const wineInfo = latestAnalysis.wine_info as Record<string, unknown> | null

    const prompt = `당신은 와인 테이스팅 전문가(WSET Advanced)입니다. 와인 "${wineInfo?.name ?? "unknown"}"의 WSET 기준 테이스팅 노트를 0-100 점수로 평가하세요.

응답 형식 (JSON):
{
  "acidity": 0-100,
  "body": 0-100,
  "tannin": 0-100,
  "sweetness": 0-100,
  "balance": 0-100,
  "finish": 0-100,
  "aroma": 0-100,
  "summary": "한줄 요약",
  "confidence": 0.0-1.0
}`

    const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
      }),
    })

    if (!geminiResponse.ok) {
      return NextResponse.json({ error: "AI wine tasting failed" }, { status: 500 })
    }

    const geminiData = await geminiResponse.json()
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}"

    let profile: Record<string, unknown>
    try {
      profile = JSON.parse(rawText)
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 })
    }

    // Update AI tasting in analysis
    await supabase.from("record_ai_analyses")
      .update({ wine_tasting_ai: profile })
      .eq("id", latestAnalysis.id)

    await supabase.from("record_taste_profiles").upsert({
      record_id: recordId,
      wine_acidity: profile.acidity ?? null,
      wine_body: profile.body ?? null,
      wine_tannin: profile.tannin ?? null,
      wine_sweetness: profile.sweetness ?? null,
      wine_balance: profile.balance ?? null,
      wine_finish: profile.finish ?? null,
      wine_aroma: profile.aroma ?? null,
      source: "ai",
      confidence: profile.confidence ?? 0.5,
      summary: profile.summary ?? null,
    }, { onConflict: "record_id" })

    return NextResponse.json({ success: true, profile })
  }

  return NextResponse.json({ error: "Unknown record type" }, { status: 400 })
}
