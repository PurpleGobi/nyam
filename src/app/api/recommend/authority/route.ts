import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'
import { calcAuthorityScore } from '@/domain/services/recommendation-service'
import type { RecommendationCard } from '@/domain/entities/recommendation'
import { fetchEngagementCounts } from '@/app/api/recommend/_shared/engagement'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ cards: [] }, { status: 401 })
  }

  const area = request.nextUrl.searchParams.get('area')

  let query = supabase
    .from('restaurants')
    .select('id, name, genre, photo_url, michelin_stars, has_blue_ribbon, naver_rating, kakao_rating, google_rating')
    .or('michelin_stars.gt.0,has_blue_ribbon.eq.true,and(naver_rating.gte.4.3,kakao_rating.gte.4.0,google_rating.gte.4.2)')
    .limit(20)

  if (area) {
    query = query.eq('area', area)
  }

  const { data: restaurants } = await query

  if (!restaurants || restaurants.length === 0) {
    return NextResponse.json({ cards: [] })
  }

  const scored: Array<RecommendationCard & { score: number }> = restaurants.map((r) => {
    const badges: string[] = []
    if (r.michelin_stars && r.michelin_stars > 0) badges.push(`미쉐린 ${r.michelin_stars}스타`)
    if (r.has_blue_ribbon) badges.push('블루리본')

    const score = calcAuthorityScore({
      naverRating: r.naver_rating ? Number(r.naver_rating) : null,
      kakaoRating: r.kakao_rating ? Number(r.kakao_rating) : null,
      googleRating: r.google_rating ? Number(r.google_rating) : null,
      michelinStars: r.michelin_stars ?? null,
      hasBlueRibbon: r.has_blue_ribbon ?? false,
    })

    const ratingParts: string[] = []
    if (r.naver_rating) ratingParts.push(`N${r.naver_rating}`)
    if (r.kakao_rating) ratingParts.push(`K${r.kakao_rating}`)
    if (r.google_rating) ratingParts.push(`G${r.google_rating}`)

    const reason = badges.length > 0
      ? `${badges.join(' · ')}${ratingParts.length > 0 ? ` · ${ratingParts.join(' ')}` : ''}`
      : ratingParts.join(' ')

    return {
      id: `authority-${r.id}`,
      targetId: r.id,
      targetType: 'restaurant' as const,
      name: r.name,
      meta: r.genre ?? '',
      photoUrl: r.photo_url,
      algorithm: 'authority' as const,
      source: 'web' as const,
      reason,
      normalizedScore: score,
      confidence: null,
      likeCount: 0,
      commentCount: 0,
      score,
    }
  })

  scored.sort((a, b) => b.score - a.score)
  const top = scored.slice(0, 10)

  const engagement = await fetchEngagementCounts(supabase, top.map((c) => c.targetId), 'restaurant')
  const cards: RecommendationCard[] = top.map(({ score: _score, ...card }) => {
    const eng = engagement.get(card.targetId)
    return { ...card, likeCount: eng?.likes ?? 0, commentCount: eng?.comments ?? 0 }
  })

  return NextResponse.json({ cards }, {
    headers: { 'Cache-Control': 'public, max-age=1800' },
  })
}
