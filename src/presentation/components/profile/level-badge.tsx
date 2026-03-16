'use client'

import { cn } from '@/shared/utils/cn'

interface LevelBadgeProps {
  level: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

const SIZE_CLASSES: Record<string, string> = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
}

function getLevelStyle(level: number): string {
  if (level > 50) return 'bg-gradient-to-r from-amber-400 to-orange-500 text-white'
  if (level >= 31) return 'bg-amber-50 text-amber-700'
  if (level >= 16) return 'bg-purple-50 text-purple-700'
  if (level >= 6) return 'bg-blue-50 text-blue-700'
  return 'bg-neutral-100 text-neutral-600'
}

export function LevelBadge({
  level,
  size = 'md',
  showLabel = true,
  className,
}: LevelBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        SIZE_CLASSES[size],
        getLevelStyle(level),
        className,
      )}
    >
      {showLabel ? `냠 Lv.${level}` : level}
    </span>
  )
}
