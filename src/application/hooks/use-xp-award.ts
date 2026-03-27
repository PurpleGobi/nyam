'use client'

import { useState, useCallback } from 'react'
import type { XpHistory } from '@/domain/entities/xp'
import { xpRepo } from '@/shared/di/container'

export function useXpAward() {
  const [isLoading, setIsLoading] = useState(false)

  const awardXp = useCallback(async (recordId: string, userId: string): Promise<XpHistory | null> => {
    setIsLoading(true)
    try {
      const todayCount = await xpRepo.getTodayRecordCount(userId)

      // 일일 기록 XP 한도 초과 시 지급 안 함
      if (todayCount > 10) return null

      const history = await xpRepo.addXpHistory({
        userId,
        recordId,
        xpAmount: 10,
        reason: 'record_full',
      })

      await xpRepo.updateUserTotalXp(userId, 10)

      return history
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { awardXp, isLoading }
}
