import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'

const VALID_GENRES = new Set([
  '한식', '일식', '중식', '태국', '베트남', '인도',
  '이탈리안', '프렌치', '스페인', '지중해', '미국', '멕시칸',
  '카페', '바/주점', '베이커리', '기타',
])

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const body = await request.json()
  const { name, address, area, genre, priceRange, lat, lng, phone, externalIds, kakaoMapUrl } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'NAME_REQUIRED' }, { status: 400 })
  }

  const safeGenre = genre && VALID_GENRES.has(genre) ? genre : null

  const { data: existing } = await supabase
    .from('restaurants')
    .select('id, name, genre, area, phone, kakao_map_url, next_refresh_at')
    .ilike('name', name.trim())
    .limit(1)
    .maybeSingle()

  if (existing) {
    // stale 데이터 → 새로운 정보로 갱신
    const isStale = existing.next_refresh_at && new Date(existing.next_refresh_at) <= new Date()
    if (isStale) {
      const now = new Date().toISOString()
      const refreshAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      const updates: Record<string, unknown> = { cached_at: now, next_refresh_at: refreshAt }
      if (address) updates.address = address
      if (area) updates.area = area
      if (safeGenre) updates.genre = safeGenre
      if (phone) updates.phone = phone
      if (kakaoMapUrl) updates.kakao_map_url = kakaoMapUrl
      if (lat) updates.lat = lat
      if (lng) updates.lng = lng
      if (externalIds) updates.external_ids = externalIds
      await supabase.from('restaurants').update(updates).eq('id', existing.id)
    }
    return NextResponse.json({
      id: existing.id, name: existing.name, type: 'restaurant', isExisting: true,
      genre: isStale && safeGenre ? safeGenre : existing.genre, area: existing.area,
    })
  }

  const now = new Date().toISOString()
  const refreshAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('restaurants')
    .insert({
      name: name.trim(),
      address: address ?? null,
      area: area ?? null,
      genre: safeGenre,
      price_range: priceRange ?? null,
      lat: lat ?? null,
      lng: lng ?? null,
      phone: phone ?? null,
      kakao_map_url: kakaoMapUrl ?? null,
      external_ids: externalIds ?? null,
      cached_at: now,
      next_refresh_at: refreshAt,
      country: body.country ?? '한국',
      city: body.city ?? '서울',
    })
    .select('id, name')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id, name: data.name, type: 'restaurant', isExisting: false }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const body = await request.json()
  const { id, genre } = body

  if (!id) {
    return NextResponse.json({ error: 'ID_REQUIRED' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (genre && VALID_GENRES.has(genre)) {
    updates.genre = genre
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true })
  }

  const { error } = await supabase
    .from('restaurants')
    .update(updates)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
