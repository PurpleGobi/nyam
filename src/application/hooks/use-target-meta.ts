'use client'

import { useCallback } from 'react'
import type { RecordTargetType } from '@/domain/entities/record'
import { restaurantRepo, wineRepo } from '@/shared/di/container'

interface TargetXpMeta {
  area: string | null
  genre: string | null
  region: string | null
  variety: string | null
}

/**
 * XP 적립 시 target(식당/와인) 메타 정보 조회 hook.
 * record-flow-container의 handleSubmit 내 restaurantRepo/wineRepo.findById 호출을 대체.
 */
export function useTargetMeta() {
  const fetchTargetXpMeta = useCallback(
    async (targetId: string, targetType: RecordTargetType): Promise<TargetXpMeta> => {
      if (targetType === 'restaurant') {
        const restaurant = await restaurantRepo.findById(targetId)
        return {
          area: restaurant?.area?.[0] ?? null,
          genre: restaurant?.genre ?? null,
          region: null,
          variety: null,
        }
      }

      const wine = await wineRepo.findById(targetId)
      let variety: string | null = null
      if (wine?.variety) {
        variety = wine.variety
      } else if (wine && wine.grapeVarieties.length > 0) {
        const sorted = [...wine.grapeVarieties].sort((a, b) => b.pct - a.pct)
        variety = sorted[0].name
      }
      return {
        area: null,
        genre: null,
        region: wine?.region ?? null,
        variety,
      }
    },
    [],
  )

  return { fetchTargetXpMeta }
}
