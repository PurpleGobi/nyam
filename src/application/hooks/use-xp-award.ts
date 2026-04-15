'use client'

import { useState, useCallback } from 'react'
import type { DiningRecord } from '@/domain/entities/record'
import type { XpCalculationResult, LevelThreshold } from '@/domain/entities/xp'
import { useXpCalculation } from '@/application/hooks/use-xp-calculation'
import { sendNotification } from '@/application/helpers/send-notification'

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
    previousRecordXp?: number,
  ): Promise<XpCalculationResult | null> => {
    setIsLoading(true)
    try {
      const result = await processRecordXp(
        userId, record,
        restaurantArea, restaurantGenre,
        wineRegion, wineVariety,
        thresholds,
        previousRecordXp,
      )

      if (result) {
        for (const levelUp of result.levelUps) {
          const scopeLabel = levelUp.scope === 'total' ? '종합'
            : levelUp.scope === 'category' ? (levelUp.axisValue === 'restaurant' ? '식당' : '와인')
            : levelUp.axisValue ?? ''
          await sendNotification({
            userId,
            type: 'level_up',
            title: '레벨 업!',
            body: `${scopeLabel} Lv.${levelUp.newLevel} ${levelUp.title} 달성!`,
            actionStatus: null,
            actorId: null,
            targetType: null,
            targetId: null,
            bubbleId: null,
          })
        }
      }

      return result
    } finally {
      setIsLoading(false)
    }
  }, [processRecordXp])

  return { awardXp, isLoading }
}
