import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'
import { escapeForOrFilter } from '@/shared/utils/postgrest-filter'

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

  const safeQ = escapeForOrFilter(q)
  if (safeQ.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const { data: wines, error } = await supabase
    .from('wines')
    .select('id, name, producer, vintage, wine_type, region, country')
    .or(`name.ilike.%${safeQ}%,producer.ilike.%${safeQ}%`)
    .order('name')
    .limit(20)

  if (error || !wines) {
    return NextResponse.json({ results: [] })
  }

  const wineIds = (wines ?? []).map((w) => w.id)

  const { data: userRecords } = wineIds.length > 0
    ? await supabase
        .from('records')
        .select('target_id')
        .eq('user_id', user.id)
        .eq('target_type', 'wine')
        .in('target_id', wineIds)
    : { data: [] }

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

  // 정렬: 기록 있는 항목 우선 → 이름순
  results.sort((a, b) => {
    if (a.hasRecord && !b.hasRecord) return -1
    if (!a.hasRecord && b.hasRecord) return 1
    return a.name.localeCompare(b.name)
  })

  return NextResponse.json({ results })
}
