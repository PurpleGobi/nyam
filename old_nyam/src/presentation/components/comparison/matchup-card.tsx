'use client'

import { cn } from '@/shared/utils/cn'

interface MatchupCardProps {
  record: { id: string; menuName: string; category: string; ratingOverall: number }
  onPick: () => void
  side: 'left' | 'right'
}

const CATEGORY_EMOJI: Record<string, string> = {
  korean: '🍚',
  japanese: '🍣',
  chinese: '🥟',
  western: '🍝',
  cafe: '☕',
  dessert: '🍰',
  wine: '🍷',
  seafood: '🦐',
  meat: '🥩',
  vegan: '🥗',
  street: '🍢',
}

export function MatchupCard({ record, onPick, side }: MatchupCardProps) {
  const emoji = CATEGORY_EMOJI[record.category] ?? '🍽️'

  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        'flex flex-1 flex-col gap-3 rounded-2xl bg-white p-5 shadow-md',
        'border-2 border-transparent transition-all duration-200',
        'hover:border-[#FF6038] hover:shadow-lg',
        'active:scale-[0.97] active:border-[#FF6038]',
        side === 'left' ? 'items-start text-left' : 'items-end text-right',
      )}
    >
      <span className="text-3xl">{emoji}</span>

      <div className={cn('flex flex-col gap-1', side === 'right' && 'items-end')}>
        <span className="text-base font-bold text-[var(--color-neutral-800)] line-clamp-2">
          {record.menuName || '이름 없음'}
        </span>
        <span className="inline-block rounded-full bg-[var(--color-neutral-100)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-neutral-500)]">
          {record.category || '미분류'}
        </span>
      </div>

      <div className={cn('flex items-center gap-1', side === 'right' && 'flex-row-reverse')}>
        <span className="text-sm text-yellow-500">★</span>
        <span className="text-sm font-semibold text-[var(--color-neutral-700)] tabular-nums">
          {record.ratingOverall > 0 ? record.ratingOverall : '-'}
        </span>
      </div>
    </button>
  )
}
