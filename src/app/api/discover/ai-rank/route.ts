import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'
import { calculateScore } from '@/domain/services/discover-scoring'
import type { Accolade, ScoreBreakdown } from '@/domain/services/discover-scoring'

interface RankRequest {
  restaurants: Array<{
    name: string
    address: string
    googleRating: number | null
  }>
}

export interface RankedResult {
  name: string
  googleRating: number | null
  breakdown: ScoreBreakdown
}

/** 식당 이름 정규화 (DB의 restaurant_name_norm과 동일 로직) */
function normalize(name: string): string {
  return name.replace(/[\s\W]/g, '').toLowerCase()
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const body: RankRequest = await request.json()
  const { restaurants } = body

  if (!restaurants || restaurants.length === 0) {
    return NextResponse.json({ success: false, error: 'NO_RESTAURANTS' }, { status: 400 })
  }

  try {
    // 1. DB에서 검증된 수상 내역 전부 가져오기
    const { data: allAccolades } = await supabase
      .from('restaurant_accolades')
      .select('restaurant_name_norm, source, detail, prestige_tier')
      .eq('verified', true)

    // 정규화된 이름 → 수상 목록 맵
    const accoladeMap = new Map<string, Accolade[]>()
    for (const row of allAccolades ?? []) {
      const norm = row.restaurant_name_norm as string
      const list = accoladeMap.get(norm) ?? []
      list.push({
        source: row.source as string,
        detail: row.detail as string | null,
        prestigeTier: row.prestige_tier as 'S' | 'A' | 'B',
      })
      accoladeMap.set(norm, list)
    }

    // 2. 각 식당 스코어링
    const ranked: RankedResult[] = restaurants.slice(0, 30).map((r) => {
      const norm = normalize(r.name)
      // 부분 매칭: 정규화된 이름이 DB 키에 포함되거나 반대
      let accolades: Accolade[] = accoladeMap.get(norm) ?? []
      if (accolades.length === 0) {
        for (const [key, val] of accoladeMap) {
          if (norm.includes(key) || key.includes(norm)) {
            accolades = val
            break
          }
        }
      }

      const breakdown = calculateScore(r.googleRating, accolades)
      return { name: r.name, googleRating: r.googleRating, breakdown }
    })

    // 고점순 정렬
    ranked.sort((a, b) => b.breakdown.total - a.breakdown.total)

    return NextResponse.json({ success: true, ranked })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
