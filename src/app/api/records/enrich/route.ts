import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/infrastructure/supabase/server"
import { FOOD_CATEGORIES } from "@/shared/constants/categories"

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent"
const GEMINI_TIMEOUT_MS = 30_000

async function fetchImageAsBase64(url: string): Promise<{ mimeType: string; data: string } | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10_000)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    const base64 = Buffer.from(buffer).toString("base64")
    const mimeType = res.headers.get("content-type") ?? "image/jpeg"
    return { mimeType, data: base64 }
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { recordId, photoUrls } = await request.json() as {
    recordId: string
    photoUrls: string[]
  }

  if (!recordId) {
    return NextResponse.json({ error: "recordId is required" }, { status: 400 })
  }

  // Get record to check ownership
  const { data: record } = await supabase
    .from("records")
    .select("*")
    .eq("id", recordId)
    .eq("user_id", user.id)
    .single()

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 })
  }

  const genreList = FOOD_CATEGORIES.map((c) => `"${c.value}" → ${c.label}`).join(", ")

  const prompt = `당신은 음식점 방문 분석 전문가입니다. 사진을 분석하여 JSON으로 응답하세요.

## genre 허용 목록
${genreList}

## 응답 형식
{
  "restaurantName": "식당 이름",
  "genre": "korean | chinese | japanese | western | ...",
  "orderedItems": ["주문 메뉴 추정"],
  "menuItems": [{"name": "메뉴명", "price": 숫자}],
  "totalCost": 총액 | null,
  "companionCount": 인원수(기본 1)
}`

  const parts: Array<Record<string, unknown>> = [{ text: prompt }]

  // Fetch images and convert to base64 for Gemini inline_data
  const imagePromises = (photoUrls ?? []).slice(0, 8).map(fetchImageAsBase64)
  const images = await Promise.all(imagePromises)
  for (const img of images) {
    if (img) {
      parts.push({ inline_data: { mime_type: img.mimeType, data: img.data } })
    }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS)
  const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
    }),
    signal: controller.signal,
  })
  clearTimeout(timer)

  if (!geminiResponse.ok) {
    return NextResponse.json({ error: "AI enrichment failed" }, { status: 500 })
  }

  const geminiData = await geminiResponse.json()
  const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}"

  let enrichment: Record<string, unknown>
  try {
    enrichment = JSON.parse(rawText)
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 })
  }

  // Save to record_ai_analyses
  await supabase.from("record_ai_analyses").insert({
    record_id: recordId,
    raw_response: enrichment,
    identified_restaurant: enrichment.restaurantName
      ? { name: enrichment.restaurantName, matchedPlaceId: null, confidence: 0.7 }
      : null,
    extracted_menu_items: enrichment.menuItems ?? null,
    ordered_items: Array.isArray(enrichment.orderedItems)
      ? (enrichment.orderedItems as string[]).map((name) => ({ name, estimatedPrice: null }))
      : null,
    receipt_data: enrichment.totalCost
      ? { totalCost: enrichment.totalCost, perPersonCost: null, itemCount: null }
      : null,
    companion_data: enrichment.companionCount
      ? { count: enrichment.companionCount, occasion: null }
      : null,
    confidence_score: 0.7,
  })

  // Update record with enriched data
  const updateData: Record<string, unknown> = { ai_recognized: true }
  if (enrichment.genre) {
    const validGenres = new Set<string>(FOOD_CATEGORIES.map((c) => c.value))
    if (validGenres.has(enrichment.genre as string)) {
      updateData.genre = enrichment.genre
    }
  }
  if (enrichment.companionCount) updateData.companion_count = enrichment.companionCount
  if (enrichment.totalCost) updateData.total_cost = enrichment.totalCost

  await supabase.from("records").update(updateData).eq("id", recordId)

  return NextResponse.json({ success: true, enrichment })
}
