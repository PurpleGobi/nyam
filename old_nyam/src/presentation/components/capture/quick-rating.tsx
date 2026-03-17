'use client'

import { Star } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

interface QuickRatingProps {
  rating: number
  comment: string
  onRatingChange: (rating: number) => void
  onCommentChange: (comment: string) => void
}

export function QuickRating({
  rating,
  comment,
  onRatingChange,
  onCommentChange,
}: QuickRatingProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onRatingChange(n)}
            className="transition-transform active:scale-90"
            aria-label={`${n}점`}
          >
            <Star
              className={cn(
                'size-8 transition-colors',
                n <= rating
                  ? 'fill-[#E9B949] text-[#E9B949]'
                  : 'fill-none text-neutral-200',
              )}
            />
          </button>
        ))}
      </div>

      <input
        type="text"
        value={comment}
        onChange={(e) => onCommentChange(e.target.value)}
        placeholder="한줄평 (선택)"
        className={cn(
          'w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm',
          'placeholder:text-neutral-400 focus:outline-none focus:border-[#FF6038] transition-colors',
        )}
      />
    </div>
  )
}
