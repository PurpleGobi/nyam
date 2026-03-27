import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ results: [] }, { status: 401 })
  }

  const area = request.nextUrl.searchParams.get('area')
  const page = Number(request.nextUrl.searchParams.get('page') ?? 1)
  const limit = Number(request.nextUrl.searchParams.get('limit') ?? 20)

  if (!area) {
    return NextResponse.json({ results: [] })
  }

  const offset = (page - 1) * limit

  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name, genre, area, photos, nyam_score, naver_rating, kakao_rating, google_rating, michelin_stars, has_blue_ribbon')
    .eq('area', area)
    .order('nyam_score', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1)

  const results = (restaurants ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    genre: r.genre,
    area: r.area,
    photoUrl: r.photos?.[0] ?? null,
    nyamScore: r.nyam_score ? Number(r.nyam_score) : null,
    compositeScore: 0,
    michelinStars: r.michelin_stars,
    hasBlueRibbon: r.has_blue_ribbon,
  }))

  return NextResponse.json({ results })
}
