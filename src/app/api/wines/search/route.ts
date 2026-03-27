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

  const { data: wines } = await supabase
    .from('wines')
    .select('id, name, producer, vintage, wine_type, region, country')
    .or(`name.ilike.%${q}%,producer.ilike.%${q}%`)
    .order('name')
    .limit(20)

  const { data: userRecords } = await supabase
    .from('records')
    .select('target_id')
    .eq('user_id', user.id)
    .eq('target_type', 'wine')

  const recordedIds = new Set((userRecords ?? []).map((r) => r.target_id))

  const results = (wines ?? []).map((w) => ({
    id: w.id,
    type: 'wine',
    name: w.name,
    producer: w.producer,
    vintage: w.vintage,
    wineType: w.wine_type,
    region: w.region,
    country: w.country,
    hasRecord: recordedIds.has(w.id),
  }))

  return NextResponse.json({ results })
}
