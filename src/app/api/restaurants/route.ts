import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'

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

  const { data, error } = await supabase
    .from('restaurants')
    .insert({
      name: name.trim(),
      address: address ?? null,
      area: area ?? null,
      genre: genre ?? null,
      price_range: priceRange ?? null,
      lat: lat ?? null,
      lng: lng ?? null,
      phone: phone ?? null,
      external_ids: externalIds ?? null,
    })
    .select('id, name')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id, name: data.name, type: 'restaurant', isExisting: false }, { status: 201 })
}
