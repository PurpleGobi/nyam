'use client'

import { useState, useEffect } from 'react'
import type { PriceReview } from '@/domain/entities/wine'
import { wineRepo } from '@/shared/di/container'

export interface WineMetaData {
  wineType?: string
  region?: string
  subRegion?: string
  appellation?: string
  country?: string
  variety?: string
  grapeVarieties?: Array<{ name: string; pct: number }>
  producer?: string
  vintage?: number
  abv?: number
  bodyLevel?: number
  acidityLevel?: number
  sweetnessLevel?: number
  classification?: string
  servingTemp?: string
  decanting?: string
  referencePriceMin?: number
  referencePriceMax?: number
  drinkingWindowStart?: number
  drinkingWindowEnd?: number
  vivinoRating?: number
  criticScores?: { RP?: number; WS?: number; JR?: number; JH?: number }
  tastingNotes?: string
  foodPairings?: string[]
  priceReview?: PriceReview
  aromaPrimary?: string[]
  aromaSecondary?: string[]
  aromaTertiary?: string[]
  balance?: number
  finish?: number
  intensity?: number
}

/**
 * 와인 메타 자동채움 hook — wineRepo.findById + AI 향/품질 평가 로드.
 * record-flow-container에서 wineRepo.findById 호출을 대체.
 */
export function useWineMeta(
  targetId: string | null,
  targetType: string,
  editRecordId: string | null,
) {
  const [wineData, setWineData] = useState<WineMetaData | null>(null)

  useEffect(() => {
    if (targetType !== 'wine' || !targetId) return
    let cancelled = false
    const tid = targetId

    async function loadWine() {
      try {
        const wine = await wineRepo.findById(tid)
        if (cancelled || !wine) return

        // 품종: variety가 있으면 그대로, 없으면 grape_varieties에서 비중 최고 선택
        let bestVariety = wine.variety ?? undefined
        if (!bestVariety && wine.grapeVarieties.length > 0) {
          const sorted = [...wine.grapeVarieties].sort((a, b) => b.pct - a.pct)
          bestVariety = sorted[0].name
        }

        const data: WineMetaData = {
          wineType: wine.wineType,
          region: wine.region ?? undefined,
          subRegion: wine.subRegion ?? undefined,
          appellation: wine.appellation ?? undefined,
          country: wine.country ?? undefined,
          variety: bestVariety,
          grapeVarieties: wine.grapeVarieties.length > 0 ? wine.grapeVarieties : undefined,
          producer: wine.producer ?? undefined,
          vintage: wine.vintage ?? undefined,
          abv: wine.abv ?? undefined,
          bodyLevel: wine.bodyLevel ?? undefined,
          acidityLevel: wine.acidityLevel ?? undefined,
          sweetnessLevel: wine.sweetnessLevel ?? undefined,
          classification: wine.classification ?? undefined,
          servingTemp: wine.servingTemp ?? undefined,
          decanting: wine.decanting ?? undefined,
          referencePriceMin: wine.referencePriceMin ?? undefined,
          referencePriceMax: wine.referencePriceMax ?? undefined,
          drinkingWindowStart: wine.drinkingWindowStart ?? undefined,
          drinkingWindowEnd: wine.drinkingWindowEnd ?? undefined,
          vivinoRating: wine.vivinoRating ?? undefined,
          criticScores: wine.criticScores ?? undefined,
          tastingNotes: wine.tastingNotes ?? undefined,
          foodPairings: wine.foodPairings.length > 0 ? wine.foodPairings : undefined,
          priceReview: wine.priceReview ?? undefined,
        }
        if (!cancelled) setWineData(data)

        // AI 향/품질 평가 로드 (신규 기록 시에만, 편집 시에는 기존 기록값 사용)
        if (!editRecordId) {
          try {
            const aiRes = await fetch('/api/wines/detail-ai', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: wine.name, producer: wine.producer, vintage: wine.vintage }),
            })
            const aiData = await aiRes.json()
            if (!cancelled && aiData.success && aiData.wine) {
              setWineData((prev) => prev ? {
                ...prev,
                aromaPrimary: aiData.wine.aromaPrimary?.length > 0 ? aiData.wine.aromaPrimary : undefined,
                aromaSecondary: aiData.wine.aromaSecondary?.length > 0 ? aiData.wine.aromaSecondary : undefined,
                aromaTertiary: aiData.wine.aromaTertiary?.length > 0 ? aiData.wine.aromaTertiary : undefined,
                balance: aiData.wine.balance ?? undefined,
                finish: aiData.wine.finish ?? undefined,
                intensity: aiData.wine.intensity ?? undefined,
              } : prev)
            }
          } catch {
            // AI 조회 실패 시 무시 — 사용자가 직접 입력
          }
        }
      } catch {
        // 조회 실패 시 URL param 폴백
      }
    }
    loadWine()
    return () => { cancelled = true }
  }, [targetType, targetId, editRecordId])

  return { wineData, setWineData }
}
