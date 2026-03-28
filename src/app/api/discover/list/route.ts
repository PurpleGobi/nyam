import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'
import { calculateCompositeScore } from '@/domain/services/composite-score'

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

  const { data: restaurants, count } = await supabase
    .from('restaurants')
    .select('id, name, genre, area, specialty, photos, nyam_score, naver_rating, kakao_rating, google_rating, michelin_stars, has_blue_ribbon, external_avg, record_count', { count: 'exact' })
    .eq('area', area)
    .order('nyam_score', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1)

  const results = (restaurants ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    genre: r.genre,
    area: r.area,
    specialty: r.specialty ?? null,
    photoUrl: r.photos?.[0] ?? null,
    nyamScore: r.nyam_score ? Number(r.nyam_score) : null,
    naverRating: r.naver_rating ? Number(r.naver_rating) : null,
    kakaoRating: r.kakao_rating ? Number(r.kakao_rating) : null,
    googleRating: r.google_rating ? Number(r.google_rating) : null,
    compositeScore: calculateCompositeScore(
      r.external_avg ?? 0,
      r.nyam_score ?? 0,
      r.record_count ?? 0,
      (r.michelin_stars ?? 0) > 0 || (r.has_blue_ribbon ?? false),
    ),
    michelinStars: r.michelin_stars,
    hasBlueRibbon: r.has_blue_ribbon,
  }))

  return NextResponse.json(
    { results, total: count ?? 0 },
    { headers: { 'Cache-Control': 'public, max-age=3600' } },
  )
}
