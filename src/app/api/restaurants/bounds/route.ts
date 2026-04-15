import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'
import type { RestaurantPrestige } from '@/domain/entities/restaurant'

/**
 * GET /api/restaurants/bounds?north=...&south=...&east=...&west=...
 *   &sort=name&limit=20&offset=0&source=mine,following,bubble&keyword=미역&prestige=michelin,blue_ribbon
 *   &genre=한식&district=서울&area=강남구
 *
 * 모든 필터가 DB(RPC)에서 처리됨. LIMIT+1 페이지네이션.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const sp = request.nextUrl.searchParams
  const north = Number(sp.get('north'))
  const south = Number(sp.get('south'))
  const east = Number(sp.get('east'))
  const west = Number(sp.get('west'))
  const sort = sp.get('sort') ?? 'name'
  const limit = Math.min(Number(sp.get('limit')) || 20, 50)
  const offset = Math.max(Number(sp.get('offset')) || 0, 0)
  const keyword = sp.get('keyword')?.trim() ?? ''
  const sourceParam = sp.get('source')?.trim() ?? ''
  const sources = sourceParam ? sourceParam.split(',').map((s) => s.trim()) : []
  const prestigeParam = sp.get('prestige')?.trim() ?? ''
  const prestige = prestigeParam ? prestigeParam.split(',').map((s) => s.trim()) : []
  const genre = sp.get('genre')?.trim() || null
  const district = sp.get('district')?.trim() || null
  const area = sp.get('area')?.trim() || null
  const userLat = sp.get('userLat') ? Number(sp.get('userLat')) : null
  const userLng = sp.get('userLng') ? Number(sp.get('userLng')) : null

  if ([north, south, east, west].some((v) => Number.isNaN(v) || v === 0)) {
    return NextResponse.json({ restaurants: [], hasMore: false })
  }

  // 3-way RPC 분기: source 필터 → auth → simple (SQL inline, 최고 성능)
  let data: Record<string, unknown>[] | null = null
  let error: { message: string } | null = null

  if (sources.length > 0) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ restaurants: [], hasMore: false }, { status: 401 })
    }
    const result = await supabase.rpc('search_restaurants_bounds_source', {
      p_north: north, p_south: south, p_east: east, p_west: west,
      p_user_id: user.id,
      p_keyword: keyword,
      p_sources: sources,
      p_prestige_types: prestige.length > 0 ? prestige : null,
      p_genre: genre, p_district: district, p_area: area,
      p_sort: sort, p_limit: limit, p_offset: offset,
      p_user_lat: userLat, p_user_lng: userLng,
    })
    data = result.data as Record<string, unknown>[] | null
    error = result.error
  } else {
    // 인증 시도 (실패해도 simple로 폴백)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const result = await supabase.rpc('search_restaurants_bounds_auth', {
        p_north: north, p_south: south, p_east: east, p_west: west,
        p_user_id: user.id,
        p_keyword: keyword,
        p_prestige_types: prestige.length > 0 ? prestige : null,
        p_genre: genre, p_district: district, p_area: area,
        p_sort: sort, p_limit: limit, p_offset: offset,
        p_user_lat: userLat, p_user_lng: userLng,
      })
      data = result.data as Record<string, unknown>[] | null
      error = result.error
    } else {
      const result = await supabase.rpc('search_restaurants_bounds_simple', {
        p_north: north, p_south: south, p_east: east, p_west: west,
        p_keyword: keyword,
        p_prestige_types: prestige.length > 0 ? prestige : null,
        p_genre: genre, p_district: district, p_area: area,
        p_sort: sort, p_limit: limit, p_offset: offset,
        p_user_lat: userLat, p_user_lng: userLng,
      })
      data = result.data as Record<string, unknown>[] | null
      error = result.error
    }
  }

  if (error) {
    return NextResponse.json({ restaurants: [], hasMore: false })
  }

  const rows = data ?? []
  const hasMore = rows.length > limit
  const sliced = hasMore ? rows.slice(0, limit) : rows

  const restaurants = sliced.map((r: Record<string, unknown>) => {
    const srcs: string[] = []
    if (r.has_record) srcs.push('mine')
    return {
      id: r.id,
      name: r.name,
      genre: r.genre,
      district: r.district,
      area: r.area,
      address: r.address,
      lat: r.lat,
      lng: r.lng,
      phone: r.phone,
      kakaoMapUrl: r.kakao_map_url,
      prestige: (r.prestige ?? []) as RestaurantPrestige[],
      sources: srcs,
      myScore: typeof r.my_score === 'number' ? r.my_score : null,
    }
  })

  return NextResponse.json({ restaurants, hasMore })
}
