import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'
import { searchKakaoLocal } from '@/infrastructure/api/kakao-local'
import { searchNaverLocal } from '@/infrastructure/api/naver-local'
import { searchGooglePlaces } from '@/infrastructure/api/google-places'
import type { RestaurantSearchResult } from '@/domain/entities/search'
import { haversineDistanceMeters } from '@/domain/services/distance'
import type { RestaurantPrestige } from '@/domain/entities/restaurant'
import { escapeForOrFilter } from '@/shared/utils/postgrest-filter'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const q = request.nextUrl.searchParams.get('q')
  const lat = request.nextUrl.searchParams.get('lat')
  const lng = request.nextUrl.searchParams.get('lng')

  if (!q || q.length < 1) {
    return NextResponse.json({ results: [] })
  }

  const safeQ = escapeForOrFilter(q)
  if (!safeQ) {
    return NextResponse.json({ results: [] })
  }

  // 한 글자: 앞쪽 % 없이 (인덱스 활용, 빠름) / 두 글자 이상: %쿼리% (어디든 포함)
  const pattern = safeQ.length === 1 ? `${safeQ}%` : `%${safeQ}%`

  // ── Step 1: Nyam DB 검색 (auth와 병렬) ──
  const [authResult, searchResult] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('restaurants')
      .select('id, name, genre, area, address, lat, lng, phone, kakao_map_url, prestige')
      .or(`name.ilike.${pattern},address.ilike.${pattern}`)
      .limit(20),
  ])

  if (authResult.error || !authResult.data.user) {
    return NextResponse.json({ results: [] }, { status: 401 })
  }

  const restaurants = searchResult.data
  const recordedIds = new Set<string>()

  // DB 내부 중복 제거: 같은 이름의 식당이 여러 행일 때 기록있는 것 우선
  const nyamDeduped = deduplicateNyamResults(restaurants ?? [], recordedIds)

  // 사용자의 satisfaction 평균 일괄 조회
  const userId = authResult.data.user.id
  const restaurantIds = nyamDeduped.map((r) => r.id)
  const scoreMap = new Map<string, number>()
  if (restaurantIds.length > 0) {
    const { data: scoreRows } = await supabase
      .from('records')
      .select('target_id, satisfaction')
      .eq('user_id', userId)
      .eq('target_type', 'restaurant')
      .in('target_id', restaurantIds)
      .not('satisfaction', 'is', null)
    if (scoreRows) {
      const grouped = new Map<string, number[]>()
      for (const row of scoreRows) {
        const arr = grouped.get(row.target_id) ?? []
        arr.push(row.satisfaction as number)
        grouped.set(row.target_id, arr)
      }
      for (const [id, scores] of grouped) {
        scoreMap.set(id, Math.round(scores.reduce((a, b) => a + b, 0) / scores.length))
      }
    }
  }

  const nyamResults: RestaurantSearchResult[] = nyamDeduped.map((r) => ({
    id: r.id,
    type: 'restaurant' as const,
    name: r.name,
    genre: r.genre,
    genreDisplay: r.genre,
    categoryPath: null,
    area: r.area,
    address: r.address,
    lat: r.lat,
    lng: r.lng,
    phone: r.phone,
    kakaoMapUrl: r.kakao_map_url,
    prestige: (r.prestige ?? []) as RestaurantPrestige[],
    distance: lat && lng && r.lat && r.lng
      ? haversineDistanceMeters(Number(lat), Number(lng), r.lat, r.lng)
      : null,
    hasRecord: recordedIds.has(r.id),
    myScore: scoreMap.get(r.id) ?? null,
  }))

  // Nyam DB 결과가 5개 이상이면 외부 API 스킵
  if (nyamResults.length >= 5) {
    return NextResponse.json({ results: sortResults(nyamResults) })
  }

  // ── Step 2: 외부 API 동시 호출 (폴백) ──
  const latNum = lat ? Number(lat) : undefined
  const lngNum = lng ? Number(lng) : undefined

  const [kakaoResult, naverResult, googleResult] = await Promise.allSettled([
    searchKakaoLocal(q, latNum, lngNum, { radius: 20000, size: 5 }),
    searchNaverLocal(q),
    searchGooglePlaces(q, latNum, lngNum, { radius: 20000, maxResults: 5 }),
  ])

  interface ExternalItem {
    name: string
    address: string
    lat: number | null
    lng: number | null
    genre: string | null
    genreDisplay: string | null
    categoryPath: string | null
    district: string | null
    phone: string | null
    kakaoMapUrl: string | null
    externalId: string
    externalIds: Record<string, string>
  }
  const externals: ExternalItem[] = []

  if (kakaoResult.status === 'fulfilled') {
    for (const item of kakaoResult.value) {
      const mapped = mapKakaoCategoryDetail(item.categoryDetail)
      const fallback = item.category ? mapKakaoCategory(item.category) : null
      externals.push({
        name: item.name, address: item.address, lat: item.lat, lng: item.lng,
        genre: mapped?.genre ?? fallback ?? '기타',
        genreDisplay: mapped?.display ?? fallback ?? '기타',
        categoryPath: item.categoryDetail,
        district: extractDistrict(item.address), phone: item.phone,
        kakaoMapUrl: item.kakaoMapUrl,
        externalId: `kakao_${item.kakaoId}`, externalIds: { kakao: item.kakaoId },
      })
    }
  }
  if (naverResult.status === 'fulfilled') {
    for (const item of naverResult.value) {
      externals.push({
        name: item.name, address: item.address, lat: item.lat, lng: item.lng,
        genre: (item.category ? mapNaverCategory(item.category) : null) ?? '기타',
        genreDisplay: (item.category ? mapNaverCategory(item.category) : null) ?? '기타',
        categoryPath: item.category ?? null,
        district: extractDistrict(item.address), phone: item.phone ?? null, kakaoMapUrl: null,
        externalId: `naver_${item.naverId ?? item.name}`,
        externalIds: item.naverId ? { naver: item.naverId } : {},
      })
    }
  }
  if (googleResult.status === 'fulfilled') {
    for (const item of googleResult.value) {
      externals.push({
        name: item.name, address: item.address, lat: item.lat, lng: item.lng,
        genre: '기타', genreDisplay: '기타', categoryPath: null,
        district: extractDistrict(item.address), phone: null, kakaoMapUrl: null,
        externalId: `google_${item.googlePlaceId}`, externalIds: { google: item.googlePlaceId },
      })
    }
  }

  // 중복 제거 (이름 + 좌표 근접 200m 이내면 같은 식당)
  const accepted: { name: string; lat: number | null; lng: number | null }[] =
    nyamResults.map((r) => ({ name: r.name, lat: r.lat, lng: r.lng }))

  const dedupedExternals = externals.filter((ext) => {
    if (isSameRestaurant(ext, accepted)) return false
    accepted.push({ name: ext.name, lat: ext.lat, lng: ext.lng })
    return true
  })

  const externalSearchResults: RestaurantSearchResult[] = dedupedExternals.map((ext) => ({
    id: ext.externalId,
    type: 'restaurant' as const,
    name: ext.name,
    genre: ext.genre,
    genreDisplay: ext.genreDisplay,
    categoryPath: ext.categoryPath,
    area: ext.district,
    address: ext.address,
    lat: ext.lat,
    lng: ext.lng,
    phone: ext.phone,
    kakaoMapUrl: ext.kakaoMapUrl,
    prestige: [],
    distance: latNum && lngNum && ext.lat && ext.lng
      ? haversineDistanceMeters(latNum, lngNum, ext.lat, ext.lng)
      : null,
    hasRecord: false,
  }))

  return NextResponse.json({
    results: sortResults([...nyamResults, ...externalSearchResults]),
  })
}

/** 결과 정렬: 거리순 → 이름순 */
function sortResults(results: RestaurantSearchResult[]): RestaurantSearchResult[] {
  return [...results].sort((a, b) => {
    if (a.distance !== null && b.distance !== null) return a.distance - b.distance
    if (a.distance !== null) return -1
    if (b.distance !== null) return 1
    return a.name.localeCompare(b.name)
  })
}

/** 중복 제거용 이름 정규화 */
function normalizeForDedup(name: string): string {
  return name.replace(/\s/g, '').toLowerCase()
}

/** 주소에서 구/군 추출 ("서울 강남구 도곡로 408" → "강남구") */
function extractDistrict(address: string | null): string | null {
  if (!address) return null
  const parts = address.split(' ')
  const found = parts.find((p) => /[구군시]$/.test(p) && p.length >= 2)
  return found ?? null
}

/** 카카오 카테고리 → SSOT 매핑 테이블 */
const KAKAO_TO_SSOT: Record<string, string> = {
  '한식': '한식',
  '일식': '일식',
  '중식': '중식',
  '분식': '한식',
  '양식': '이탈리안',
  '이탈리안': '이탈리안',
  '프랑스음식': '프렌치',
  '프렌치': '프렌치',
  '스페인음식': '스페인',
  '지중해음식': '지중해',
  '태국음식': '태국',
  '베트남음식': '베트남',
  '인도음식': '인도',
  '아시아음식': '베트남',
  '동남아음식': '태국',
  '멕시칸': '멕시칸',
  '남미음식': '멕시칸',
  '미국음식': '미국',
  '패스트푸드': '미국',
  '햄버거': '미국',
  '치킨': '한식',
  '피자': '이탈리안',
  '카페': '카페',
  '디저트': '베이커리',
  '베이커리': '베이커리',
  '제과': '베이커리',
  '떡카페': '카페',
  '아이스크림': '기타',
  '술집': '바/주점',
  '호프': '바/주점',
  '와인바': '바/주점',
  '칵테일바': '바/주점',
  '이자카야': '바/주점',
  '뷔페': '기타',
  '족발,보쌈': '한식',
  '국수': '한식',
  '죽': '한식',
  '고기,구이': '한식',
  '찜,탕,찌개': '한식',
  '해물,생선': '한식',
  '샐러드': '기타',
  '샌드위치': '미국',
  '스테이크,립': '미국',
  '브런치': '카페',
  '국밥': '한식',
  '곱창,막창': '한식',
  '닭갈비': '한식',
  '돈까스': '일식',
  '라멘': '일식',
  '우동': '일식',
  '초밥': '일식',
  '오므라이스': '일식',
  '덮밥': '일식',
  '커리': '인도',
  '쌀국수': '베트남',
  '타코': '멕시칸',
  '파스타': '이탈리안',
}

/** 카카오 세분류(category_name) → { genre: SSOT장르, display: "대분류 > 세분류" } */
function mapKakaoCategoryDetail(categoryDetail: string | null): { genre: string; display: string } | null {
  if (!categoryDetail) return null
  // "음식점 > 한식 > 냉면" → ["음식점", "한식", "냉면"]
  const parts = categoryDetail.split('>').map((s) => s.trim())
  // "음식점"(parts[0]) 제외하고 나머지에서 SSOT 매칭 탐색
  const subParts = parts.slice(1)
  if (subParts.length === 0) return null

  // 가장 구체적인 레벨부터 → 상위로 올라가며 SSOT 매칭
  for (let i = subParts.length - 1; i >= 0; i--) {
    // "제과,베이커리" 같은 콤마 합성어 → 각각 분리해서 매칭
    const tokens = subParts[i].split(',').map((s) => s.trim())
    for (const token of tokens) {
      const mapped = KAKAO_TO_SSOT[token]
      if (mapped) {
        const lastPart = subParts[subParts.length - 1]
        const display = mapped !== lastPart ? `${mapped} > ${lastPart}` : mapped
        return { genre: mapped, display }
      }
    }
  }

  // 어떤 레벨에서도 매칭 안 됨 → 마지막 세분류 표시
  const lastPart = subParts[subParts.length - 1]
  return { genre: '기타', display: `기타 > ${lastPart}` }
}

/** 카카오 대분류(category_group_name) → 장르 매핑 (폴백) */
function mapKakaoCategory(category: string): string | null {
  const map: Record<string, string> = {
    '음식점': '한식',
    '한식': '한식',
    '일식': '일식',
    '중식': '중식',
    '카페': '카페',
    '분식': '한식',
    '패스트푸드': '미국',
    '양식': '이탈리안',
  }
  return map[category] ?? null
}

/** 네이버 카테고리 → 장르 매핑 */
function mapNaverCategory(category: string): string | null {
  const primary = category.split('>')[0]?.trim()
  return primary || null
}

/** DB 내부 중복 제거: 이름+좌표 근접 기준 그룹핑, 기록 있는 행 우선 */
function deduplicateNyamResults(
  restaurants: { id: string; name: string; genre: string | null; area: string | null; address: string | null; lat: number | null; lng: number | null; phone: string | null; kakao_map_url: string | null; prestige: unknown }[],
  recordedIds: Set<string>,
): typeof restaurants {
  const groups: (typeof restaurants)[] = []

  for (const r of restaurants) {
    let merged = false
    for (const group of groups) {
      if (isSameRestaurant(r, [group[0]])) {
        group.push(r)
        merged = true
        break
      }
    }
    if (!merged) groups.push([r])
  }

  return groups.map((group) => {
    // 기록 있는 행 우선 → genre가 유의미한 행 → 첫 번째
    const withRecord = group.find((r) => recordedIds.has(r.id))
    const withGenre = group.find((r) => r.genre && r.genre !== '기타')
    return withRecord ?? withGenre ?? group[0]
  })
}

/** 같은 식당인지 판단 */
function isSameRestaurant(
  candidate: { name: string; lat: number | null; lng: number | null },
  existing: { name: string; lat: number | null; lng: number | null }[],
): boolean {
  const candName = normalizeForDedup(candidate.name)
  return existing.some((e) => {
    const eName = normalizeForDedup(e.name)
    const hasCoords = candidate.lat && candidate.lng && e.lat && e.lng
    const dist = hasCoords
      ? haversineDistanceMeters(candidate.lat ?? 0, candidate.lng ?? 0, e.lat ?? 0, e.lng ?? 0)
      : null

    // 1) 이름 완전 일치: 좌표 200m 이내 or 좌표 없으면 동일 판정
    if (candName === eName) {
      return dist === null || dist <= 200
    }

    // 2) 이름 유사 + 좌표 100m 이내: 철자 오차 허용 (편집거리 ≤2, 유사도 ≥70%)
    if (dist !== null && dist <= 100) {
      const longer = Math.max(candName.length, eName.length)
      const ed = editDistance(candName, eName)
      return ed <= 2 && ed / longer <= 0.3
    }

    return false
  })
}

/** Levenshtein 편집 거리 */
function editDistance(a: string, b: string): number {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  )
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[a.length][b.length]
}

