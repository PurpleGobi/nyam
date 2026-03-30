'use client'

import { getLevelColor, getLevelTitle } from '@/domain/services/xp-calculator'

interface AxisLevelBadgeProps {
  axisLabel: string
  level: number
}

export function AxisLevelBadge({ axisLabel, level }: AxisLevelBadgeProps) {
  const color = getLevelColor(level)
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
      style={{ backgroundColor: `${color}18`, color, fontSize: '11px', fontWeight: 600 }}
    >
      {axisLabel} Lv.{level}
    </span>
  )
}
