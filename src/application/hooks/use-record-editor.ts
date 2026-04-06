'use client'

import { useState, useEffect } from 'react'
import type { DiningRecord } from '@/domain/entities/record'
import type { RecordPhoto } from '@/domain/entities/record-photo'
import { recordRepo, photoRepo, restaurantRepo, wineRepo } from '@/shared/di/container'

interface TargetMeta {
  targetName: string
  targetMeta: string
  /** 식당 전용 */
  genre?: string
  area?: string
  /** 와인 전용 — wineRepo.findById 결과를 그대로 전달 */
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
  priceReview?: unknown
}

interface UseRecordEditorResult {
  record: DiningRecord | null
  photos: RecordPhoto[]
  targetMeta: TargetMeta | null
  isLoading: boolean
}

/**
 * 수정 모드 기록 로드 hook.
 * recordRepo.findById + photoRepo.getPhotosByRecordId + restaurantRepo/wineRepo.findById (타입별 분기)
 */
export function useRecordEditor(recordId: string | null): UseRecordEditorResult {
  const [record, setRecord] = useState<DiningRecord | null>(null)
  const [photos, setPhotos] = useState<RecordPhoto[]>([])
  const [targetMeta, setTargetMeta] = useState<TargetMeta | null>(null)
  const [isLoading, setIsLoading] = useState(!!recordId)

  useEffect(() => {
    if (!recordId) return
    let cancelled = false
    const id = recordId

    async function loadRecord() {
      try {
        const [loadedRecord, existingPhotos] = await Promise.all([
          recordRepo.findById(id),
          photoRepo.getPhotosByRecordId(id),
        ])
        if (cancelled || !loadedRecord) return
        setRecord(loadedRecord)
        setPhotos(existingPhotos)

        // 대상(식당/와인) 정보 로드
        let meta: TargetMeta = { targetName: '', targetMeta: '' }

        if (loadedRecord.targetType === 'restaurant') {
          const restaurant = await restaurantRepo.findById(loadedRecord.targetId)
          if (restaurant) {
            meta = {
              targetName: restaurant.name,
              targetMeta: [restaurant.genre, restaurant.area].filter(Boolean).join(' · '),
              genre: restaurant.genre ?? undefined,
              area: Array.isArray(restaurant.area) ? restaurant.area[0] : (restaurant.area ?? undefined),
            }
          }
        } else {
          const wine = await wineRepo.findById(loadedRecord.targetId)
          if (wine) {
            meta = {
              targetName: wine.name,
              targetMeta: [wine.wineType, wine.region, wine.country].filter(Boolean).join(' · '),
              wineType: wine.wineType,
              region: wine.region ?? undefined,
              subRegion: wine.subRegion ?? undefined,
              appellation: wine.appellation ?? undefined,
              country: wine.country ?? undefined,
              variety: wine.variety ?? undefined,
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
          }
        }
        if (!cancelled) setTargetMeta(meta)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadRecord()
    return () => { cancelled = true }
  }, [recordId])

  return { record, photos, targetMeta, isLoading }
}
