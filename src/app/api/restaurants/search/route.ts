import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ results: [] }, { status: 401 })
  }

  const q = request.nextUrl.searchParams.get('q')
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name, genre, area, address, lat, lng')
    .ilike('name', `%${q}%`)
    .limit(20)

  const { data: userRecords } = await supabase
    .from('records')
    .select('target_id')
    .eq('user_id', user.id)
    .eq('target_type', 'restaurant')

  const recordedIds = new Set((userRecords ?? []).map((r) => r.target_id))

  const results = (restaurants ?? []).map((r) => ({
    id: r.id,
    type: 'restaurant',
    name: r.name,
    genre: r.genre,
    area: r.area,
    address: r.address,
    lat: r.lat,
    lng: r.lng,
    distance: null,
    hasRecord: recordedIds.has(r.id),
  }))

  return NextResponse.json({ results })
}
