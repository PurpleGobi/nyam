'use client'

import { cn } from '@/shared/utils/cn'

interface ExperienceBadgeProps {
  axis: 'region' | 'genre' | 'scene'
  name: string
  level: number
  xp?: number
  xpToNext?: number
  className?: string
}

const AXIS_EMOJI: Record<ExperienceBadgeProps['axis'], string> = {
  region: '\uD83D\uDCCD',
  genre: '\uD83C\uDF74',
  scene: '\uD83C\uDFAD',
}

function getLevelStyle(level: number): string {
  if (level >= 9) return 'bg-amber-50 text-amber-600'
  if (level >= 7) return 'bg-purple-50 text-purple-600'
  if (level >= 5) return 'bg-green-50 text-green-600'
  if (level >= 3) return 'bg-blue-50 text-blue-600'
  return 'bg-neutral-100 text-neutral-500'
}

export function ExperienceBadge({
  axis,
  name,
  level,
  xp,
  xpToNext,
  className,
}: ExperienceBadgeProps) {
  const emoji = AXIS_EMOJI[axis]
  const levelStyle = getLevelStyle(level)
  const hasProgress =
    typeof xp === 'number' && typeof xpToNext === 'number' && xpToNext > 0
  const progressPercent = hasProgress
    ? Math.min(100, Math.round((xp / xpToNext) * 100))
    : 0

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-center gap-2 text-sm">
        <span>{emoji}</span>
        <span className="truncate font-medium text-neutral-700">{name}</span>
        <span
          className={cn(
            'ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
            levelStyle,
          )}
        >
          Lv.{level}
        </span>
      </div>
      {hasProgress && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full bg-[#FF6038] transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </div>
  )
}
