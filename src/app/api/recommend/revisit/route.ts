import { NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'
import { calcRevisitScore } from '@/domain/services/recommendation-service'
import type { RecommendationCard } from '@/domain/entities/recommendation'
import { fetchEngagementCounts } from '@/app/api/recommend/_shared/engagement'

export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ cards: [] }, { status: 401 })
  }

  const { data: records } = await supabase
    .from('records')
    .select('target_id, target_type, avg_satisfaction, latest_visit_date')
    .eq('user_id', user.id)
    .not('avg_satisfaction', 'is', null)
    .gte('avg_satisfaction', 80)
    .order('latest_visit_date', { ascending: false })

  if (!records || records.length === 0) {
    return NextResponse.json({ cards: [] })
  }

  const grouped = new Map<string, {
    targetId: string
    targetType: string
    totalSat: number
    count: number
    lastVisit: string
  }>()

  for (const r of records) {
    const existing = grouped.get(r.target_id)
    if (existing) {
      existing.totalSat += r.avg_satisfaction ?? 0
      existing.count += 1
      if (r.latest_visit_date && r.latest_visit_date > existing.lastVisit) {
        existing.lastVisit = r.latest_visit_date
      }
    } else {
      grouped.set(r.target_id, {
        targetId: r.target_id,
        targetType: r.target_type,
        totalSat: r.avg_satisfaction ?? 0,
        count: 1,
        lastVisit: r.latest_visit_date ?? '',
      })
    }
  }

  const targetIds = Array.from(grouped.keys())
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name, genre, photo_url')
    .in('id', targetIds)

  const restaurantMap = new Map(
    (restaurants ?? []).map((r) => [r.id, r]),
  )

  const scored: Array<RecommendationCard & { score: number }> = []

  for (const [, g] of grouped) {
    const avgSat = g.totalSat / g.count
    const daysSince = Math.floor(
      (Date.now() - new Date(g.lastVisit).getTime()) / (1000 * 60 * 60 * 24),
    )
    const score = calcRevisitScore(avgSat, daysSince, g.count)
    const restaurant = restaurantMap.get(g.targetId)

    scored.push({
      id: `revisit-${g.targetId}`,
      targetId: g.targetId,
      targetType: g.targetType as 'restaurant' | 'wine',
      name: restaurant?.name ?? '',
      meta: restaurant?.genre ?? '',
      photoUrl: restaurant?.photo_url ?? null,
      algorithm: 'revisit',
      source: 'ai',
      reason: `만족도 ${Math.round(avgSat)}% · ${g.count}회 방문`,
      normalizedScore: score,
      confidence: null,
      likeCount: 0,
      commentCount: 0,
      score,
    })
  }

  scored.sort((a, b) => b.score - a.score)
  const top = scored.slice(0, 10)

  // engagement 집계
  const engagement = await fetchEngagementCounts(supabase, top.map((c) => c.targetId), 'restaurant')
  const cards: RecommendationCard[] = top.map(({ score: _score, ...card }) => {
    const eng = engagement.get(card.targetId)
    return { ...card, likeCount: eng?.likes ?? 0, commentCount: eng?.comments ?? 0 }
  })

  return NextResponse.json({ cards }, {
    headers: { 'Cache-Control': 'public, max-age=1800' },
  })
}
