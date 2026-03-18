import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/infrastructure/supabase/server"
import { createAdminClient } from "@/infrastructure/supabase/admin"
import { callGemini } from "@/infrastructure/api/gemini"

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
  const latestAnalysis = analyses?.sort((a, b) =>
    new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime()
  )[0]

  if (!latestAnalysis) {
    return NextResponse.json({ error: "No AI analysis found. Run enrich first." }, { status: 400 })
  }

  const admin = createAdminClient()

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

    let profile: Record<string, unknown>
    try {
      profile = await callGemini([{ text: prompt }], 0.3)
    } catch {
      return NextResponse.json({ error: "AI taste profile generation failed" }, { status: 500 })
    }

    await admin.from("record_taste_profiles").upsert({
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

  // Wine type - merge AI tasting (from analyze-photos) with user input
  if (record.record_type === "wine") {
    const aiTasting = latestAnalysis.wine_tasting_ai as Record<string, unknown> | null

    // Get existing user WSET input from record_taste_profiles
    const { data: existingProfile } = await admin
      .from("record_taste_profiles")
      .select("*")
      .eq("record_id", recordId)
      .single()

    // Merge AI + user: average when both exist
    const axes = ["acidity", "body", "tannin", "sweetness", "balance", "finish", "aroma"] as const
    const mergedData: Record<string, unknown> = { record_id: recordId }
    let hasUserInput = false

    for (const axis of axes) {
      const aiValue = aiTasting?.[axis] as number | null ?? null
      const userValue = existingProfile?.[`wine_${axis}_user`] as number | null ?? null

      if (aiValue != null && userValue != null) {
        mergedData[`wine_${axis}`] = Math.round((aiValue + userValue) / 2)
        hasUserInput = true
      } else {
        mergedData[`wine_${axis}`] = aiValue ?? userValue ?? null
      }
    }

    mergedData.source = hasUserInput ? "ai_user_avg" : "ai"
    mergedData.confidence = aiTasting ? 0.7 : 0.3

    await admin.from("record_taste_profiles").upsert(mergedData, { onConflict: "record_id" })

    return NextResponse.json({ success: true, merged: true, source: mergedData.source })
  }

  return NextResponse.json({ error: "Unknown record type" }, { status: 400 })
}
