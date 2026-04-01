import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const body = await request.json()
  const { name, wineType, producer, vintage, region, country, variety, labelImageUrl } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'NAME_REQUIRED' }, { status: 400 })
  }
  if (!wineType) {
    return NextResponse.json({ error: 'WINE_TYPE_REQUIRED' }, { status: 400 })
  }

  let query = supabase
    .from('wines')
    .select('id, name')
    .ilike('name', name.trim())

  if (vintage) {
    query = query.eq('vintage', vintage)
  }

  const { data: existing } = await query.limit(1).maybeSingle()

  if (existing) {
    return NextResponse.json({ id: existing.id, name: existing.name, type: 'wine', isExisting: true })
  }

  const { data, error } = await supabase
    .from('wines')
    .insert({
      name: name.trim(),
      wine_type: wineType,
      producer: producer ?? null,
      vintage: vintage ?? null,
      region: region ?? null,
      country: country ?? null,
      variety: variety ?? null,
      label_image_url: labelImageUrl ?? null,
    })
    .select('id, name')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id, name: data.name, type: 'wine', isExisting: false }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const body = await request.json()
  const { id, ...fields } = body

  if (!id) {
    return NextResponse.json({ error: 'ID_REQUIRED' }, { status: 400 })
  }

  const fieldMap: Record<string, string> = {
    vintage: 'vintage', producer: 'producer', region: 'region',
    subRegion: 'sub_region', appellation: 'appellation', country: 'country',
    variety: 'variety', abv: 'abv', bodyLevel: 'body_level',
    acidityLevel: 'acidity_level', sweetnessLevel: 'sweetness_level',
    classification: 'classification', servingTemp: 'serving_temp',
    decanting: 'decanting', referencePriceMin: 'reference_price_min', referencePriceMax: 'reference_price_max',
    drinkingWindowStart: 'drinking_window_start', drinkingWindowEnd: 'drinking_window_end',
    vivinoRating: 'vivino_rating', criticScores: 'critic_scores',
    tastingNotes: 'tasting_notes',
  }

  const updateData: Record<string, unknown> = {}
  for (const [key, dbCol] of Object.entries(fieldMap)) {
    if (fields[key] !== undefined) updateData[dbCol] = fields[key]
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ success: true })
  }

  const { error } = await supabase
    .from('wines')
    .update(updateData)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
