import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'
import type { RecommendationCard } from '@/domain/entities/recommendation'

/** WSET 8-category pairing map */
const VALID_PAIRING_CATEGORIES = [
  'red_meat', 'white_meat', 'seafood', 'cheese',
  'vegetable', 'spicy', 'dessert', 'charcuterie',
] as const

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ cards: [] }, { status: 401 })
  }

  const category = request.nextUrl.searchParams.get('category')
  if (!category || !(VALID_PAIRING_CATEGORIES as readonly string[]).includes(category)) {
    return NextResponse.json({ cards: [] })
  }

  const { data: records } = await supabase
    .from('records')
    .select('target_id, satisfaction, pairing_categories, wines(name, region, photo_url)')
    .eq('user_id', user.id)
    .eq('target_type', 'wine')
    .not('satisfaction', 'is', null)
    .contains('pairing_categories', [category])
    .order('satisfaction', { ascending: false })
    .limit(20)

  if (!records || records.length === 0) {
    return NextResponse.json({ cards: [] })
  }

  const seen = new Set<string>()
  const cards: RecommendationCard[] = []

  for (const r of records) {
    if (seen.has(r.target_id)) continue
    seen.add(r.target_id)

    const wine = r.wines as unknown as { name: string; region: string | null; photo_url: string | null } | null

    cards.push({
      id: `wine-pairing-${r.target_id}`,
      targetId: r.target_id,
      targetType: 'wine',
      name: wine?.name ?? '',
      meta: wine?.region ?? '',
      photoUrl: wine?.photo_url ?? null,
      algorithm: 'wine_pairing',
      source: 'ai',
      reason: `${category} 페어링 · 만족도 ${r.satisfaction}%`,
      normalizedScore: (r.satisfaction ?? 0) / 100,
      confidence: null,
    })

    if (cards.length >= 10) break
  }

  return NextResponse.json({ cards }, {
    headers: { 'Cache-Control': 'public, max-age=1800' },
  })
}
