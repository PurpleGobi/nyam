'use client'

import { cn } from '@/shared/utils/cn'

const RATING_LABELS: Record<string, string> = {
  taste: '맛',
  value: '가성비',
  service: '서비스',
  atmosphere: '분위기',
  cleanliness: '청결',
  portion: '양',
  aroma: '향',
  body: '바디',
  acidity: '산미',
  finish: '여운',
  balance: '밸런스',
  difficulty: '난이도',
  timeSpent: '시간',
  reproducibility: '재현성',
}

interface RatingBarsProps {
  ratings: Record<string, number | null>
  maxRating?: number
  className?: string
}

export function RatingBars({
  ratings,
  maxRating = 5,
  className,
}: RatingBarsProps) {
  const entries = Object.entries(ratings).filter(
    (entry): entry is [string, number] => entry[1] != null,
  )

  if (entries.length === 0) return null

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {entries.map(([key, value]) => {
        const label = RATING_LABELS[key] ?? key
        const percentage = Math.min((value / maxRating) * 100, 100)

        return (
          <div key={key} className="flex items-center gap-1.5">
            <span className="w-8 shrink-0 text-xs text-neutral-500 truncate">
              {label}
            </span>
            <div className="flex-1 h-1 rounded-full bg-neutral-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#FF6038] transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="w-5 shrink-0 text-xs text-neutral-500 text-right">
              {value}
            </span>
          </div>
        )
      })}
    </div>
  )
}
