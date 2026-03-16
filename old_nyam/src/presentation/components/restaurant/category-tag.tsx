'use client';

import { FOOD_CATEGORIES } from '@/shared/constants/categories';
import { cn } from '@/shared/utils/cn';

export interface CategoryTagProps {
  /** Category label string matching a FoodCategory label */
  category: string;
  /** Tag size variant */
  size?: 'sm' | 'md';
}

const sizeStyles = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-3 py-1 text-xs',
} as const;

/**
 * Food category pill tag with category-specific colors.
 */
export function CategoryTag({ category, size = 'md' }: CategoryTagProps) {
  const found = FOOD_CATEGORIES.find((c) => c.label === category);
  const color = found?.color ?? 'var(--color-neutral-600)';
  const bgColor = found?.bgColor ?? 'var(--color-neutral-100)';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold whitespace-nowrap',
        sizeStyles[size],
      )}
      style={{ color, backgroundColor: bgColor }}
    >
      {category}
    </span>
  );
}
