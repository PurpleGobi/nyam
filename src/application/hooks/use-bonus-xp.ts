'use client'

import { useCallback } from 'react'
import type { BonusType, XpReason } from '@/domain/entities/xp'
import { BONUS_XP_MAP } from '@/domain/services/xp-calculator'
import { xpRepo } from '@/shared/di/container'

const BONUS_REASON_MAP: Record<BonusType, XpReason> = {
  onboard: 'bonus_onboard',
  first_record: 'bonus_first_record',
  first_bubble: 'bonus_first_bubble',
  first_share: 'bonus_first_share',
}

export function useBonusXp() {
  const awardBonus = useCallback(async (
    userId: string,
    bonusType: BonusType,
  ): Promise<number> => {
    const alreadyGranted = await xpRepo.hasBonusBeenGranted(userId, bonusType)
    if (alreadyGranted) return 0

    const xp = BONUS_XP_MAP[bonusType]
    await xpRepo.updateUserTotalXp(userId, xp)
    await xpRepo.createXpHistory({
      userId,
      recordId: null,
      axisType: null,
      axisValue: null,
      xpAmount: xp,
      reason: BONUS_REASON_MAP[bonusType],
    })

    return xp
  }, [])

  return { awardBonus }
}
