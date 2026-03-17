import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/infrastructure/supabase/server"
import { FOOD_CATEGORIES } from "@/shared/constants/categories"
import { FLAVOR_TAGS, TEXTURE_TAGS } from "@/shared/constants/tags"
import { RESTAURANT_SCENES, WINE_SCENES, COOKING_SCENES } from "@/shared/constants/scenes"

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent"
const GEMINI_TIMEOUT_MS = 30_000

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { photos, recordType, nearbyPlaces } = body as {
    photos: string[]
    recordType: "restaurant" | "wine" | "cooking"
    nearbyPlaces: Array<{ externalId: string; name: string; address: string; categoryName: string }>
  }

  if (!photos?.length || !recordType) {
    return NextResponse.json({ error: "photos and recordType are required" }, { status: 400 })
  }

  const scenesMap = {
    restaurant: RESTAURANT_SCENES.map((s) => s.value).join(", "),
    wine: WINE_SCENES.map((s) => s.value).join(", "),
    cooking: COOKING_SCENES.map((s) => s.value).join(", "),
  }

  const prompt = buildPrompt(recordType, nearbyPlaces ?? [], scenesMap[recordType])

  const parts: Array<Record<string, unknown>> = [{ text: prompt }]

  for (const photo of photos.slice(0, 8)) {
    parts.push({
      inline_data: {
        mime_type: "image/jpeg",
        data: photo.replace(/^data:image\/\w+;base64,/, ""),
      },
    })
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS)
  const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    }),
    signal: controller.signal,
  })
  clearTimeout(timer)

  if (!geminiResponse.ok) {
    return NextResponse.json(
      { error: "AI analysis failed" },
      { status: 500 },
    )
  }

  const geminiData = await geminiResponse.json()
  const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}"

  let analysis: Record<string, unknown>
  try {
    analysis = JSON.parse(rawText)
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 })
  }

  const result = sanitizeAnalysis(analysis, recordType)

  return NextResponse.json({ success: true, analysis: result })
}

function buildPrompt(
  recordType: string,
  nearbyPlaces: Array<{ externalId: string; name: string; address: string; categoryName: string }>,
  scenes: string,
): string {
  const base = `사진을 분석하여 JSON으로 응답하세요. scene은 [${scenes}] 중 하나를 선택하세요.`

  if (recordType === "restaurant") {
    const genreList = FOOD_CATEGORIES.map((c) => `"${c.value}" (${c.label})`).join(", ")
    const nearby = nearbyPlaces.length > 0
      ? `주변 식당: ${nearbyPlaces.map((p) => `${p.name}(${p.address})`).join(", ")}`
      : ""
    return `${base}
${nearby}
genre는 [${genreList}] 중 하나, flavorTags는 [${FLAVOR_TAGS.join(", ")}], textureTags는 [${TEXTURE_TAGS.join(", ")}]에서만 선택.
{
  "photos": [{"index": 0, "type": "food|menu|receipt|interior|exterior|other", "description": "..."}],
  "scene": "...",
  "restaurant": {"name": "...", "matchedPlaceId": "...", "confidence": 0.0-1.0, "genre": "...", "orderedItems": ["..."], "menuBoard": [{"name": "...", "price": 0}], "receipt": {"totalCost": 0, "perPersonCost": 0, "itemCount": 0}, "companions": {"count": 1, "occasion": "..."}, "estimatedVisitHour": 0, "flavorTags": ["..."], "textureTags": ["..."]}
}`
  }

  if (recordType === "wine") {
    return `${base}
와인 라벨, 병, 잔 등 사진을 분석하여 와인을 식별하세요.
{
  "photos": [{"index": 0, "type": "label|bottle|glass|food|other", "description": "..."}],
  "scene": "...",
  "wine": {"name": "...", "vintage": 0, "origin": {"country": "...", "region": "..."}, "variety": "...", "confidence": 0.0-1.0}
}`
  }

  return `${base}
요리 사진을 분석하여 요리명, 장르, 태그를 추출하세요. flavorTags는 [${FLAVOR_TAGS.join(", ")}], textureTags는 [${TEXTURE_TAGS.join(", ")}]에서만 선택.
{
  "photos": [{"index": 0, "type": "dish|ingredient|process|plating|other", "description": "..."}],
  "scene": "...",
  "cooking": {"dishName": "...", "genre": "korean|western|chinese|japanese|baking|dessert|beverage", "flavorTags": ["..."], "textureTags": ["..."]}
}`
}

function sanitizeAnalysis(analysis: Record<string, unknown>, recordType: string): Record<string, unknown> {
  const validFlavors = new Set<string>(FLAVOR_TAGS)
  const validTextures = new Set<string>(TEXTURE_TAGS)

  if (recordType === "restaurant" && analysis.restaurant) {
    const restaurant = analysis.restaurant as Record<string, unknown>
    const validGenres = new Set<string>(FOOD_CATEGORIES.map((c) => c.value))
    if (restaurant.genre && !validGenres.has(restaurant.genre as string)) {
      restaurant.genre = null
    }
    if (Array.isArray(restaurant.flavorTags)) {
      restaurant.flavorTags = (restaurant.flavorTags as string[]).filter((t) => validFlavors.has(t))
    }
    if (Array.isArray(restaurant.textureTags)) {
      restaurant.textureTags = (restaurant.textureTags as string[]).filter((t) => validTextures.has(t))
    }
  }

  return analysis
}
