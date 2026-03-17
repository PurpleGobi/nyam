'use client'

import { cn } from '@/shared/utils/cn'

interface TagSelectorProps {
  label: string
  tags: readonly string[]
  selected: string[]
  onToggle: (tag: string) => void
  suggestedTags?: string[]
}

export function TagSelector({
  label,
  tags,
  selected,
  onToggle,
  suggestedTags = [],
}: TagSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-neutral-700">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const isSelected = selected.includes(tag)
          const isSuggested = !isSelected && suggestedTags.includes(tag)

          return (
            <button
              key={tag}
              type="button"
              onClick={() => onToggle(tag)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm transition-colors',
                isSelected && 'bg-[#FF6038] text-white',
                isSuggested && 'border border-dashed border-[#FF6038] text-[#FF6038] bg-white',
                !isSelected && !isSuggested && 'bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-300',
              )}
            >
              {tag}
            </button>
          )
        })}
      </div>
    </div>
  )
}
