import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'
import type { RecommendationCard } from '@/domain/entities/recommendation'

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

  const seen = new Set<string>()
  const cards: RecommendationCard[] = []

  for (const r of records) {
    if (seen.has(r.target_id)) continue
    seen.add(r.target_id)

    const restaurant = r.restaurants as unknown as { name: string; genre: string | null; photo_url: string | null } | null

    cards.push({
      id: `scene-${r.target_id}`,
      targetId: r.target_id,
      targetType: r.target_type as 'restaurant' | 'wine',
      name: restaurant?.name ?? '',
      meta: restaurant?.genre ?? '',
      photoUrl: restaurant?.photo_url ?? null,
      algorithm: 'scene',
      source: 'ai',
      reason: `${scene} · 만족도 ${r.satisfaction}%`,
      normalizedScore: (r.satisfaction ?? 0) / 100,
      confidence: null,
    })

    if (cards.length >= 10) break
  }

  return NextResponse.json({ cards }, {
    headers: { 'Cache-Control': 'public, max-age=1800' },
  })
}
