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
    .select('id, name, genre, area, address, lat, lng, phone, kakao_map_url')
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
    genreDisplay: r.genre,
    categoryPath: null,
    area: r.area,
    address: r.address,
    lat: r.lat,
    lng: r.lng,
    phone: r.phone,
    kakaoMapUrl: r.kakao_map_url,
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
        genre: '기타', genreDisplay: '기타', categoryPath: null, district: extractDistrict(item.address), phone: null, kakaoMapUrl: null,
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
    genreDisplay: ext.genreDisplay,
    categoryPath: ext.categoryPath,
    area: ext.district,
    address: ext.address,
    lat: ext.lat,
    lng: ext.lng,
    phone: ext.phone,
    kakaoMapUrl: ext.kakaoMapUrl,
    distance: latNum && lngNum && ext.lat && ext.lng
      ? haversineDistance(latNum, lngNum, ext.lat, ext.lng)
      : null,
    hasRecord: false,
  }))

  // externalData: 선택 시 DB INSERT에 사용할 원본 데이터
  const externalData = dedupedExternals.map((ext) => ({
    name: ext.name,
    address: ext.address,
    district: ext.district,
    area: ext.district,
    genre: ext.genre,
    lat: ext.lat,
    lng: ext.lng,
    phone: ext.phone,
    kakaoMapUrl: ext.kakaoMapUrl,
    externalIds: ext.externalIds,
  }))

  return NextResponse.json({
    results: sortResults([...nyamResults, ...externalSearchResults]),
    externalData,
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
