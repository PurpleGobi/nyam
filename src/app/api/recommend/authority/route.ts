import { NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'
import { calcAuthorityScore } from '@/domain/services/recommendation-service'
import type { RecommendationCard } from '@/domain/entities/recommendation'

export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ cards: [] }, { status: 401 })
  }

  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name, genre, photo_url, michelin_stars, blue_ribbon, nyam_score')
    .or('michelin_stars.gt.0,blue_ribbon.eq.true,nyam_score.gte.85')
    .limit(20)

  if (!restaurants || restaurants.length === 0) {
    return NextResponse.json({ cards: [] })
  }

  const scored: Array<RecommendationCard & { score: number }> = restaurants.map((r) => {
    const badges: string[] = []
    if (r.michelin_stars && r.michelin_stars > 0) badges.push(`미쉐린 ${r.michelin_stars}스타`)
    if (r.blue_ribbon) badges.push('블루리본')

    const score = calcAuthorityScore(r.nyam_score ?? 0, badges)

    return {
      id: `authority-${r.id}`,
      targetId: r.id,
      targetType: 'restaurant' as const,
      name: r.name,
      meta: r.genre ?? '',
      photoUrl: r.photo_url,
      algorithm: 'authority' as const,
      reason: badges.join(' · ') || `냠스코어 ${r.nyam_score}`,
      normalizedScore: score,
      confidence: null,
      score,
    }
  })

  scored.sort((a, b) => b.score - a.score)
  const cards: RecommendationCard[] = scored.slice(0, 5).map(({ score: _score, ...card }) => card)

  return NextResponse.json({ cards })
}
