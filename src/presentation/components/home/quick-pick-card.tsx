import { Star, MapPin, TrendingUp } from 'lucide-react'
import type { QuickPick } from '@/domain/entities/quick-pick'
import { cn } from '@/shared/utils/cn'

interface QuickPickCardProps {
  readonly quickPick: QuickPick
}

export function QuickPickCard({ quickPick }: QuickPickCardProps) {
  const { restaurant, score, reasons } = quickPick

  const avgRating = restaurant.ratings.length > 0
    ? restaurant.ratings.reduce((s, r) => s + (Number(r.rating) || 0), 0) / restaurant.ratings.length
    : null

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--color-primary-500)] to-[var(--color-primary-600)] p-4 text-white shadow-lg">
      {/* Score badge */}
      <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 backdrop-blur-sm">
        <TrendingUp size={14} strokeWidth={2.5} />
        <span className="text-sm font-bold">{score}</span>
      </div>

      {/* Label */}
      <span className="mb-2 inline-block rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
        오늘의 추천
      </span>

      {/* Restaurant name */}
      <h3 className="mb-1 text-xl font-bold leading-tight">{restaurant.name}</h3>

      {/* Meta info */}
      <div className="mb-2 flex items-center gap-3 text-sm text-white/80">
        <span>{restaurant.cuisine}</span>
        {avgRating !== null && (
          <span className="flex items-center gap-0.5">
            <Star size={12} className="fill-white/90 text-white/90" />
            {avgRating.toFixed(1)}
          </span>
        )}
        {restaurant.region && (
          <span className="flex items-center gap-0.5">
            <MapPin size={12} />
            {restaurant.region}
          </span>
        )}
      </div>

      {/* Reasons */}
      <div className="flex flex-wrap gap-1.5">
        {reasons.map(reason => (
          <span
            key={reason}
            className={cn(
              'rounded-full bg-white/15 px-2 py-0.5 text-xs font-medium',
            )}
          >
            {reason}
          </span>
        ))}
      </div>
    </div>
  )
}
