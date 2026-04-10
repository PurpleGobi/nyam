import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'
import { searchGooglePlaces } from '@/infrastructure/api/google-places'

interface KakaoCategoryDocument {
  id: string
  place_name: string
  category_group_name: string
  category_name: string
  road_address_name: string
  address_name: string
  phone: string
  distance: string
  x: string
  y: string
}

/** nearby API 응답 아이템 */
interface NearbyRestaurant {
  id: string
  kakaoId: string
  name: string
  genre: string | null
  categoryPath: string | null
  area: string | null
  address: string | null
  lat: number
  lng: number
  distance: number
  prestige: Array<{ type: string; grade: string }>
  inNyamDb: boolean
  restaurantId: string | null
  myScore: number | null
  nyamScore: number | null
  bubbleScore: number | null
  googleRating: number | null
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.KAKAO_REST_API_KEY
  if (!apiKey) {
    return NextResponse.json({ restaurants: [] }, { status: 500 })
  }

  const lat = Number(request.nextUrl.searchParams.get('lat'))
  const lng = Number(request.nextUrl.searchParams.get('lng'))
  const radius = Number(request.nextUrl.searchParams.get('radius') ?? 2000)
  const keyword = request.nextUrl.searchParams.get('keyword') ?? ''

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ restaurants: [] }, { status: 400 })
  }

  // --- 인증 (실패해도 카카오 데이터는 반환) ---
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null
  let userId: string | null = null
  try {
    supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id ?? null
  } catch {
    // 인증 실패 시 enrichment 스킵, 카카오 데이터만 반환
  }

  // --- 카카오 API 호출 (3페이지 = 최대 45건, 후보군 확보) ---
  let documents: KakaoCategoryDocument[] = []
  const endpoint = keyword
    ? 'https://dapi.kakao.com/v2/local/search/keyword.json'
    : 'https://dapi.kakao.com/v2/local/search/category.json'

  const baseParams: Record<string, string> = {
    category_group_code: 'FD6',
    x: String(lng),
    y: String(lat),
    radius: String(radius),
    sort: 'distance',
    size: '15',
  }
  if (keyword) baseParams.query = keyword

  // 1페이지 먼저 호출하여 총 개수 확인
  const firstRes = await fetch(
    `${endpoint}?${new URLSearchParams({ ...baseParams, page: '1' })}`,
    { headers: { Authorization: `KakaoAK ${apiKey}` } },
  )

  if (firstRes.ok) {
    const firstData = await firstRes.json()
    documents = firstData.documents ?? []
    const totalCount: number = firstData.meta?.total_count ?? 0

    // 2, 3페이지 병렬 호출 (데이터가 더 있으면)
    if (totalCount > 15) {
      const extraPages = Math.min(Math.ceil(totalCount / 15), 3)
      const pagePromises: Promise<KakaoCategoryDocument[]>[] = []
      for (let p = 2; p <= extraPages; p++) {
        pagePromises.push(
          fetch(
            `${endpoint}?${new URLSearchParams({ ...baseParams, page: String(p) })}`,
            { headers: { Authorization: `KakaoAK ${apiKey}` } },
          ).then(async (res) => {
            if (!res.ok) return []
            const data = await res.json()
            return (data.documents ?? []) as KakaoCategoryDocument[]
          }).catch(() => [] as KakaoCategoryDocument[]),
        )
      }
      const extraResults = await Promise.all(pagePromises)
      for (const docs of extraResults) {
        documents.push(...docs)
      }
    }
  }

  // 중복 제거 (카카오 ID 기준)
  const seen = new Set<string>()
  documents = documents.filter((d) => {
    if (seen.has(d.id)) return false
    seen.add(d.id)
    return true
  })

  const kakaoIds = documents.map((d) => d.id)

  // --- Enrichment (실패해도 기본 카카오 데이터는 반환) ---
  const rpMap = new Map<string, Array<{ type: string; grade: string }>>()
  const matchedMap = new Map<string, {
    restaurantId: string
    nyamScore: number | null
    googleRating: number | null
  }>()
  const myScoreMap = new Map<string, number>()
  const googleRatingMap = new Map<string, number | null>()

  if (kakaoIds.length > 0 && supabase) {
    try {
      // restaurant_prestige 조회 (기존 로직)
      const { data: rpRows } = await supabase
        .from('restaurant_prestige')
        .select('kakao_id, prestige_type, prestige_grade')
        .in('kakao_id', kakaoIds)

      if (rpRows) {
        for (const r of rpRows) {
          if (!r.kakao_id) continue
          const existing = rpMap.get(r.kakao_id) ?? []
          existing.push({ type: r.prestige_type, grade: r.prestige_grade })
          rpMap.set(r.kakao_id, existing)
        }
      }
    } catch {
      // prestige 조회 실패 시 무시
    }

    try {
      // restaurants 테이블에서 kakao ID로 매칭
      // RPC로 JSONB path 검색 (PostgREST .in()은 JSONB path 미지원)
      const { data: matchedRestaurants } = await supabase
        .from('restaurants')
        .select('id, external_ids, nyam_score, google_rating')
        .filter('external_ids->>kakao', 'in', `(${kakaoIds.join(',')})`)

      if (matchedRestaurants) {
        for (const r of matchedRestaurants) {
          const externalIds = r.external_ids as { kakao?: string } | null
          const kId = externalIds?.kakao
          if (!kId) continue
          matchedMap.set(kId, {
            restaurantId: r.id,
            nyamScore: r.nyam_score ?? null,
            googleRating: r.google_rating ?? null,
          })
        }
      }
    } catch {
      // 매칭 실패 시 무시
    }

    try {
      // 인증된 유저의 satisfaction 평균 (매칭된 식당에 대해서만)
      if (userId && matchedMap.size > 0) {
        const restaurantIds = [...matchedMap.values()].map((m) => m.restaurantId)
        const { data: records } = await supabase
          .from('records')
          .select('restaurant_id, satisfaction')
          .eq('user_id', userId)
          .in('restaurant_id', restaurantIds)
          .not('satisfaction', 'is', null)

        if (records) {
          const satMap = new Map<string, number[]>()
          for (const rec of records) {
            const arr = satMap.get(rec.restaurant_id) ?? []
            arr.push(rec.satisfaction as number)
            satMap.set(rec.restaurant_id, arr)
          }
          for (const [kId, match] of matchedMap.entries()) {
            const sats = satMap.get(match.restaurantId)
            if (sats && sats.length > 0) {
              const avg = sats.reduce((s, v) => s + v, 0) / sats.length
              myScoreMap.set(kId, Math.round(avg * 10) / 10)
            }
          }
        }
      }
    } catch {
      // 점수 조회 실패 시 무시
    }
  }

  // --- 미매칭 식당: Google Places rating 조회 (최대 10건) ---
  try {
    const unmatchedDocs = documents.filter((d) => {
      const match = matchedMap.get(d.id)
      return !match || match.googleRating == null
    })
    const googleBatch = unmatchedDocs.slice(0, 10)

    if (googleBatch.length > 0) {
      const googleResults = await Promise.allSettled(
        googleBatch.map(async (doc) => {
          const query = `${doc.place_name} ${doc.road_address_name || doc.address_name}`
          const results = await searchGooglePlaces(query, Number(doc.y), Number(doc.x), {
            radius: 500,
            maxResults: 1,
          })
          return { kakaoId: doc.id, rating: results[0]?.rating ?? null }
        }),
      )
      for (const result of googleResults) {
        if (result.status === 'fulfilled') {
          googleRatingMap.set(result.value.kakaoId, result.value.rating)
        }
      }
    }
  } catch {
    // Google Places 전체 실패 시 무시
  }

  // --- 응답 조합 ---
  const restaurants: NearbyRestaurant[] = documents.map((d) => {
    const match = matchedMap.get(d.id)
    const googleFromDb = match?.googleRating ?? null
    const googleFromApi = googleRatingMap.get(d.id) ?? null

    return {
      id: `kakao_${d.id}`,
      kakaoId: d.id,
      name: d.place_name,
      genre: extractGenre(d.category_name),
      categoryPath: d.category_name || null,
      area: extractArea(d.road_address_name || d.address_name),
      address: d.road_address_name || d.address_name || null,
      lat: Number(d.y),
      lng: Number(d.x),
      distance: Number(d.distance),
      prestige: rpMap.get(d.id) ?? [],
      inNyamDb: match != null,
      restaurantId: match?.restaurantId ?? null,
      myScore: myScoreMap.get(d.id) ?? null,
      nyamScore: match?.nyamScore ?? null,
      bubbleScore: null, // Phase 2에서 추가
      googleRating: googleFromDb ?? googleFromApi,
    }
  })

  return NextResponse.json({ restaurants })
}

const KAKAO_TO_SSOT: Record<string, string> = {
  '한식': '한식', '일식': '일식', '중식': '중식', '분식': '한식',
  '양식': '이탈리안', '이탈리안': '이탈리안', '프랑스음식': '프렌치', '프렌치': '프렌치',
  '스페인음식': '스페인', '지중해음식': '지중해', '태국음식': '태국', '베트남음식': '베트남',
  '인도음식': '인도', '아시아음식': '베트남', '동남아음식': '태국',
  '멕시칸': '멕시칸', '남미음식': '멕시칸', '미국음식': '미국', '패스트푸드': '미국',
  '햄버거': '미국', '치킨': '한식', '피자': '이탈리안',
  '카페': '카페', '떡카페': '카페', '디저트': '베이커리', '베이커리': '베이커리',
  '제과': '베이커리', '아이스크림': '기타',
  '술집': '바/주점', '호프': '바/주점', '와인바': '바/주점', '칵테일바': '바/주점',
  '이자카야': '바/주점', '뷔페': '기타', '족발,보쌈': '한식', '국수': '한식',
  '고기,구이': '한식', '찜,탕,찌개': '한식', '해물,생선': '한식',
  '샌드위치': '미국', '스테이크,립': '미국', '브런치': '카페',
  '돈까스': '일식', '라멘': '일식', '우동': '일식', '초밥': '일식',
  '커리': '인도', '쌀국수': '베트남', '파스타': '이탈리안',
}

function extractGenre(categoryName: string | null): string | null {
  if (!categoryName) return null
  // "음식점 > 한식 > 냉면" → ["음식점", "한식", "냉면"]
  const parts = categoryName.split('>').map((s) => s.trim())
  const subParts = parts.slice(1)
  // 가장 구체적인 레벨부터 상위로 올라가며 SSOT 매칭
  for (let i = subParts.length - 1; i >= 0; i--) {
    const tokens = subParts[i].split(',').map((s) => s.trim())
    for (const token of tokens) {
      const mapped = KAKAO_TO_SSOT[token]
      if (mapped) return mapped
    }
  }
  return '기타'
}

function extractArea(address: string | null): string | null {
  if (!address) return null
  const parts = address.split(' ')
  return parts.length >= 3 ? parts.slice(1, 3).join(' ') : null
}
