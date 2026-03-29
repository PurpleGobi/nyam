import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'
import { getWineDetailByName } from '@/infrastructure/api/gemini'
import type { WineLabelRecognition } from '@/infrastructure/api/gemini'

/** AI 인식 결과로 wines 테이블에 중복 체크 후 INSERT (없으면 생성) */
async function upsertWineFromAI(
  supabase: Awaited<ReturnType<typeof createClient>>,
  recognition: WineLabelRecognition,
): Promise<{ id: string; name: string; isExisting: boolean }> {
  if (!recognition.wineName) {
    throw new Error('NO_WINE_NAME')
  }

  let query = supabase
    .from('wines')
    .select('id, name')
    .ilike('name', recognition.wineName)

  if (recognition.vintage) {
    query = query.eq('vintage', recognition.vintage)
  }

  const { data: existing } = await query.limit(1).maybeSingle()

  if (existing) {
    return { id: existing.id, name: existing.name, isExisting: true }
  }

  const { data, error } = await supabase
    .from('wines')
    .insert({
      name: recognition.wineName,
      producer: recognition.producer,
      vintage: recognition.vintage,
      region: recognition.region,
      sub_region: recognition.subRegion,
      country: recognition.country,
      wine_type: recognition.wineType ?? 'red',
      variety: recognition.variety,
      grape_varieties: recognition.grapeVarieties,
      abv: recognition.abv,
      classification: recognition.classification,
      body_level: recognition.bodyLevel,
      acidity_level: recognition.acidityLevel,
      sweetness_level: recognition.sweetnessLevel,
      food_pairings: recognition.foodPairings,
      serving_temp: recognition.servingTemp,
      decanting: recognition.decanting,
      reference_price: recognition.referencePrice,
      drinking_window_start: recognition.drinkingWindowStart,
      drinking_window_end: recognition.drinkingWindowEnd,
      vivino_rating: recognition.vivinoRating,
    })
    .select('id, name')
    .single()

  if (error) {
    throw new Error(`와인 등록 실패: ${error.message}`)
  }

  return { id: data.id, name: data.name, isExisting: false }
}

export interface WineDetailAIResponse {
  success: boolean
  wine: { id: string; name: string; isExisting: boolean } | null
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<WineDetailAIResponse>> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ success: false, wine: null, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const body = await request.json()
  const { name, producer, vintage } = body as {
    name: string
    producer: string | null
    vintage: number | null
  }

  if (!name) {
    return NextResponse.json({ success: false, wine: null, error: 'MISSING_NAME' }, { status: 400 })
  }

  try {
    // 2단계: LLM에게 상세 정보 요청 → DB upsert
    const recognition = await getWineDetailByName(name, producer, vintage)
    const wine = await upsertWineFromAI(supabase, recognition)
    return NextResponse.json({ success: true, wine })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    return NextResponse.json({ success: false, wine: null, error: message }, { status: 500 })
  }
}
