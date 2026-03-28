import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ restaurants: [] }, { status: 401 })
  }

  const lat = Number(request.nextUrl.searchParams.get('lat'))
  const lng = Number(request.nextUrl.searchParams.get('lng'))
  const radius = Number(request.nextUrl.searchParams.get('radius') ?? 2000)

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ restaurants: [] }, { status: 400 })
  }

  const { data: nearby } = await supabase.rpc('restaurants_within_radius', {
    lat,
    lng,
    radius_meters: radius,
  })

  const ids = ((nearby as Array<{ id: string }>) ?? []).map((r) => r.id)
  const { data: userRecords } = ids.length > 0
    ? await supabase
        .from('records')
        .select('target_id')
        .eq('user_id', user.id)
        .eq('target_type', 'restaurant')
        .in('target_id', ids)
    : { data: [] }

  const recordedIds = new Set((userRecords ?? []).map((r) => r.target_id))

  const restaurants = (
    (nearby as Array<{ id: string; name: string; genre: string | null; area: string | null; distance: number }>) ?? []
  ).map((r) => ({
    id: r.id,
    name: r.name,
    genre: r.genre,
    area: r.area,
    distance: r.distance,
    hasRecord: recordedIds.has(r.id),
  }))

  return NextResponse.json({ restaurants })
}
