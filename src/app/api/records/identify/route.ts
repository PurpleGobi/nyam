import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'
import {
  recognizeRestaurant,
  recognizeWineLabel,
  recognizeWineShelf,
  recognizeWineReceipt,
} from '@/infrastructure/api/gemini'
import { rankCandidatesByGenreMatch, isConfidentMatch } from '@/domain/services/ai-recognition'
import type {
  IdentifyRequest,
  IdentifyResponse,
  RestaurantAIResult,
  WineAIResult,
  RestaurantCandidate,
  WineCandidate,
} from '@/domain/entities/camera'

function calculateWineMatchScore(
  dbWine: { name: string; producer: string | null; vintage: number | null },
  recognition: { wineName: string | null; producer: string | null; vintage: number | null },
): number {
  let score = 0

  if (recognition.wineName && dbWine.name) {
    const nameNorm = dbWine.name.toLowerCase().replace(/\s/g, '')
    const ocrNorm = recognition.wineName.toLowerCase().replace(/\s/g, '')
    if (nameNorm === ocrNorm) score += 0.5
    else if (nameNorm.includes(ocrNorm) || ocrNorm.includes(nameNorm)) score += 0.3
  }

  if (recognition.producer && dbWine.producer) {
    const prodNorm = dbWine.producer.toLowerCase().replace(/\s/g, '')
    const ocrProdNorm = recognition.producer.toLowerCase().replace(/\s/g, '')
    if (prodNorm === ocrProdNorm) score += 0.25
    else if (prodNorm.includes(ocrProdNorm) || ocrProdNorm.includes(prodNorm)) score += 0.15
  }

  if (recognition.vintage && dbWine.vintage && recognition.vintage === dbWine.vintage) {
    score += 0.25
  }

  return Math.min(score, 1)
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
  const { imageBase64, targetType, cameraMode, latitude, longitude } = body

  if (!imageBase64 || !targetType) {
    return NextResponse.json({ success: false, result: null, error: 'MISSING_FIELDS' }, { status: 400 })
  }

  try {
    if (targetType === 'restaurant') {
      const recognition = await recognizeRestaurant(imageBase64)

      let candidates: RestaurantCandidate[] = []

      if (latitude && longitude) {
        const { data: nearby } = await supabase.rpc('restaurants_within_radius', {
          lat: latitude,
          lng: longitude,
          radius_meters: 200,
        })

        if (nearby) {
          candidates = (
            nearby as Array<{
              id: string
              name: string
              genre: string | null
              area: string | null
              distance: number
            }>
          ).map((r) => ({
            restaurantId: r.id,
            name: r.name,
            genre: r.genre,
            area: r.area,
            distance: r.distance,
            matchScore: 0,
          }))
        }
      }

      const rankedCandidates = rankCandidatesByGenreMatch(candidates, recognition.genre)

      const result: RestaurantAIResult = {
        targetType: 'restaurant',
        detectedGenre: recognition.genre,
        detectedName: recognition.restaurantName,
        candidates: rankedCandidates,
        isConfidentMatch: isConfidentMatch(rankedCandidates),
      }

      return NextResponse.json({ success: true, result })
    } else {
      const mode = cameraMode ?? 'individual'

      if (mode === 'shelf') {
        const recognition = await recognizeWineShelf(imageBase64)
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
        } as IdentifyResponse & { shelfData: typeof recognition })
      } else if (mode === 'receipt') {
        const recognition = await recognizeWineReceipt(imageBase64)
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
        } as IdentifyResponse & { receiptData: typeof recognition })
      } else {
        const recognition = await recognizeWineLabel(imageBase64)

        const ocrData = {
          wine_name: recognition.wineName ?? '',
          vintage: recognition.vintage ? String(recognition.vintage) : null,
          producer: recognition.producer,
        }

        let candidates: WineCandidate[] = []

        if (recognition.wineName) {
          const { data: wines } = await supabase
            .from('wines')
            .select('id, name, producer, vintage, wine_type, region, country')
            .or(`name.ilike.%${recognition.wineName}%,producer.ilike.%${recognition.wineName}%`)
            .limit(10)

          if (wines) {
            candidates = wines
              .map((w) => ({
                wineId: w.id,
                name: w.name,
                producer: w.producer,
                vintage: w.vintage,
                wineType: w.wine_type,
                region: w.region,
                country: w.country,
                matchScore: calculateWineMatchScore(w, recognition),
              }))
              .sort((a, b) => b.matchScore - a.matchScore)
          }
        }

        const result: WineAIResult = {
          targetType: 'wine',
          ocrData,
          candidates,
          isConfidentMatch: candidates.length > 0 && candidates[0].matchScore >= 0.8,
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
