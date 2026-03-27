import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const body = await request.json()
  const { name, wineType, producer, vintage, region, country, variety } = body

  if (!name?.trim() || !wineType) {
    return NextResponse.json({ error: 'NAME_AND_TYPE_REQUIRED' }, { status: 400 })
  }

  let query = supabase
    .from('wines')
    .select('id, name')
    .ilike('name', name.trim())

  if (vintage) {
    query = query.eq('vintage', vintage)
  }

  const { data: existing } = await query.limit(1).single()

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
    })
    .select('id, name')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id, name: data.name, type: 'wine', isExisting: false })
}
