import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'

export const config = {
  api: { bodyParser: { sizeLimit: '20mb' } },
}

// Next.js App Router body size limit
export const maxDuration = 30

const MAX_PHOTOS = 8
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024 // 5MB base64 ≈ 6.67MB string

interface NearbyPlace {
  externalId: string
  name: string
  address: string
  categoryName: string
}

interface AnalyzeVisitRequestBody {
  photos: string[]
  location: { lat: number; lng: number } | null
  nearbyPlaces: NearbyPlace[]
}

interface GeminiContentPart {
  text?: string
  inline_data?: {
    mime_type: string
    data: string
  }
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string
      }>
    }
  }>
}

interface PhotoAnalysis {
  index: number
  type: 'signboard' | 'menu' | 'companion' | 'receipt' | 'food' | 'other'
  description: string
}

interface MenuBoardItem {
  name: string
  price: number
}

interface VisitAnalysis {
  photos: PhotoAnalysis[]
  restaurant: {
    name: string
    matchedPlaceId: string | null
    confidence: number
  }
  menuBoard: MenuBoardItem[]
  orderedItems: string[]
  receipt: {
    totalCost: number | null
    perPersonCost: number | null
    itemCount: number | null
  }
  companions: {
    count: number
    occasion: string | null
  }
  category: string
  flavorTags: string[]
  textureTags: string[]
  estimatedVisitHour: number | null
}

const VALID_CATEGORIES = [
  'korean', 'japanese', 'chinese', 'western', 'cafe',
  'dessert', 'wine', 'seafood', 'meat', 'vegan', 'street',
] as const

const VALID_FLAVOR_TAGS = [
  '매운', '달콤한', '짭짤한', '시큼한', '감칠맛',
  '담백한', '기름진', '고소한', '향긋한', '깔끔한',
] as const

const VALID_TEXTURE_TAGS = [
  '바삭한', '부드러운', '쫄깃한', '크리미한', '아삭한', '촉촉한',
] as const

function buildPrompt(nearbyPlaces: NearbyPlace[]): string {
  const placesContext = nearbyPlaces.length > 0
    ? `\n\n## 주변 장소 목록 (GPS 기반)\n${nearbyPlaces.map((p, i) => `${i + 1}. [ID: ${p.externalId}] ${p.name} — ${p.address} (${p.categoryName})`).join('\n')}\n\n위 목록에서 방문한 장소와 일치하는 곳이 있으면 matchedPlaceId에 해당 externalId를 넣어주세요.`
    : '\n\n주변 장소 정보가 없습니다. matchedPlaceId는 null로 설정하세요.'

  return `당신은 음식점 방문 분석 전문가입니다. 사용자가 촬영한 여러 장의 사진을 종합적으로 분석하여 방문 정보를 추출해주세요.
${placesContext}

## 분석 지침

1. **사진 분류**: 각 사진이 어떤 종류인지 파악 (간판, 메뉴판, 동행자, 영수증, 음식, 기타)
2. **음식점 식별**: 간판, 메뉴판, 영수증 등에서 음식점 이름을 추출. 주변 장소 목록과 매칭 시도
3. **메뉴판 분석**: 메뉴판 사진이 있으면 메뉴명과 가격을 추출
4. **주문 메뉴 추정**: 음식 사진에서 실제 주문한 메뉴를 추정
5. **영수증 분석**: 총 금액, 인당 금액, 항목 수 추출
6. **동행자 파악**: 사진에 나타난 인원수와 모임 성격 추정
7. **카테고리/태그**: 음식 카테고리와 맛/식감 태그 분류

## 응답 형식 (JSON)

{
  "photos": [
    { "index": 0, "type": "food|signboard|menu|companion|receipt|other", "description": "사진 설명" }
  ],
  "restaurant": {
    "name": "음식점 이름 (파악 불가시 빈 문자열)",
    "matchedPlaceId": "주변 장소 목록의 externalId 또는 null",
    "confidence": 0.0~1.0
  },
  "menuBoard": [
    { "name": "메뉴명", "price": 가격(숫자) }
  ],
  "orderedItems": ["실제 주문 추정 메뉴명"],
  "receipt": {
    "totalCost": 총금액_또는_null,
    "perPersonCost": 인당금액_또는_null,
    "itemCount": 항목수_또는_null
  },
  "companions": {
    "count": 본인포함_총인원수(기본1),
    "occasion": "모임 성격 추정 (회식, 데이트, 가족모임, 친구모임, 혼밥 등) 또는 null"
  },
  "category": "${VALID_CATEGORIES.join(' | ')}",
  "flavorTags": [${VALID_FLAVOR_TAGS.map(t => `"${t}"`).join(', ')}] 중 해당하는 것,
  "textureTags": [${VALID_TEXTURE_TAGS.map(t => `"${t}"`).join(', ')}] 중 해당하는 것,
  "estimatedVisitHour": 0~23_방문시간_추정_또는_null
}

JSON만 반환하세요. 다른 텍스트는 포함하지 마세요.`
}

function validateAnalysis(parsed: unknown): parsed is VisitAnalysis {
  if (!parsed || typeof parsed !== 'object') return false

  const obj = parsed as Record<string, unknown>

  if (!Array.isArray(obj.photos)) return false
  if (!obj.restaurant || typeof obj.restaurant !== 'object') return false
  if (!Array.isArray(obj.menuBoard)) return false
  if (!Array.isArray(obj.orderedItems)) return false
  if (!obj.receipt || typeof obj.receipt !== 'object') return false
  if (!obj.companions || typeof obj.companions !== 'object') return false
  if (typeof obj.category !== 'string') return false
  if (!Array.isArray(obj.flavorTags)) return false
  if (!Array.isArray(obj.textureTags)) return false

  return true
}

export async function POST(request: NextRequest) {
  try {
    // Auth check — skip in development for testing
    if (process.env.NODE_ENV !== 'development') {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 },
        )
      }
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'AI service not configured' },
        { status: 503 },
      )
    }

    let body: AnalyzeVisitRequestBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 },
      )
    }

    if (!Array.isArray(body.photos) || body.photos.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one photo is required' },
        { status: 400 },
      )
    }

    if (body.photos.length > MAX_PHOTOS) {
      return NextResponse.json(
        { success: false, error: `Maximum ${MAX_PHOTOS} photos allowed` },
        { status: 400 },
      )
    }

    for (let i = 0; i < body.photos.length; i++) {
      const photoSize = Buffer.byteLength(body.photos[i], 'utf8')
      if (photoSize > MAX_PHOTO_SIZE_BYTES) {
        return NextResponse.json(
          { success: false, error: `Photo ${i + 1} exceeds 5MB limit` },
          { status: 400 },
        )
      }
    }

    const nearbyPlaces = Array.isArray(body.nearbyPlaces) ? body.nearbyPlaces : []

    const parts: GeminiContentPart[] = body.photos.map((photo) => ({
      inline_data: {
        mime_type: 'image/jpeg' as const,
        data: photo,
      },
    }))

    parts.push({ text: buildPrompt(nearbyPlaces) })

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { response_mime_type: 'application/json' },
        }),
      },
    )

    if (!geminiRes.ok) {
      const errorBody = await geminiRes.text().catch(() => '')
      console.error('[analyze-visit] Gemini API failed:', geminiRes.status, errorBody.slice(0, 500))
      return NextResponse.json(
        { success: false, error: 'AI analysis failed' },
        { status: 502 },
      )
    }

    const geminiData: GeminiResponse = await geminiRes.json()
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) {
      console.error('[analyze-visit] No text in Gemini response')
      return NextResponse.json(
        { success: false, error: 'AI returned empty response' },
        { status: 502 },
      )
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      console.error('[analyze-visit] Failed to parse Gemini JSON:', text.slice(0, 500))
      return NextResponse.json(
        { success: false, error: 'AI returned invalid response format' },
        { status: 502 },
      )
    }

    if (!validateAnalysis(parsed)) {
      console.error('[analyze-visit] Invalid analysis structure:', JSON.stringify(parsed).slice(0, 500))
      return NextResponse.json(
        { success: false, error: 'AI returned incomplete analysis' },
        { status: 502 },
      )
    }

    return NextResponse.json({ success: true, analysis: parsed })
  } catch (error) {
    console.error('[analyze-visit] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    )
  }
}
