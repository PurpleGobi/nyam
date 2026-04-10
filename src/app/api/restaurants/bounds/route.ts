import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'
import type { RestaurantPrestige } from '@/domain/entities/restaurant'

/**
 * GET /api/restaurants/bounds?north=...&south=...&east=...&west=...
 *   &sort=name&limit=20&offset=0&source=mine,bookmark&keyword=미역&prestige=michelin,blue_ribbon
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

  if ([north, south, east, west].some((v) => Number.isNaN(v) || v === 0)) {
    return NextResponse.json({ restaurants: [], hasMore: false })
  }

  let userId: string | null = null
  if (sources.length > 0) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ restaurants: [], hasMore: false }, { status: 401 })
    }
    userId = user.id
  }

  const { data, error } = await supabase.rpc('search_restaurants_in_bounds', {
    p_north: north,
    p_south: south,
    p_east: east,
    p_west: west,
    p_user_id: userId,
    p_keyword: keyword,
    p_sources: sources.length > 0 ? sources : null,
    p_prestige_types: prestige.length > 0 ? prestige : null,
    p_sort: sort,
    p_limit: limit,
    p_offset: offset,
  })

  if (error) {
    return NextResponse.json({ restaurants: [], hasMore: false })
  }

  const rows = data ?? []
  const hasMore = rows.length > limit
  const sliced = hasMore ? rows.slice(0, limit) : rows

  const restaurants = sliced.map((r: Record<string, unknown>) => {
    const srcs: string[] = []
    if (r.has_record) srcs.push('mine')
    if (r.has_bookmark) srcs.push('bookmark')
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
    }
  })

  return NextResponse.json({ restaurants, hasMore })
}
