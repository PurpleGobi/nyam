import { NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { searchKakaoLocal } from '@/infrastructure/api/kakao-local'

interface RpRow {
  id: string
  restaurant_id: string | null
  restaurant_name: string
  restaurant_name_norm: string
  lat: number | null
  lng: number | null
  kakao_id: string | null
}

interface RestaurantCandidate {
  id: string
  name: string
  lat: number | null
  lng: number | null
}

interface MatchResult {
  rpId: string
  restaurantName: string
  status: 'matched_existing' | 'created_new' | 'unmatched'
  restaurantId: string | null
  debug?: string
}

/** 이름 정규화 */
function normalizeName(name: string): string {
  return name.replace(/[\s\-·()（）""''「」]/g, '').toLowerCase()
}

/** 이름 완전 일치 (DB 매칭용 — 엄격) */
function nameExactMatch(rpNameNorm: string, restaurantName: string): boolean {
  return normalizeName(restaurantName) === rpNameNorm
}

/** 이름 포함 매치 (카카오 결과용 — 완화) */
function nameContainsMatch(rpNameNorm: string, kakaoName: string): boolean {
  const norm = normalizeName(kakaoName)
  if (norm === rpNameNorm) return true
  // 한쪽이 다른 쪽을 포함
  return norm.includes(rpNameNorm) || rpNameNorm.includes(norm)
}

/** 좌표 간 거리(m) — Haversine */
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const MAX_DISTANCE_M = 50

function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function POST() {
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 })
  }

  // 1. restaurant_id가 NULL인 행 조회
  const { data: unmatchedRows, error: fetchError } = await supabase
    .from('restaurant_rp')
    .select('id, restaurant_id, restaurant_name, restaurant_name_norm, lat, lng, kakao_id')
    .is('restaurant_id', null)
    .limit(200)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!unmatchedRows || unmatchedRows.length === 0) {
    return NextResponse.json({ matched: 0, created: 0, unmatched: 0, results: [] })
  }

  const results: MatchResult[] = []
  let matchedCount = 0
  let createdCount = 0
  let unmatchedCount = 0

  for (const row of unmatchedRows as RpRow[]) {
    const result = await matchSingleRp(supabase, row)
    results.push(result)
    if (result.status === 'matched_existing') matchedCount++
    else if (result.status === 'created_new') createdCount++
    else unmatchedCount++
  }

  // bulk rp 캐시 갱신 — 매칭된 restaurant_id 수집
  const matchedRestaurantIds = results
    .filter((r) => r.restaurantId !== null)
    .map((r) => r.restaurantId as string)

  const uniqueIds = [...new Set(matchedRestaurantIds)]
  for (const restId of uniqueIds) {
    await refreshRpCache(supabase, restId)
  }

  return NextResponse.json({
    matched: matchedCount,
    created: createdCount,
    unmatched: unmatchedCount,
    results,
  })
}

async function matchSingleRp(
  supabase: SupabaseClient,
  row: RpRow,
): Promise<MatchResult> {
  const base: Omit<MatchResult, 'status' | 'restaurantId'> = {
    rpId: row.id,
    restaurantName: row.restaurant_name,
  }

  // Step A: restaurants 테이블에서 정확한 이름으로 검색
  const { data: candidates } = await supabase
    .from('restaurants')
    .select('id, name, lat, lng')
    .ilike('name', `%${row.restaurant_name}%`)
    .limit(10)

  if (candidates && candidates.length > 0) {
    const match = findBestMatch(row, normalizeName(row.restaurant_name), candidates as RestaurantCandidate[])
    if (match) {
      await supabase
        .from('restaurant_rp')
        .update({ restaurant_id: match.id })
        .eq('id', row.id)
      return { ...base, status: 'matched_existing', restaurantId: match.id }
    }
  }

  // Step B: 카카오 API로 검색 (괄호 부분 제거하여 검색 정확도 향상)
  const searchName = row.restaurant_name.replace(/\s*\(.*?\)\s*/g, '').trim()
  const kakaoResults = await searchKakaoLocal(
    searchName,
    row.lat ?? undefined,
    row.lng ?? undefined,
    { radius: 5000, size: 3 },
  )

  if (kakaoResults.length > 0) {
    // 카카오 결과 중 이름+좌표가 가장 가까운 것 선택
    const rpNorm = normalizeName(row.restaurant_name)
    const bestKakao = kakaoResults.find((kr) => {
      const nameOk = nameContainsMatch(rpNorm, kr.name)
      if (!nameOk) return false
      if (row.lat && row.lng) {
        return distanceMeters(row.lat, row.lng, kr.lat, kr.lng) <= MAX_DISTANCE_M
      }
      return true // 좌표 없으면 이름 매치 + 카카오 첫 결과 신뢰
    })

    if (bestKakao) {
      // kakao_id로 기존 restaurant 재검색 (이번 배치에서 이미 생성된 것 포함)
      const { data: existingByKakao } = await supabase
        .from('restaurants')
        .select('id')
        .or(`external_ids->>kakao.eq.${bestKakao.kakaoId},kakao_map_url.eq.${bestKakao.kakaoMapUrl ?? ''}`)
        .limit(1)

      if (existingByKakao && existingByKakao.length > 0) {
        const existingId = (existingByKakao[0] as { id: string }).id
        await supabase
          .from('restaurant_rp')
          .update({ restaurant_id: existingId, kakao_id: bestKakao.kakaoId })
          .eq('id', row.id)
        return { ...base, status: 'matched_existing', restaurantId: existingId }
      }

      // 새 restaurant 생성
      const areaValue = extractArea(bestKakao.address)
      const { data: newRestaurant, error: insertError } = await supabase
        .from('restaurants')
        .insert({
          name: bestKakao.name,
          address: bestKakao.address,
          country: '한국',
          city: extractCity(bestKakao.address),
          area: areaValue ? [areaValue] : [],
          district: extractDistrict(bestKakao.address),
          genre: extractGenre(bestKakao.categoryDetail),
          lat: bestKakao.lat,
          lng: bestKakao.lng,
          phone: bestKakao.phone,
          external_ids: { kakao: bestKakao.kakaoId },
          kakao_map_url: bestKakao.kakaoMapUrl,
        })
        .select('id')
        .single()

      if (!insertError && newRestaurant) {
        const newId = (newRestaurant as { id: string }).id
        await supabase
          .from('restaurant_rp')
          .update({ restaurant_id: newId, kakao_id: bestKakao.kakaoId })
          .eq('id', row.id)
        return { ...base, status: 'created_new', restaurantId: newId }
      }
      return { ...base, status: 'unmatched', restaurantId: null, debug: `insert_error=${insertError?.message ?? 'null'} newRest=${JSON.stringify(newRestaurant)}` }
    }
  }

  // Step C: 매칭 실패
  const rpN = normalizeName(row.restaurant_name)
  const kakaoNames = kakaoResults.map((kr) => `${kr.name}(${nameContainsMatch(rpN, kr.name)})`).join(', ')
  return { ...base, status: 'unmatched', restaurantId: null, debug: `kakao=[${kakaoNames}] norm=${rpN}` }
}

function findBestMatch(
  row: RpRow,
  rpNorm: string,
  candidates: RestaurantCandidate[],
): RestaurantCandidate | null {
  // 1순위: 정규화 이름 완전 일치 + 좌표 근접
  for (const c of candidates) {
    if (!nameExactMatch(rpNorm, c.name)) continue
    if (row.lat && row.lng && c.lat && c.lng) {
      if (distanceMeters(row.lat, row.lng, c.lat, c.lng) <= MAX_DISTANCE_M) {
        return c
      }
    }
  }
  // 2순위: 정규화 이름 완전 일치 (좌표 없는 경우)
  for (const c of candidates) {
    if (!nameExactMatch(rpNorm, c.name)) continue
    if (!row.lat || !row.lng || !c.lat || !c.lng) {
      return c
    }
  }
  return null
}

/** restaurants.rp JSONB 캐시 직접 갱신 */
async function refreshRpCache(
  supabase: SupabaseClient,
  restaurantId: string,
): Promise<void> {
  const { data: rpRows } = await supabase
    .from('restaurant_rp')
    .select('rp_type, rp_grade')
    .eq('restaurant_id', restaurantId)

  const rpArray = (rpRows ?? []).map((r: { rp_type: string; rp_grade: string }) => ({
    type: r.rp_type,
    grade: r.rp_grade,
  }))

  await supabase
    .from('restaurants')
    .update({ rp: rpArray })
    .eq('id', restaurantId)
}

function extractCity(address: string): string {
  const parts = address.split(' ')
  return parts[0] ?? '서울'
}

function extractDistrict(address: string): string | null {
  const parts = address.split(' ')
  // "서울 강남구 ..." → "강남구"
  const gu = parts.find((p) => p.endsWith('구') || p.endsWith('군') || p.endsWith('시'))
  return gu ?? null
}

function extractArea(address: string): string | null {
  const parts = address.split(' ')
  // "서울 강남구 역삼동" → "역삼동" 또는 "서울 서초구 반포대로" → "반포대로"
  return parts.length >= 3 ? parts[2] : null
}

const GENRE_MAP: Record<string, string> = {
  '한식': '한식', '일식': '일식', '중식': '중식',
  '태국음식': '태국', '베트남음식': '베트남', '인도음식': '인도',
  '이탈리안': '이탈리안', '이탈리아음식': '이탈리안',
  '프랑스음식': '프렌치', '프렌치': '프렌치',
  '스페인음식': '스페인', '지중해음식': '지중해',
  '양식': '기타', '분식': '한식', '아시아음식': '기타',
  '카페': '카페', '술집': '바/주점', '호프': '바/주점',
  '베이커리': '베이커리', '제과,베이커리': '베이커리',
  '패스트푸드': '미국', '멕시코,남미음식': '멕시칸',
}

function extractGenre(categoryDetail: string | null): string | null {
  if (!categoryDetail) return null
  const parts = categoryDetail.split(' > ')
  const raw = parts.length >= 2 ? parts[1] : null
  if (!raw) return null
  return GENRE_MAP[raw] ?? null
}
