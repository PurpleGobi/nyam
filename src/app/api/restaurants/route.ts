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
  const { name, address, area, genre, priceRange, lat, lng, phone, externalIds } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'NAME_REQUIRED' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('restaurants')
    .select('id, name')
    .ilike('name', name.trim())
    .limit(1)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ id: existing.id, name: existing.name, type: 'restaurant', isExisting: true })
  }

  const safeGenre = genre && VALID_GENRES.has(genre) ? genre : null

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
      external_ids: externalIds ?? null,
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
