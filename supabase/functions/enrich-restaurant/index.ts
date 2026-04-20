// supabase/functions/enrich-restaurant/index.ts
//
// 회원 리뷰 없는 식당을 위한 외부 정보 AI 요약 + 사진 폴백 수집.
// 1회 Gemini 호출로 pros/cons/atmosphere/price/signatures + source_ids 역추적을 생성.
//
// 입력:  { restaurant_id: string }
// 인증:  Bearer SUPABASE_SERVICE_ROLE_KEY
// 상태:  pending → processing → done | failed (DB에 기록)
//
// 수집 소스:
//   1) Tavily Search     — 블로그/언론/유튜브 상위 N
//   2) Google Places     — 평점/리뷰 수/대표 리뷰 + 사진 name
//   3) Naver Local       — 평점/리뷰 수/공식 정보
//   4) Gemini 1회 호출   — JSON 스키마로 요약 + source_ids
//
// 원칙:
//   - 외부 리뷰 원문 저장 금지 (링크 + 메타 + AI 생성물만)
//   - 20자 이내 직접 인용만 AI에 허용
//   - Google Photo는 photo_name만 저장 (실제 URL은 API 프록시에서 처리)

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type SupabaseClient = ReturnType<typeof createClient>

// ═══════════════════════════════════════════════════════════
// 타입 정의 (domain/entities/restaurant-enrichment.ts와 동기)
// ═══════════════════════════════════════════════════════════

type SourceType =
  | 'naver_blog'
  | 'naver_local'
  | 'naver_news'
  | 'google_review'
  | 'google_place'
  | 'youtube'
  | 'kakao_local'
  | 'other_web'

interface EnrichmentSource {
  id: number
  type: SourceType
  url: string
  title: string
  snippet?: string
  fetched_at: string
}

interface AiSummary {
  pros: { text: string; quote?: string; source_ids: number[] }[]
  cons: { text: string; quote?: string; source_ids: number[] }[]
  atmosphere: { tags: string[]; source_ids: number[] } | null
  price_range: { text: string; source_ids: number[] } | null
  signatures: { name: string; mention_count: number; source_ids: number[] }[]
  overall_note: string | null
}

interface ExternalRatings {
  naver: { rating: number; count: number; url: string } | null
  google: { rating: number; count: number; url: string } | null
}

// ═══════════════════════════════════════════════════════════
// 상수
// ═══════════════════════════════════════════════════════════

const MAX_SOURCES = 15
const MAX_PHOTOS = 5
const FRESH_HOURS = 24 // 최근 N시간 내 성공 시 skip
const PROCESSING_TIMEOUT_MIN = 5 // 이 시간 넘은 processing은 무시하고 재시도

// ═══════════════════════════════════════════════════════════
// 유틸
// ═══════════════════════════════════════════════════════════

function nowIso(): string {
  return new Date().toISOString()
}

function safeJsonParse<T>(text: string): T | null {
  try {
    const trimmed = text.trim()
    // Gemini는 가끔 ```json ... ``` 로 감쌈
    const cleaned = trimmed
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()
    return JSON.parse(cleaned) as T
  } catch {
    return null
  }
}

function truncate(s: string, n: number): string {
  if (!s) return ''
  return s.length <= n ? s : s.slice(0, n) + '…'
}

// ═══════════════════════════════════════════════════════════
// 외부 API 수집
// ═══════════════════════════════════════════════════════════

interface RestaurantMeta {
  id: string
  name: string
  district: string | null
  genre: string | null
  address: string | null
}

async function fetchRestaurantMeta(
  supabase: SupabaseClient,
  restaurantId: string,
): Promise<RestaurantMeta | null> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, name, district, genre, address')
    .eq('id', restaurantId)
    .maybeSingle()
  if (error || !data) return null
  return data as RestaurantMeta
}

// ─── Tavily ─────────────────────────────────────────────────

interface TavilyResult {
  url: string
  title: string
  content: string
  score?: number
}

async function searchTavily(query: string): Promise<TavilyResult[]> {
  const apiKey = Deno.env.get('TAVILY_API_KEY')
  if (!apiKey) return []

  try {
    const resp = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic',
        max_results: 10,
        include_answer: false,
        include_raw_content: false,
      }),
    })
    if (!resp.ok) return []
    const data = await resp.json()
    return (data.results as TavilyResult[] | undefined) ?? []
  } catch {
    return []
  }
}

function classifySourceType(url: string): SourceType {
  const u = url.toLowerCase()
  if (u.includes('blog.naver.com') || u.includes('m.blog.naver.com')) return 'naver_blog'
  if (u.includes('news.naver.com')) return 'naver_news'
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube'
  if (u.includes('place.map.kakao.com') || u.includes('kakaomap.com')) return 'kakao_local'
  return 'other_web'
}

// ─── Google Places (New API v1) ─────────────────────────────

interface GooglePlaceData {
  placeId: string | null
  rating: number | null
  userRatingCount: number | null
  googleMapsUri: string | null
  reviews: { text: string; authorName?: string; rating?: number; publishTime?: string }[]
  photoNames: string[]
}

async function searchGooglePlace(meta: RestaurantMeta): Promise<GooglePlaceData> {
  const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY')
  const empty: GooglePlaceData = {
    placeId: null,
    rating: null,
    userRatingCount: null,
    googleMapsUri: null,
    reviews: [],
    photoNames: [],
  }
  if (!apiKey) return empty

  const query = [meta.name, meta.district, meta.address].filter(Boolean).join(' ')

  try {
    // Step 1: Text Search
    const searchResp = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress',
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: 'ko',
        regionCode: 'KR',
        maxResultCount: 1,
      }),
    })
    if (!searchResp.ok) return empty
    const searchData = await searchResp.json()
    const place = (searchData.places as Array<{ id: string }> | undefined)?.[0]
    if (!place?.id) return empty

    // Step 2: Place Details (rating + reviews + photos)
    const detailsResp = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(place.id)}?languageCode=ko&regionCode=KR`,
      {
        method: 'GET',
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'id,rating,userRatingCount,googleMapsUri,reviews,photos',
        },
      },
    )
    if (!detailsResp.ok) {
      return {
        ...empty,
        placeId: place.id,
      }
    }
    const d = await detailsResp.json()

    return {
      placeId: place.id,
      rating: typeof d.rating === 'number' ? d.rating : null,
      userRatingCount: typeof d.userRatingCount === 'number' ? d.userRatingCount : null,
      googleMapsUri: typeof d.googleMapsUri === 'string' ? d.googleMapsUri : null,
      reviews: Array.isArray(d.reviews)
        ? d.reviews.slice(0, 5).map((r: Record<string, unknown>) => ({
            text:
              (r.text as { text?: string } | undefined)?.text ??
              (r.originalText as { text?: string } | undefined)?.text ??
              '',
            authorName: (r.authorAttribution as { displayName?: string } | undefined)?.displayName,
            rating: typeof r.rating === 'number' ? r.rating : undefined,
            publishTime: typeof r.publishTime === 'string' ? r.publishTime : undefined,
          }))
        : [],
      photoNames: Array.isArray(d.photos)
        ? d.photos
            .slice(0, MAX_PHOTOS)
            .map((p: Record<string, unknown>) => String(p.name ?? ''))
            .filter((n: string) => n.length > 0)
        : [],
    }
  } catch {
    return empty
  }
}

// ─── Naver Local ────────────────────────────────────────────

interface NaverLocalItem {
  title: string
  link: string
  category: string
  address: string
  roadAddress: string
}

async function searchNaverLocal(query: string): Promise<NaverLocalItem | null> {
  const clientId = Deno.env.get('NAVER_CLIENT_ID')
  const clientSecret = Deno.env.get('NAVER_CLIENT_SECRET')
  if (!clientId || !clientSecret) return null

  try {
    const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=1`
    const resp = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    })
    if (!resp.ok) return null
    const data = await resp.json()
    const item = (data.items as NaverLocalItem[] | undefined)?.[0]
    if (!item) return null
    return {
      ...item,
      title: item.title.replace(/<[^>]+>/g, ''),
    }
  } catch {
    return null
  }
}

// ─── Gemini 요약 ────────────────────────────────────────────

async function summarizeWithGemini(
  meta: RestaurantMeta,
  sources: EnrichmentSource[],
): Promise<AiSummary | null> {
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey || sources.length === 0) return null

  const systemInstruction = [
    '너는 한국 맛집 정보 큐레이터다.',
    '주어진 외부 리뷰/블로그/뉴스 자료를 종합해 식당의 객관적 프로필을 JSON으로 요약하라.',
    '',
    '엄격한 규칙:',
    '1. 자료에 없는 정보는 절대 추측 금지. 해당 항목을 null 또는 빈 배열로.',
    '2. 각 claim에 반드시 source_ids (자료 인덱스 배열) 필수.',
    '3. 직접 인용(quote)은 20자 이내만 허용. 초과 시 요약으로 대체.',
    '4. 광고성/부정확한 내용 배제. 다수 소스에서 반복되는 내용 우선.',
    '5. 출력은 엄격한 JSON. 설명 문장 금지. 마크다운 금지.',
  ].join('\n')

  const sourcesBlock = sources
    .map((s) => {
      const snippet = truncate(s.snippet ?? '', 500)
      return `[${s.id}] ${s.type} | "${s.title}" | ${s.url}\n  스니펫: ${snippet}`
    })
    .join('\n\n')

  const userPrompt = [
    `식당: ${meta.name} (${meta.district ?? '지역정보없음'}, ${meta.genre ?? '장르정보없음'})`,
    '',
    '자료:',
    sourcesBlock,
    '',
    '위 자료만을 근거로 다음 스키마에 맞는 JSON을 생성:',
    '{',
    '  "pros": [{ "text": "한 줄 장점", "quote": "20자 이내 직접 인용 (없으면 생략)", "source_ids": [0,2] }],',
    '  "cons": [{ "text": "한 줄 단점", "quote": "20자 이내", "source_ids": [1] }],',
    '  "atmosphere": { "tags": ["데이트", "프라이빗"], "source_ids": [0,3] },',
    '  "price_range": { "text": "2~3만원대 · 코스 8만", "source_ids": [0] },',
    '  "signatures": [{ "name": "메뉴명", "mention_count": 4, "source_ids": [0,1,2,3] }],',
    '  "overall_note": "자료 신뢰도나 공통 맥락에 대한 한 줄 코멘트"',
    '}',
    '',
    'pros/cons는 각 최대 3개. signatures는 최대 5개. atmosphere.tags는 최대 4개.',
  ].join('\n')

  const model = 'gemini-1.5-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.9,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      }),
    })
    if (!resp.ok) return null
    const data = await resp.json()
    const text = (data.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }> | undefined)?.[0]
      ?.content?.parts?.[0]?.text
    if (!text) return null
    return safeJsonParse<AiSummary>(text)
  } catch {
    return null
  }
}

// ═══════════════════════════════════════════════════════════
// 상태 머신
// ═══════════════════════════════════════════════════════════

interface EnrichmentRow {
  restaurant_id: string
  status: 'pending' | 'processing' | 'done' | 'failed'
  enriched_at: string | null
  expires_at: string
  updated_at: string
}

async function readStatus(
  supabase: SupabaseClient,
  restaurantId: string,
): Promise<EnrichmentRow | null> {
  const { data } = await supabase
    .from('restaurant_enrichment')
    .select('restaurant_id, status, enriched_at, expires_at, updated_at')
    .eq('restaurant_id', restaurantId)
    .maybeSingle()
  return (data as EnrichmentRow | null) ?? null
}

function shouldSkip(existing: EnrichmentRow | null): boolean {
  if (!existing) return false

  // 완료 후 아직 유효
  if (existing.status === 'done') {
    const expiresAt = new Date(existing.expires_at).getTime()
    if (expiresAt > Date.now()) return true
  }

  // 다른 요청이 처리 중 (타임아웃 범위 내)
  if (existing.status === 'processing') {
    const updatedAt = new Date(existing.updated_at).getTime()
    const ageMs = Date.now() - updatedAt
    if (ageMs < PROCESSING_TIMEOUT_MIN * 60 * 1000) return true
  }

  return false
}

async function markProcessing(
  supabase: SupabaseClient,
  restaurantId: string,
): Promise<void> {
  await supabase
    .from('restaurant_enrichment')
    .upsert(
      {
        restaurant_id: restaurantId,
        status: 'processing',
        error_message: null,
        updated_at: nowIso(),
      },
      { onConflict: 'restaurant_id' },
    )
}

async function markDone(
  supabase: SupabaseClient,
  restaurantId: string,
  payload: {
    sources: EnrichmentSource[]
    aiSummary: AiSummary | null
    externalRatings: ExternalRatings
    photoUrls: string[]
    photoAttributions: string[]
  },
): Promise<void> {
  await supabase
    .from('restaurant_enrichment')
    .upsert(
      {
        restaurant_id: restaurantId,
        sources: payload.sources,
        ai_summary: payload.aiSummary,
        external_ratings: payload.externalRatings,
        photo_urls: payload.photoUrls,
        photo_attributions: payload.photoAttributions,
        status: 'done',
        error_message: null,
        enriched_at: nowIso(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: 'restaurant_id' },
    )
}

async function markFailed(
  supabase: SupabaseClient,
  restaurantId: string,
  message: string,
): Promise<void> {
  await supabase
    .from('restaurant_enrichment')
    .upsert(
      {
        restaurant_id: restaurantId,
        status: 'failed',
        error_message: truncate(message, 500),
      },
      { onConflict: 'restaurant_id' },
    )
}

// ═══════════════════════════════════════════════════════════
// Edge Function 본체
// ═══════════════════════════════════════════════════════════

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing Supabase env' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  let payload: { restaurant_id?: string }
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const restaurantId = payload.restaurant_id
  if (!restaurantId) {
    return new Response(JSON.stringify({ error: 'restaurant_id required' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  // Step 1. 상태 확인 → skip 여부
  const existing = await readStatus(supabase, restaurantId)
  if (shouldSkip(existing)) {
    return new Response(
      JSON.stringify({ success: true, skipped: true, status: existing?.status }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  }

  // Step 2. 식당 메타 확인
  const meta = await fetchRestaurantMeta(supabase, restaurantId)
  if (!meta) {
    return new Response(JSON.stringify({ error: 'restaurant not found' }), {
      status: 404,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  // Step 3. processing 마킹
  await markProcessing(supabase, restaurantId)

  try {
    const searchQuery = [meta.name, meta.district].filter(Boolean).join(' ')

    // Step 4. 병렬 수집
    const [tavilyResults, googlePlace, naverLocal] = await Promise.all([
      searchTavily(`${searchQuery} 맛집`),
      searchGooglePlace(meta),
      searchNaverLocal(searchQuery),
    ])

    // Step 5. 소스 인덱싱
    const sources: EnrichmentSource[] = []
    let nextId = 0

    // 5-1. Google reviews (텍스트만 스니펫으로 사용, URL은 googleMapsUri 공용)
    for (const r of googlePlace.reviews) {
      if (!r.text) continue
      sources.push({
        id: nextId++,
        type: 'google_review',
        url: googlePlace.googleMapsUri ?? '',
        title: `Google 리뷰${r.authorName ? ` (${r.authorName})` : ''}`,
        snippet: truncate(r.text, 400),
        fetched_at: nowIso(),
      })
      if (sources.length >= MAX_SOURCES) break
    }

    // 5-2. Naver Local 공식
    if (naverLocal && sources.length < MAX_SOURCES) {
      sources.push({
        id: nextId++,
        type: 'naver_local',
        url: naverLocal.link,
        title: `네이버 Local · ${naverLocal.title}`,
        snippet: `카테고리: ${naverLocal.category} · 주소: ${naverLocal.roadAddress || naverLocal.address}`,
        fetched_at: nowIso(),
      })
    }

    // 5-3. Tavily (블로그/유튜브/언론 등)
    for (const t of tavilyResults) {
      if (sources.length >= MAX_SOURCES) break
      if (!t.url) continue
      sources.push({
        id: nextId++,
        type: classifySourceType(t.url),
        url: t.url,
        title: t.title,
        snippet: truncate(t.content, 400),
        fetched_at: nowIso(),
      })
    }

    // Step 6. AI 요약 (1회 호출)
    const aiSummary = await summarizeWithGemini(meta, sources)

    // Step 7. 평점 배지
    const externalRatings: ExternalRatings = {
      naver: null, // Naver Local 공식 API는 평점/리뷰수 제공 X — 프론트에서 place.map.naver.com 링크만
      google:
        googlePlace.rating != null && googlePlace.userRatingCount != null && googlePlace.googleMapsUri
          ? {
              rating: googlePlace.rating,
              count: googlePlace.userRatingCount,
              url: googlePlace.googleMapsUri,
            }
          : null,
    }

    // Step 8. 사진 (Google Photos 이름만 저장 — 실제 URL은 Next.js API 프록시가 처리)
    const photoUrls = googlePlace.photoNames
    const photoAttributions = photoUrls.map(() => 'Google')

    // Step 9. 완료
    await markDone(supabase, restaurantId, {
      sources,
      aiSummary,
      externalRatings,
      photoUrls,
      photoAttributions,
    })

    return new Response(
      JSON.stringify({
        success: true,
        source_count: sources.length,
        ai_summary_generated: aiSummary != null,
        google_rating: externalRatings.google?.rating ?? null,
        photo_count: photoUrls.length,
      }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await markFailed(supabase, restaurantId, message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
