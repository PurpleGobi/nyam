import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'
import {
  recognizeWineLabel,
  recognizeWineShelf,
  recognizeWineReceipt,
} from '@/infrastructure/api/ai-recognition'
import type { WineLabelRecognition } from '@/infrastructure/api/ai-recognition'
import { searchKakaoLocal } from '@/infrastructure/api/kakao-local'
import { isConfidentMatch } from '@/domain/services/ai-recognition'
import { haversineDistanceMeters } from '@/domain/services/distance'
import type {
  IdentifyRequest,
  IdentifyResponse,
  RestaurantAIResult,
  WineAIResult,
  RestaurantCandidate,
  WineCandidate,
} from '@/domain/entities/camera'

/** AI 인식 결과로 wines 테이블에 중복 체크 후 INSERT (없으면 생성) */
async function upsertWineFromAI(
  supabase: Awaited<ReturnType<typeof createClient>>,
  recognition: WineLabelRecognition,
): Promise<{ id: string; name: string; isExisting: boolean }> {
  if (!recognition.wineName) {
    throw new Error('NO_WINE_NAME')
  }

  // 중복 체크: 다단계 퍼지 매칭
  // 1단계: 정확한 이름 매칭
  let query = supabase
    .from('wines')
    .select('id, name, producer, vintage, wine_type, region, country')
    .ilike('name', recognition.wineName)

  if (recognition.vintage) {
    query = query.eq('vintage', recognition.vintage)
  }

  let { data: existing } = await query.limit(1).maybeSingle()

  // 2단계: 이름에 핵심 키워드 포함 매칭 (Château X → X, X Y Z → 각 단어)
  if (!existing) {
    const nameWords = recognition.wineName
      .replace(/^(Château|Chateau|Domaine|Clos|Maison)\s+/i, '')
      .split(/[\s,·-]+/)
      .filter((w) => w.length >= 3)
      .slice(0, 3)

    if (nameWords.length > 0) {
      // 핵심 단어들을 모두 포함하는 와인 검색
      const patterns = nameWords.map((w) => `name.ilike.%${w}%`)
      const { data: fuzzyResults } = await supabase
        .from('wines')
        .select('id, name, producer, vintage, wine_type, region, country')
        .or(patterns.join(','))
        .limit(10)

      if (fuzzyResults && fuzzyResults.length > 0) {
        // 핵심 단어 매칭 수가 가장 많은 후보 선택
        const scored = fuzzyResults.map((w) => {
          const nameLower = w.name.toLowerCase()
          const matchCount = nameWords.filter((word) => nameLower.includes(word.toLowerCase())).length
          return { ...w, matchCount }
        })
        scored.sort((a, b) => b.matchCount - a.matchCount)

        // 2개 이상 단어가 매칭되면 동일 와인으로 판단
        if (scored[0].matchCount >= 2) {
          existing = scored[0]
        }
      }
    }
  }

  // 3단계: 생산자 + 빈티지 매칭 (이름이 다르더라도)
  if (!existing && recognition.producer && recognition.vintage) {
    const { data: producerMatch } = await supabase
      .from('wines')
      .select('id, name, producer, vintage, wine_type, region, country')
      .ilike('producer', `%${recognition.producer}%`)
      .eq('vintage', recognition.vintage)
      .limit(1)
      .maybeSingle()

    if (producerMatch) {
      existing = producerMatch
    }
  }

  if (existing) {
    return { id: existing.id, name: existing.name, isExisting: true }
  }

  // 새 와인 등록 (AI 추정 데이터 포함)
  const { data, error } = await supabase
    .from('wines')
    .insert({
      name: recognition.wineName,
      producer: recognition.producer,
      vintage: recognition.vintage,
      region: recognition.region,
      sub_region: recognition.subRegion,
      appellation: recognition.appellation,
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
      reference_price_min: recognition.referencePriceMin,
      reference_price_max: recognition.referencePriceMax,
      price_review: recognition.priceReview,
      drinking_window_start: recognition.drinkingWindowStart,
      drinking_window_end: recognition.drinkingWindowEnd,
      vivino_rating: recognition.vivinoRating,
      critic_scores: recognition.criticScores,
      tasting_notes: recognition.tastingNotes,
    })
    .select('id, name')
    .single()

  if (error) {
    throw new Error(`와인 등록 실패: ${error.message}`)
  }

  return { id: data.id, name: data.name, isExisting: false }
}

export async function POST(request: NextRequest): Promise<NextResponse<IdentifyResponse>> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ success: false, result: null, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const body: IdentifyRequest = await request.json()
  const { imageUrl, targetType, cameraMode, latitude, longitude, capturedAt } = body

  if (!imageUrl || !targetType) {
    return NextResponse.json({ success: false, result: null, error: 'MISSING_FIELDS' }, { status: 400 })
  }
  // imageUrl은 Supabase Storage 도메인만 허용 (외부 URL을 Gemini로 보내 abuse 방지)
  const expectedHost = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  if (expectedHost) {
    try {
      const u = new URL(imageUrl)
      if (u.hostname !== expectedHost) {
        return NextResponse.json({ success: false, result: null, error: 'INVALID_IMAGE_URL' }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ success: false, result: null, error: 'INVALID_IMAGE_URL' }, { status: 400 })
    }
  }

  try {
    if (targetType === 'restaurant') {
      // GPS 100m 반경 내 식당 검색 (AI 이미지 인식 없음)
      if (!latitude || !longitude) {
        const result: RestaurantAIResult = {
          targetType: 'restaurant',
          detectedGenre: null,
          detectedName: null,
          candidates: [],
          isConfidentMatch: false,
        }
        return NextResponse.json({ success: true, result })
      }

      const kakaoResults = await searchKakaoLocal('음식점', latitude, longitude, {
        radius: 100,
        size: 15,
      })

      const candidates: RestaurantCandidate[] = kakaoResults.map((k) => ({
        restaurantId: `kakao_${k.kakaoId}`,
        name: k.name,
        genre: k.category ?? null,
        area: k.address ? k.address.split(' ').slice(1, 3).join(' ') : null,
        distance: haversineDistanceMeters(latitude, longitude, k.lat, k.lng),
        matchScore: 0,
      }))

      // 거리순 정렬
      candidates.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))

      const result: RestaurantAIResult = {
        targetType: 'restaurant',
        detectedGenre: null,
        detectedName: null,
        candidates,
        isConfidentMatch: false,
      }

      return NextResponse.json({ success: true, result })
    } else {
      const mode = cameraMode ?? 'individual'

      if (mode === 'shelf') {
        const recognition = await recognizeWineShelf(imageUrl)
        const result: WineAIResult = {
          targetType: 'wine',
          ocrData: { wine_name: '', vintage: null, producer: null },
          candidates: [],
          isConfidentMatch: false,
          cameraMode: 'shelf',
        }
        return NextResponse.json({
          success: true,
          result,
          shelfData: recognition,
        })
      } else if (mode === 'receipt') {
        const recognition = await recognizeWineReceipt(imageUrl)
        const result: WineAIResult = {
          targetType: 'wine',
          ocrData: { wine_name: '', vintage: null, producer: null },
          candidates: [],
          isConfidentMatch: false,
          cameraMode: 'receipt',
        }
        return NextResponse.json({
          success: true,
          result,
          receiptData: recognition,
        })
      } else {
        const recognition = await recognizeWineLabel(imageUrl)

        const ocrData = {
          wine_name: recognition.wineName ?? '',
          vintage: recognition.vintage ? String(recognition.vintage) : null,
          producer: recognition.producer,
        }

        if (!recognition.wineName) {
          // 와인 이름 인식 실패 → search 폴백
          const result: WineAIResult = {
            targetType: 'wine',
            ocrData,
            candidates: [],
            isConfidentMatch: false,
            cameraMode: 'individual',
          }
          return NextResponse.json({ success: true, result })
        }

        // AI 인식 결과로 wines 테이블에 자동 등록 (중복이면 기존 반환)
        const wine = await upsertWineFromAI(supabase, recognition)

        const candidates: WineCandidate[] = [{
          wineId: wine.id,
          name: wine.name,
          producer: recognition.producer,
          vintage: recognition.vintage,
          wineType: recognition.wineType ?? 'red',
          region: recognition.region,
          country: recognition.country,
          matchScore: recognition.confidence >= 0.5 ? 1.0 : recognition.confidence,
        }]

        const result: WineAIResult = {
          targetType: 'wine',
          ocrData,
          candidates,
          isConfidentMatch: recognition.confidence >= 0.5,
          cameraMode: 'individual',
        }

        return NextResponse.json({ success: true, result })
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR'

    if (message === 'NOT_FOOD') {
      return NextResponse.json({ success: false, result: null, error: 'NOT_FOOD' }, { status: 422 })
    }
    if (message === 'NOT_WINE_LABEL') {
      return NextResponse.json({ success: false, result: null, error: 'NOT_WINE_LABEL' }, { status: 422 })
    }

    return NextResponse.json({ success: false, result: null, error: message }, { status: 500 })
  }
}

