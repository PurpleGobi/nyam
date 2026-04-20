import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'
import { searchWineByName } from '@/infrastructure/api/ai-recognition'
import type { WineSearchCandidate } from '@/domain/entities/wine'
import { searchWineLabelImages } from '@/infrastructure/api/google-image-search'

export interface WineSearchAIResponse {
  success: boolean
  candidates: WineSearchCandidate[]
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<WineSearchAIResponse>> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ success: false, candidates: [], error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const body = await request.json()
  const query = body.query as string

  if (!query || query.length < 2) {
    return NextResponse.json({ success: false, candidates: [], error: 'QUERY_TOO_SHORT' }, { status: 400 })
  }
  if (query.length > 200) {
    return NextResponse.json({ success: false, candidates: [], error: 'QUERY_TOO_LONG' }, { status: 400 })
  }

  try {
    const candidates = await searchWineByName(query)

    // 와인 라벨 이미지 병렬 검색 (실패해도 후보 목록은 반환)
    const wineNames = candidates.map((c) => c.name)
    const imageMap = await searchWineLabelImages(wineNames)

    const candidatesWithImages = candidates.map((c) => ({
      ...c,
      labelImageUrl: imageMap.get(c.name) ?? null,
    }))

    return NextResponse.json({ success: true, candidates: candidatesWithImages })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    return NextResponse.json({ success: false, candidates: [], error: message }, { status: 500 })
  }
}
