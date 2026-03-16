import { Trophy, ThumbsUp, ThumbsDown, Users } from 'lucide-react'
import type { ComparisonResult } from '@/domain/entities/comparison-result'
import { cn } from '@/shared/utils/cn'

interface ComparisonResultViewProps {
  readonly result: ComparisonResult
}

const RANK_STYLES = [
  'bg-amber-50 border-amber-200 text-amber-700',
  'bg-slate-50 border-slate-200 text-slate-600',
  'bg-orange-50 border-orange-200 text-orange-600',
]

export function ComparisonResultView({ result }: ComparisonResultViewProps) {
  const { restaurants, summary } = result

  if (restaurants.length === 0 && summary) {
    return (
      <div className="rounded-xl bg-[var(--color-neutral-50)] p-4">
        <p className="text-sm leading-relaxed text-[var(--color-neutral-700)] whitespace-pre-wrap">
          {summary}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Summary */}
      {summary && (
        <div className="rounded-xl bg-[var(--color-primary-50)] p-3">
          <p className="text-sm leading-relaxed text-[var(--color-primary-700)]">
            {summary}
          </p>
        </div>
      )}

      {/* Ranked entries */}
      {restaurants.map((entry, idx) => (
        <div
          key={entry.restaurantId}
          className={cn(
            'rounded-xl border p-3',
            RANK_STYLES[idx] ?? 'bg-[var(--color-neutral-50)] border-[var(--color-neutral-200)]',
          )}
        >
          {/* Header: rank + name + score */}
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {idx === 0 && <Trophy size={16} className="text-amber-500" />}
              <span className="text-xs font-semibold opacity-60">
                {idx + 1}위
              </span>
              <span className="font-semibold">{entry.restaurantName}</span>
            </div>
            <span className="rounded-full bg-white/60 px-2 py-0.5 text-sm font-bold">
              {entry.score}/10
            </span>
          </div>

          {/* Pros & Cons */}
          <div className="flex flex-col gap-1.5 text-sm">
            {entry.pros.length > 0 && (
              <div className="flex items-start gap-1.5">
                <ThumbsUp size={13} className="mt-0.5 shrink-0 text-green-600" />
                <span>{entry.pros.join(', ')}</span>
              </div>
            )}
            {entry.cons.length > 0 && (
              <div className="flex items-start gap-1.5">
                <ThumbsDown size={13} className="mt-0.5 shrink-0 text-red-500" />
                <span>{entry.cons.join(', ')}</span>
              </div>
            )}
            {entry.situationFit && (
              <div className="flex items-start gap-1.5">
                <Users size={13} className="mt-0.5 shrink-0 text-blue-500" />
                <span className="text-xs">{entry.situationFit}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
