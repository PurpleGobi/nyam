import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'
import type { RecommendationCard } from '@/domain/entities/recommendation'
import { fetchEngagementCounts } from '@/app/api/recommend/_shared/engagement'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ cards: [] }, { status: 401 })
  }

  const scene = request.nextUrl.searchParams.get('scene')
  if (!scene) {
    return NextResponse.json({ cards: [] })
  }

  // 사분면 필터 (optional, 설계 §2-3 quadrant)
  const axisXMin = request.nextUrl.searchParams.get('axisXMin')
  const axisXMax = request.nextUrl.searchParams.get('axisXMax')
  const axisYMin = request.nextUrl.searchParams.get('axisYMin')
  const axisYMax = request.nextUrl.searchParams.get('axisYMax')
  const minSatisfaction = Number(request.nextUrl.searchParams.get('minSatisfaction') ?? 75)

  let query = supabase
    .from('records')
    .select('target_id, target_type, satisfaction, scene, axis_x, axis_y, restaurants(name, genre, photo_url)')
    .eq('user_id', user.id)
    .eq('scene', scene)
    .not('satisfaction', 'is', null)
    .gte('satisfaction', minSatisfaction)
    .order('satisfaction', { ascending: false })
    .limit(20)

  if (axisXMin) query = query.gte('axis_x', Number(axisXMin))
  if (axisXMax) query = query.lte('axis_x', Number(axisXMax))
  if (axisYMin) query = query.gte('axis_y', Number(axisYMin))
  if (axisYMax) query = query.lte('axis_y', Number(axisYMax))

  const { data: records } = await query

  if (!records || records.length === 0) {
    return NextResponse.json({ cards: [] })
  }

  // GROUP BY target_id + AVG(satisfaction)
  const grouped = new Map<string, {
    targetId: string
    targetType: string
    satisfactionSum: number
    count: number
    restaurant: { name: string; genre: string | null; photo_url: string | null } | null
  }>()

  for (const r of records) {
    const existing = grouped.get(r.target_id)
    if (existing) {
      existing.satisfactionSum += (r.satisfaction ?? 0)
      existing.count += 1
    } else {
      grouped.set(r.target_id, {
        targetId: r.target_id,
        targetType: r.target_type,
        satisfactionSum: r.satisfaction ?? 0,
        count: 1,
        restaurant: r.restaurants as unknown as { name: string; genre: string | null; photo_url: string | null } | null,
      })
    }
  }

  const scored = Array.from(grouped.values())
    .map((g) => ({ ...g, avgScore: Math.round(g.satisfactionSum / g.count) }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 10)

  const cards: RecommendationCard[] = scored.map((g) => ({
    id: `scene-${g.targetId}`,
    targetId: g.targetId,
    targetType: g.targetType as 'restaurant' | 'wine',
    name: g.restaurant?.name ?? '',
    meta: g.restaurant?.genre ?? '',
    photoUrl: g.restaurant?.photo_url ?? null,
    algorithm: 'scene',
    source: 'ai',
    reason: `${scene} · 평균 만족도 ${g.avgScore}%`,
    normalizedScore: g.avgScore,
    confidence: null,
    likeCount: 0,
    commentCount: 0,
  }))

  const engagement = await fetchEngagementCounts(supabase, cards.map((c) => c.targetId), 'restaurant')
  for (const card of cards) {
    const eng = engagement.get(card.targetId)
    if (eng) {
      card.likeCount = eng.likes
      card.commentCount = eng.comments
    }
  }

  return NextResponse.json({ cards }, {
    headers: { 'Cache-Control': 'public, max-age=1800' },
  })
}
