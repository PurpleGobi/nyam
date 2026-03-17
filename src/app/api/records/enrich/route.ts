import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/infrastructure/supabase/server"
import { createAdminClient } from "@/infrastructure/supabase/admin"
import { FOOD_CATEGORIES } from "@/shared/constants/categories"

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
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

async function callGemini(parts: Array<Record<string, unknown>>, temperature = 0.2): Promise<Record<string, unknown>> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS)
  const response = await fetch(`${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { temperature, responseMimeType: "application/json" },
    }),
    signal: controller.signal,
  })
  clearTimeout(timer)

  if (!response.ok) {
    throw new Error("Gemini API request failed")
  }

  const data = await response.json()
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}"
  return JSON.parse(rawText)
}

async function prepareImageParts(photoUrls: string[]): Promise<Array<Record<string, unknown>>> {
  const imagePromises = photoUrls.slice(0, 8).map(fetchImageAsBase64)
  const images = await Promise.all(imagePromises)
  const parts: Array<Record<string, unknown>> = []
  for (const img of images) {
    if (img) {
      parts.push({ inline_data: { mime_type: img.mimeType, data: img.data } })
    }
  }
  return parts
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

  const { data: record } = await supabase
    .from("records")
    .select("*")
    .eq("id", recordId)
    .eq("user_id", user.id)
    .single()

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 })
  }

  const recordType = record.record_type as string

  // Cooking: skip enrich
  if (recordType === "cooking") {
    return NextResponse.json({ success: true, skipped: true, reason: "cooking type does not need enrich" })
  }

  const imageParts = await prepareImageParts(photoUrls ?? [])
  const admin = createAdminClient()

  if (recordType === "wine") {
    return handleWineEnrich(admin, record, recordId, imageParts)
  }

  // Default: restaurant
  return handleRestaurantEnrich(admin, record, recordId, imageParts)
}

async function handleRestaurantEnrich(
  admin: ReturnType<typeof createAdminClient>,
  record: Record<string, unknown>,
  recordId: string,
  imageParts: Array<Record<string, unknown>>,
) {
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
  "companionCount": 인원수(기본 1),
  "scene": "혼밥 | 데이트 | 회식 | 가족모임 | 친구모임 | 비즈니스 | null",
  "estimatedVisitHour": 0-23 | null
}`

  const parts: Array<Record<string, unknown>> = [{ text: prompt }, ...imageParts]

  let enrichment: Record<string, unknown>
  try {
    enrichment = await callGemini(parts)
  } catch {
    return NextResponse.json({ error: "AI enrichment failed" }, { status: 500 })
  }

  // Save to record_ai_analyses (admin for RLS bypass)
  await admin.from("record_ai_analyses").insert({
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
  if (!record.menu_name && enrichment.orderedItems && Array.isArray(enrichment.orderedItems) && (enrichment.orderedItems as string[]).length > 0) {
    updateData.menu_name = (enrichment.orderedItems as string[])[0]
  }
  if (enrichment.companionCount) updateData.companion_count = enrichment.companionCount
  if (enrichment.totalCost) updateData.total_cost = enrichment.totalCost
  if (enrichment.scene) updateData.scene = enrichment.scene
  if (enrichment.estimatedVisitHour != null) updateData.visit_time = String(enrichment.estimatedVisitHour)

  await admin.from("records").update(updateData).eq("id", recordId)

  return NextResponse.json({ success: true, enrichment })
}

async function handleWineEnrich(
  admin: ReturnType<typeof createAdminClient>,
  record: Record<string, unknown>,
  recordId: string,
  imageParts: Array<Record<string, unknown>>,
) {
  const prompt = `당신은 와인 전문 소믈리에입니다. 와인 라벨/병 사진을 분석하여 와인을 식별하세요. JSON으로 응답:
{
  "name": "정확한 와인명",
  "vintage": 2020,
  "winery": "생산자",
  "origin": { "country": "프랑스", "region": "부르고뉴" },
  "variety": "피노 누아",
  "estimatedPriceKrw": 85000,
  "criticScore": { "source": "Robert Parker", "score": 92 },
  "confidence": 0.0-1.0
}
식별 불가 시 null 필드 사용. vintage 불명 시 null.`

  const parts: Array<Record<string, unknown>> = [{ text: prompt }, ...imageParts]

  let wineInfo: Record<string, unknown>
  try {
    wineInfo = await callGemini(parts)
  } catch {
    return NextResponse.json({ error: "AI wine enrichment failed" }, { status: 500 })
  }

  // Save to record_ai_analyses with wine_info
  await admin.from("record_ai_analyses").insert({
    record_id: recordId,
    raw_response: wineInfo,
    wine_info: wineInfo,
    confidence_score: (wineInfo.confidence as number) ?? 0.7,
  })

  // Update record
  const updateData: Record<string, unknown> = { ai_recognized: true }
  if (!record.menu_name && wineInfo.name) {
    updateData.menu_name = wineInfo.name
  }

  await admin.from("records").update(updateData).eq("id", recordId)

  return NextResponse.json({ success: true, enrichment: wineInfo })
}
