'use client'

import { useCallback } from 'react'
import type { SocialAction } from '@/domain/entities/xp'
import { calculateSocialXp } from '@/domain/services/xp-calculator'
import { xpRepo } from '@/shared/di/container'

const SOCIAL_REASON_MAP: Record<SocialAction, `social_${SocialAction}`> = {
  share: 'social_share',
  like: 'social_like',
  follow: 'social_follow',
  mutual: 'social_mutual',
}

export function useSocialXp() {
  const awardSocialXp = useCallback(async (
    userId: string,
    action: SocialAction,
  ): Promise<number> => {
    const today = new Date().toISOString().split('T')[0]
    const dailyCounts = await xpRepo.getDailySocialCounts(userId, today)
    const xp = calculateSocialXp(action, dailyCounts)

    if (xp <= 0) return 0

    await xpRepo.updateUserTotalXp(userId, xp)
    await xpRepo.createXpHistory({
      userId,
      recordId: null,
      axisType: null,
      axisValue: null,
      xpAmount: xp,
      reason: SOCIAL_REASON_MAP[action],
    })

    return xp
  }, [])

  return { awardSocialXp }
}
