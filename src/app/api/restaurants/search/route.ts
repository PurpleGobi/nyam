import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'
import { searchKakaoLocal } from '@/infrastructure/api/kakao-local'
import { searchNaverLocal } from '@/infrastructure/api/naver-local'
import { searchGooglePlaces } from '@/infrastructure/api/google-places'
import type { RestaurantSearchResult } from '@/domain/entities/search'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ results: [] }, { status: 401 })
  }

  const q = request.nextUrl.searchParams.get('q')
  const lat = request.nextUrl.searchParams.get('lat')
  const lng = request.nextUrl.searchParams.get('lng')

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  // ── Step 1: Nyam DB 검색 ──
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name, genre, area, address, lat, lng')
    .or(`name.ilike.%${q}%,address.ilike.%${q}%`)
    .limit(20)

  const restaurantIds = (restaurants ?? []).map((r) => r.id)
  const { data: userRecords } = restaurantIds.length > 0
    ? await supabase
        .from('records')
        .select('target_id')
        .eq('user_id', user.id)
        .eq('target_type', 'restaurant')
        .in('target_id', restaurantIds)
    : { data: [] }

  const recordedIds = new Set((userRecords ?? []).map((r) => r.target_id))

  const nyamResults: RestaurantSearchResult[] = (restaurants ?? []).map((r) => ({
    id: r.id,
    type: 'restaurant' as const,
    name: r.name,
    genre: r.genre,
    area: r.area,
    address: r.address,
    lat: r.lat,
    lng: r.lng,
    distance: lat && lng && r.lat && r.lng
      ? haversineDistance(Number(lat), Number(lng), r.lat, r.lng)
      : null,
    hasRecord: recordedIds.has(r.id),
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

  // 외부 결과 통합
  interface ExternalItem {
    name: string
    address: string
    lat: number | null
    lng: number | null
    genre: string | null
    area: string | null
    phone: string | null
    externalId: string
    externalIds: Record<string, string>
  }
  const externals: ExternalItem[] = []

  if (kakaoResult.status === 'fulfilled') {
    for (const item of kakaoResult.value) {
      externals.push({
        name: item.name, address: item.address, lat: item.lat, lng: item.lng,
        genre: item.category ? mapKakaoCategory(item.category) : null, area: extractArea(item.address), phone: item.phone,
        externalId: `kakao_${item.kakaoId}`, externalIds: { kakao: item.kakaoId },
      })
    }
  }
  if (naverResult.status === 'fulfilled') {
    for (const item of naverResult.value) {
      externals.push({
        name: item.name, address: item.address, lat: item.lat, lng: item.lng,
        genre: item.category ? mapNaverCategory(item.category) : null, area: extractArea(item.address), phone: item.phone ?? null,
        externalId: `naver_${item.naverId ?? item.name}`,
        externalIds: item.naverId ? { naver: item.naverId } : {},
      })
    }
  }
  if (googleResult.status === 'fulfilled') {
    for (const item of googleResult.value) {
      externals.push({
        name: item.name, address: item.address, lat: item.lat, lng: item.lng,
        genre: null, area: extractArea(item.address), phone: null,
        externalId: `google_${item.googlePlaceId}`, externalIds: { google: item.googlePlaceId },
      })
    }
  }

  // 중복 제거 (이름 정규화 기준)
  const existingKeys = new Set(nyamResults.map((r) => normalizeForDedup(r.name) + '||' + normalizeForDedup(r.address ?? '')))
  const dedupedExternals = externals.filter((ext) => {
    const key = normalizeForDedup(ext.name) + '||' + normalizeForDedup(ext.address)
    if (existingKeys.has(key)) return false
    existingKeys.add(key)
    return true
  })

  const externalSearchResults: RestaurantSearchResult[] = dedupedExternals.map((ext) => ({
    id: ext.externalId,
    type: 'restaurant' as const,
    name: ext.name,
    genre: ext.genre,
    area: ext.area,
    address: ext.address,
    lat: ext.lat,
    lng: ext.lng,
    distance: latNum && lngNum && ext.lat && ext.lng
      ? haversineDistance(latNum, lngNum, ext.lat, ext.lng)
      : null,
    hasRecord: false,
  }))

  // externalData: 선택 시 DB INSERT에 사용할 원본 데이터
  const externalData = dedupedExternals.map((ext) => ({
    name: ext.name,
    address: ext.address,
    area: ext.area,
    genre: ext.genre,
    lat: ext.lat,
    lng: ext.lng,
    phone: ext.phone,
    externalIds: ext.externalIds,
  }))

  return NextResponse.json({
    results: sortResults([...nyamResults, ...externalSearchResults]),
    externalData,
  })
}

/** 결과 정렬: Nyam DB(기록 있음) 우선 → 거리순 → 이름순 */
function sortResults(results: RestaurantSearchResult[]): RestaurantSearchResult[] {
  return [...results].sort((a, b) => {
    // 기록 있는 항목 우선
    if (a.hasRecord && !b.hasRecord) return -1
    if (!a.hasRecord && b.hasRecord) return 1
    // Nyam DB(id가 ext_ 아닌) 우선
    const aIsNyam = !a.id.startsWith('ext_') && !a.id.startsWith('kakao_') && !a.id.startsWith('naver_') && !a.id.startsWith('google_')
    const bIsNyam = !b.id.startsWith('ext_') && !b.id.startsWith('kakao_') && !b.id.startsWith('naver_') && !b.id.startsWith('google_')
    if (aIsNyam && !bIsNyam) return -1
    if (!aIsNyam && bIsNyam) return 1
    // 거리순
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

/** 주소에서 동네명 추출 */
function extractArea(address: string | null): string | null {
  if (!address) return null
  const parts = address.split(' ')
  return parts.length >= 3 ? parts[parts.length - 1] : null
}

/** 카카오 카테고리 → 장르 매핑 */
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

/** Haversine 거리 (미터) */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
