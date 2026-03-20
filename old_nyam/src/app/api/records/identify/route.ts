import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/infrastructure/supabase/server"
import { createAdminClient } from "@/infrastructure/supabase/admin"
import { callGemini, prepareImageParts } from "@/infrastructure/api/gemini"
import { searchNearbyRestaurants } from "@/infrastructure/api/kakao-local"

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
    .select("*")
    .eq("id", recordId)
    .eq("user_id", user.id)
    .single()

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 })
  }

  // Cooking: skip (no external target to identify)
  if (record.record_type === "cooking") {
    return NextResponse.json({ success: true, skipped: true })
  }

  // Get photo URLs from DB
  const { data: photos } = await supabase
    .from("record_photos")
    .select("photo_url")
    .eq("record_id", recordId)
    .order("order_index")

  const photoUrls = (photos ?? []).map((p) => p.photo_url as string)
  if (photoUrls.length === 0) {
    return NextResponse.json({ success: true, skipped: true, reason: "no photos" })
  }

  const imageParts = await prepareImageParts(photoUrls)
  if (imageParts.length === 0) {
    return NextResponse.json({ success: true, skipped: true, reason: "no valid images" })
  }

  const admin = createAdminClient()

  if (record.record_type === "wine") {
    return handleWineIdentify(admin, record, recordId, imageParts)
  }

  // Default: restaurant
  return handleRestaurantIdentify(admin, record, recordId, imageParts)
}

async function handleRestaurantIdentify(
  admin: ReturnType<typeof createAdminClient>,
  record: Record<string, unknown>,
  recordId: string,
  imageParts: Array<Record<string, unknown>>,
) {
  // GPS cross-validation: get nearby restaurants
  const lat = record.location_lat as number | null
  const lng = record.location_lng as number | null
  let nearbyPlacesText = "GPS 정보 없음"
  let nearbyPlaces: Awaited<ReturnType<typeof searchNearbyRestaurants>> = []

  if (lat && lng) {
    try {
      nearbyPlaces = await searchNearbyRestaurants(lat, lng, 500)
      nearbyPlacesText = nearbyPlaces
        .map((p) => `${p.name} (${p.address}) [ID: ${p.externalId}]`)
        .join("\n")
    } catch {
      nearbyPlacesText = "GPS 기반 검색 실패"
    }
  }

  const prompt = `당신은 식당 식별 전문가입니다. 사진에서 식당명을 추출하세요.

## 주변 식당 (GPS 기반, 카카오 API)
${nearbyPlacesText}

## 분석 규칙
1. 간판/로고/메뉴판에서 식당명 OCR
2. OCR 결과가 주변 식당 목록과 매칭되면 해당 ID 반환
3. 매칭 안 되면 OCR 텍스트만 반환 (강제 매칭 금지)

## 응답 형식 (JSON)
{
  "restaurantName": "OCR로 읽은 식당명" | null,
  "matchedPlaceId": "카카오 external_id" | null,
  "confidence": 0.0-1.0,
  "ocrTexts": ["간판에서 읽은 텍스트들"]
}`

  const parts: Array<Record<string, unknown>> = [{ text: prompt }, ...imageParts]

  let result: Record<string, unknown>
  try {
    result = await callGemini(parts)
  } catch {
    return NextResponse.json({ error: "AI identify failed" }, { status: 500 })
  }

  const confidence = (result.confidence as number) ?? 0
  const matchedPlaceId = result.matchedPlaceId as string | null
  const restaurantName = result.restaurantName as string | null

  // Restaurant confirmation based on confidence
  if (confidence > 0.7 && matchedPlaceId) {
    const matched = nearbyPlaces.find((p) => p.externalId === matchedPlaceId)
    if (matched) {
      // UPSERT restaurant
      const { data: upserted } = await admin
        .from("restaurants")
        .upsert({
          name: matched.name,
          address: matched.address,
          external_id: matched.externalId,
          latitude: matched.latitude,
          longitude: matched.longitude,
          phone: matched.phone || null,
          external_url: matched.placeUrl || null,
          source: "kakao",
          synced_at: new Date().toISOString(),
        }, { onConflict: "external_id" })
        .select("id")
        .single()

      if (upserted) {
        await admin.from("records").update({
          restaurant_id: upserted.id,
          ai_recognized: true,
        }).eq("id", recordId)
      }
    }
  }

  // Save to record_ai_analyses
  await admin.from("record_ai_analyses").insert({
    record_id: recordId,
    raw_response: result,
    identified_restaurant: restaurantName
      ? { name: restaurantName, matchedPlaceId, confidence }
      : null,
    confidence_score: confidence,
  })

  // Mark as AI recognized (only if not already set in the confidence > 0.7 branch above)
  if (confidence <= 0.7 || !matchedPlaceId) {
    await admin.from("records").update({ ai_recognized: true }).eq("id", recordId)
  }

  return NextResponse.json({ success: true, confidence, restaurantName, matchedPlaceId })
}

async function handleWineIdentify(
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
  "pairingFood": "페어링 음식 (사진에서 보이면)" | null,
  "confidence": 0.0-1.0
}
식별 불가 시 null 필드 사용. vintage 불명 시 null.`

  const parts: Array<Record<string, unknown>> = [{ text: prompt }, ...imageParts]

  let wineInfo: Record<string, unknown>
  try {
    wineInfo = await callGemini(parts)
  } catch {
    return NextResponse.json({ error: "AI wine identify failed" }, { status: 500 })
  }

  // Save to record_ai_analyses
  await admin.from("record_ai_analyses").insert({
    record_id: recordId,
    raw_response: wineInfo,
    wine_info: wineInfo,
    pairing_food: (wineInfo.pairingFood as string) ?? null,
    confidence_score: (wineInfo.confidence as number) ?? 0.7,
  })

  // Update record
  const updateData: Record<string, unknown> = { ai_recognized: true }
  if (!record.menu_name && wineInfo.name) {
    updateData.menu_name = wineInfo.name
  }
  if (wineInfo.pairingFood) {
    updateData.pairing_food = wineInfo.pairingFood
  }
  if (wineInfo.estimatedPriceKrw) {
    updateData.purchase_price = wineInfo.estimatedPriceKrw
  }

  await admin.from("records").update(updateData).eq("id", recordId)

  return NextResponse.json({ success: true, wineInfo })
}
