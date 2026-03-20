import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/infrastructure/supabase/server"
import { createAdminClient } from "@/infrastructure/supabase/admin"
import { callGemini, prepareImageParts } from "@/infrastructure/api/gemini"
import { FOOD_CATEGORIES, COOKING_GENRES } from "@/shared/constants/categories"
import { FLAVOR_TAGS, TEXTURE_TAGS } from "@/shared/constants/tags"
import { RESTAURANT_SCENES, WINE_SCENES, COOKING_SCENES } from "@/shared/constants/scenes"

const VALID_FLAVOR_TAGS = new Set<string>(FLAVOR_TAGS)
const VALID_TEXTURE_TAGS = new Set<string>(TEXTURE_TAGS)

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
  const analyses = record.record_ai_analyses as Array<Record<string, unknown>> | null
  const latestAnalysis = analyses?.sort((a, b) =>
    new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime()
  )[0]

  if (record.record_type === "restaurant") {
    return handleRestaurantPhotos(admin, record, recordId, imageParts, latestAnalysis)
  }
  if (record.record_type === "wine") {
    return handleWinePhotos(admin, record, recordId, imageParts, latestAnalysis)
  }
  if (record.record_type === "cooking") {
    return handleCookingPhotos(admin, record, recordId, imageParts)
  }

  return NextResponse.json({ error: "Unknown record type" }, { status: 400 })
}

async function handleRestaurantPhotos(
  admin: ReturnType<typeof createAdminClient>,
  record: Record<string, unknown>,
  recordId: string,
  imageParts: Array<Record<string, unknown>>,
  latestAnalysis: Record<string, unknown> | undefined,
) {
  // Get confirmed restaurant info for context
  let restaurantContext = "식당 정보 없음"
  if (record.restaurant_id) {
    const { data: restaurant } = await admin
      .from("restaurants")
      .select("name, address, genre, menu_items")
      .eq("id", record.restaurant_id)
      .single()
    if (restaurant) {
      restaurantContext = `- 식당: ${restaurant.name}\n- 주소: ${restaurant.address ?? "알 수 없음"}\n- 장르: ${restaurant.genre ?? record.genre ?? "알 수 없음"}`
      if (restaurant.menu_items) {
        restaurantContext += `\n- 카카오 등록 메뉴: ${JSON.stringify(restaurant.menu_items)}`
      }
    }
  }

  const genreList = FOOD_CATEGORIES.map((c) => `"${c.value}" → ${c.label}`).join(", ")
  const sceneList = RESTAURANT_SCENES.map((s) => s.value).join(", ")

  const prompt = `당신은 음식점 방문 사진 분석 전문가입니다.

## 확정 정보 (식별 완료)
${restaurantContext}

## 분석 항목
1. 각 사진을 분류하세요: food / signage / receipt / ambiance / menu_board
2. 음식 사진에서 주문 메뉴를 추정하세요 (카카오 메뉴 목록 참고)
3. 영수증이 있으면 총액/인당 비용을 추출하세요
4. 인원수와 상황을 추정하세요
5. 맛 관련 태그를 추출하세요

## genre 허용 목록
${genreList}

## scene 허용 목록
${sceneList}

## 태그 허용 목록
FLAVOR_TAGS: ${FLAVOR_TAGS.join(", ")}
TEXTURE_TAGS: ${TEXTURE_TAGS.join(", ")}

## 응답 형식 (JSON)
{
  "photos": [{"index": 0, "type": "food", "description": "짬뽕", "confidence": 0.9}],
  "orderedItems": [{"name": "짬뽕", "estimatedPrice": 9000}],
  "menuItems": [{"name": "짜장면", "price": 7000}],
  "receipt": {"totalCost": 18000, "perPersonCost": 9000, "itemCount": 2} | null,
  "companions": {"count": 2, "occasion": "친구모임"},
  "estimatedVisitHour": 12,
  "scene": "친구모임",
  "genre": "chinese",
  "flavorTags": ["짭짤한", "감칠맛"],
  "textureTags": ["쫄깃한"]
}`

  const parts: Array<Record<string, unknown>> = [{ text: prompt }, ...imageParts]

  let result: Record<string, unknown>
  try {
    result = await callGemini(parts)
  } catch {
    return NextResponse.json({ error: "AI photo analysis failed" }, { status: 500 })
  }

  // Update or create AI analysis row
  const photoAnalysisData = {
    photo_classifications: result.photos ?? null,
    ordered_items: Array.isArray(result.orderedItems) ? result.orderedItems : null,
    extracted_menu_items: Array.isArray(result.menuItems) ? result.menuItems : null,
    receipt_data: result.receipt ?? null,
    companion_data: result.companions ?? null,
    estimated_visit_time: result.estimatedVisitHour != null ? String(result.estimatedVisitHour) : null,
  }
  if (latestAnalysis?.id) {
    await admin.from("record_ai_analyses").update(photoAnalysisData).eq("id", latestAnalysis.id)
  } else {
    await admin.from("record_ai_analyses").insert({
      record_id: recordId,
      raw_response: result,
      confidence_score: 0.7,
      ...photoAnalysisData,
    })
  }

  // Update record
  const updateData: Record<string, unknown> = {}

  if (!record.menu_name && Array.isArray(result.orderedItems) && (result.orderedItems as Array<Record<string, unknown>>).length > 0) {
    updateData.menu_name = (result.orderedItems as Array<Record<string, unknown>>)[0].name
  }

  if (result.scene) {
    const validScenes = new Set<string>(RESTAURANT_SCENES.map((s) => s.value))
    if (validScenes.has(result.scene as string)) {
      updateData.scene = result.scene
    }
  }

  if (result.estimatedVisitHour != null) updateData.visit_time = String(result.estimatedVisitHour)
  if (result.companions) {
    const comp = result.companions as Record<string, unknown>
    if (comp.count) updateData.companion_count = comp.count
    if (comp.occasion && !updateData.scene) updateData.scene = comp.occasion
  }
  if (result.receipt) {
    const receipt = result.receipt as Record<string, unknown>
    if (receipt.totalCost) updateData.total_cost = receipt.totalCost
  }

  // Genre update (if empty)
  if (!record.genre && result.genre) {
    const validGenres = new Set<string>(FOOD_CATEGORIES.map((c) => c.value))
    if (validGenres.has(result.genre as string)) {
      updateData.genre = result.genre
    }
  }

  // Tags (filter against valid constants)
  if (Array.isArray(result.flavorTags)) {
    const validTags = (result.flavorTags as string[]).filter((t) => VALID_FLAVOR_TAGS.has(t))
    if (validTags.length > 0) updateData.flavor_tags = validTags
  }
  if (Array.isArray(result.textureTags)) {
    const validTags = (result.textureTags as string[]).filter((t) => VALID_TEXTURE_TAGS.has(t))
    if (validTags.length > 0) updateData.texture_tags = validTags
  }

  if (Object.keys(updateData).length > 0) {
    await admin.from("records").update(updateData).eq("id", recordId)
  }

  return NextResponse.json({ success: true, result })
}

async function handleWinePhotos(
  admin: ReturnType<typeof createAdminClient>,
  record: Record<string, unknown>,
  recordId: string,
  imageParts: Array<Record<string, unknown>>,
  latestAnalysis: Record<string, unknown> | undefined,
) {
  const wineInfo = latestAnalysis?.wine_info as Record<string, unknown> | null
  const wineName = (wineInfo?.name as string) ?? "unknown"
  const variety = (wineInfo?.variety as string) ?? "unknown"
  const origin = wineInfo?.origin ? JSON.stringify(wineInfo.origin) : "unknown"
  const vintage = (wineInfo?.vintage as number | null) ?? "unknown"
  const sceneList = WINE_SCENES.map((s) => s.value).join(", ")

  const prompt = `당신은 와인 테이스팅 전문가(WSET Advanced)입니다.

## 확정 와인 정보
- 와인명: ${wineName}
- 품종: ${variety}
- 산지: ${origin}
- 빈티지: ${vintage}

## 분석 항목
1. 사진 분류: wine_label / food / receipt / ambiance
2. WSET 기준 테이스팅 노트 산출 (0-100)
3. 상황 추정

## scene 허용 목록
${sceneList}

## 응답 형식 (JSON)
{
  "photos": [{"index": 0, "type": "wine_label", "confidence": 0.9}],
  "tasting": {
    "acidity": 0-100,
    "body": 0-100,
    "tannin": 0-100,
    "sweetness": 0-100,
    "balance": 0-100,
    "finish": 0-100,
    "aroma": 0-100
  },
  "scene": "데이트"
}`

  const parts: Array<Record<string, unknown>> = [{ text: prompt }, ...imageParts]

  let result: Record<string, unknown>
  try {
    result = await callGemini(parts, 0.3)
  } catch {
    return NextResponse.json({ error: "AI wine photo analysis failed" }, { status: 500 })
  }

  // Update or create AI analysis row
  const winePhotoData = {
    wine_tasting_ai: result.tasting ?? null,
    photo_classifications: result.photos ?? null,
  }
  if (latestAnalysis?.id) {
    await admin.from("record_ai_analyses").update(winePhotoData).eq("id", latestAnalysis.id)
  } else {
    await admin.from("record_ai_analyses").insert({
      record_id: recordId,
      raw_response: result,
      confidence_score: 0.7,
      ...winePhotoData,
    })
  }

  // Update record scene
  if (result.scene) {
    const validScenes = new Set<string>(WINE_SCENES.map((s) => s.value))
    if (validScenes.has(result.scene as string)) {
      await admin.from("records").update({ scene: result.scene }).eq("id", recordId)
    }
  }

  return NextResponse.json({ success: true, result })
}

async function handleCookingPhotos(
  admin: ReturnType<typeof createAdminClient>,
  record: Record<string, unknown>,
  recordId: string,
  imageParts: Array<Record<string, unknown>>,
) {
  const genreList = COOKING_GENRES.map((c) => `"${c.value}" → ${c.label}`).join(", ")
  const sceneList = COOKING_SCENES.map((s) => s.value).join(", ")

  const prompt = `당신은 가정 요리 분석 전문가입니다.

## 분석 항목
1. 요리명 추정
2. 장르 추정
3. 맛/식감 태그 추출
4. 상황 추정

## genre 허용 목록
${genreList}

## scene 허용 목록
${sceneList}

## 태그 허용 목록
FLAVOR_TAGS: ${FLAVOR_TAGS.join(", ")}
TEXTURE_TAGS: ${TEXTURE_TAGS.join(", ")}

## 응답 형식 (JSON)
{
  "menuName": "요리명",
  "genre": "korean",
  "scene": "일상식사",
  "flavorTags": ["고소한"],
  "textureTags": ["바삭한"]
}`

  const parts: Array<Record<string, unknown>> = [{ text: prompt }, ...imageParts]

  let result: Record<string, unknown>
  try {
    result = await callGemini(parts)
  } catch {
    return NextResponse.json({ error: "AI cooking photo analysis failed" }, { status: 500 })
  }

  const updateData: Record<string, unknown> = {}

  if (!record.menu_name && result.menuName) {
    updateData.menu_name = result.menuName
  }
  if (!record.genre && result.genre) {
    const validGenres = new Set<string>(COOKING_GENRES.map((c) => c.value))
    if (validGenres.has(result.genre as string)) {
      updateData.genre = result.genre
    }
  }
  if (result.scene) {
    const validScenes = new Set<string>(COOKING_SCENES.map((s) => s.value))
    if (validScenes.has(result.scene as string)) {
      updateData.scene = result.scene
    }
  }
  if (Array.isArray(result.flavorTags)) {
    const validTags = (result.flavorTags as string[]).filter((t) => VALID_FLAVOR_TAGS.has(t))
    if (validTags.length > 0) updateData.flavor_tags = validTags
  }
  if (Array.isArray(result.textureTags)) {
    const validTags = (result.textureTags as string[]).filter((t) => VALID_TEXTURE_TAGS.has(t))
    if (validTags.length > 0) updateData.texture_tags = validTags
  }

  if (Object.keys(updateData).length > 0) {
    await admin.from("records").update(updateData).eq("id", recordId)
  }

  return NextResponse.json({ success: true, result })
}
