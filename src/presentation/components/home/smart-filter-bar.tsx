import { SlidersHorizontal, X } from 'lucide-react'
import type { CuisineCategory } from '@/domain/entities/restaurant'
import { cn } from '@/shared/utils/cn'

interface SmartFilterBarProps {
  readonly region: string | null
  readonly cuisineCategory: CuisineCategory | null
  readonly situation: string | null
  readonly partySize: string | null
  readonly budget: string | null
  readonly expanded: boolean
  readonly onToggle: () => void
  readonly onClearFilter: (key: string) => void
}

export function SmartFilterBar({
  region,
  cuisineCategory,
  situation,
  partySize,
  budget,
  expanded,
  onToggle,
  onClearFilter,
}: SmartFilterBarProps) {
  const chips: { key: string; label: string }[] = []
  if (situation) chips.push({ key: 'situation', label: situation })
  if (region) chips.push({ key: 'region', label: region })
  if (cuisineCategory) chips.push({ key: 'cuisineCategory', label: cuisineCategory })
  if (partySize) chips.push({ key: 'partySize', label: partySize })
  if (budget) chips.push({ key: 'budget', label: budget })

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'flex items-center gap-2 rounded-xl px-3 py-2 transition-all',
        expanded
          ? 'bg-[var(--color-primary-50)] ring-1 ring-[var(--color-primary-200)]'
          : 'bg-[var(--color-neutral-50)]',
      )}
    >
      <SlidersHorizontal size={14} className="shrink-0 text-[var(--color-neutral-500)]" />

      {chips.length > 0 ? (
        <div className="flex flex-1 gap-1.5 overflow-x-auto">
          {chips.map(chip => (
            <span
              key={chip.key}
              className="flex shrink-0 items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-[var(--color-neutral-700)] shadow-sm"
            >
              {chip.label}
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation()
                  onClearFilter(chip.key)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.stopPropagation()
                    onClearFilter(chip.key)
                  }
                }}
                className="rounded-full p-0.5 hover:bg-[var(--color-neutral-100)]"
              >
                <X size={10} />
              </span>
            </span>
          ))}
        </div>
      ) : (
        <span className="text-xs text-[var(--color-neutral-400)]">
          필터 설정하기
        </span>
      )}
    </button>
  )
}
