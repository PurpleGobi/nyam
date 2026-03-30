'use client'

import { useState, useEffect } from 'react'
import type { AxisType } from '@/domain/entities/xp'
import { xpRepo } from '@/shared/di/container'

interface AxisLevel {
  axisValue: string
  level: number
}

/**
 * 특정 축의 레벨 조회 — 식당/와인 상세에서 관련 세부 축 레벨 표시용.
 */
export function useAxisLevel(
  userId: string | null,
  axes: { axisType: AxisType; axisValue: string | null }[],
) {
  const [levels, setLevels] = useState<AxisLevel[]>([])

  useEffect(() => {
    if (!userId) return
    const validAxes = axes.filter((a) => a.axisValue !== null) as { axisType: AxisType; axisValue: string }[]
    if (validAxes.length === 0) return

    Promise.all(
      validAxes.map(async ({ axisType, axisValue }) => {
        const exp = await xpRepo.getUserExperience(userId, axisType, axisValue)
        return { axisValue, level: exp?.level ?? 1 }
      }),
    ).then(setLevels)
  }, [userId, axes.map((a) => `${a.axisType}:${a.axisValue}`).join(',')])  // eslint-disable-line react-hooks/exhaustive-deps

  return levels
}
