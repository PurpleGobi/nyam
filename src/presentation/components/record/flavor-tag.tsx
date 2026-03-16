'use client'

import { cn } from '@/shared/utils/cn'

interface FlavorTagProps {
  tag: string
  type: 'flavor' | 'texture' | 'atmosphere'
  selected?: boolean
  onToggle?: () => void
  className?: string
}

const TYPE_STYLES = {
  flavor: {
    selected: 'bg-red-50 border-red-200 text-red-700',
    hover: 'hover:bg-red-50/50',
  },
  texture: {
    selected: 'bg-blue-50 border-blue-200 text-blue-700',
    hover: 'hover:bg-blue-50/50',
  },
  atmosphere: {
    selected: 'bg-purple-50 border-purple-200 text-purple-700',
    hover: 'hover:bg-purple-50/50',
  },
} as const

export function FlavorTag({
  tag,
  type,
  selected = false,
  onToggle,
  className,
}: FlavorTagProps) {
  const styles = TYPE_STYLES[type]

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!onToggle}
      className={cn(
        'inline-flex items-center rounded-full text-sm px-3 py-1 border transition-colors duration-200',
        selected
          ? styles.selected
          : 'bg-white border-neutral-200 text-neutral-600',
        onToggle && 'cursor-pointer',
        onToggle && !selected && styles.hover,
        !onToggle && 'cursor-default',
        className,
      )}
    >
      {tag}
    </button>
  )
}
