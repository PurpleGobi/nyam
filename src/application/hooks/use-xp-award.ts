'use client'

import { useState, useCallback } from 'react'
import type { DiningRecord } from '@/domain/entities/record'
import type { XpCalculationResult, LevelThreshold } from '@/domain/entities/xp'
import { useXpCalculation } from '@/application/hooks/use-xp-calculation'

/**
 * 기록 저장 시 XP 지급 진입점.
 * useXpCalculation의 processRecordXp를 감싸서 로딩 상태를 관리.
 */
export function useXpAward() {
  const [isLoading, setIsLoading] = useState(false)
  const { processRecordXp } = useXpCalculation()

  const awardXp = useCallback(async (
    userId: string,
    record: DiningRecord,
    restaurantArea: string | null,
    restaurantGenre: string | null,
    wineRegion: string | null,
    wineVariety: string | null,
    thresholds: LevelThreshold[],
  ): Promise<XpCalculationResult | null> => {
    setIsLoading(true)
    try {
      return await processRecordXp(
        userId, record,
        restaurantArea, restaurantGenre,
        wineRegion, wineVariety,
        thresholds,
      )
    } finally {
      setIsLoading(false)
    }
  }, [processRecordXp])

  return { awardXp, isLoading }
}
