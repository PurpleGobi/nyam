'use client'

import { cn } from '@/shared/utils/cn'
import { FOOD_CATEGORIES } from '@/shared/constants/categories'

interface CategoryTagProps {
  category: string
  size?: 'sm' | 'md'
  className?: string
}

export function CategoryTag({
  category,
  size = 'sm',
  className,
}: CategoryTagProps) {
  const found = FOOD_CATEGORIES.find((c) => c.value === category)
  const emoji = found?.emoji ?? '🍽️'
  const label = found?.label ?? category

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 bg-neutral-50 border border-neutral-200 rounded-full',
        size === 'sm' && 'text-xs px-2 py-0.5',
        size === 'md' && 'text-sm px-3 py-1',
        className,
      )}
    >
      <span>{emoji}</span>
      <span>{label}</span>
    </span>
  )
}
