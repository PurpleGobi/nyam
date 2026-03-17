'use client'

import { cn } from '@/shared/utils/cn'

interface RankingItem {
  id: string
  menuName: string
  category: string
  ratingOverall: number
  wins: number
  total: number
}

interface AspectWinnerItem {
  aspect: string
  menuName: string
}

interface ComparisonResultProps {
  rankings: RankingItem[]
  aspectWinners: AspectWinnerItem[]
  onPlayAgain: () => void
  onGoHome: () => void
}

const MEDALS = ['🥇', '🥈', '🥉']

export function ComparisonResult({
  rankings,
  aspectWinners,
  onPlayAgain,
  onGoHome,
}: ComparisonResultProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[var(--color-neutral-800)]">
          🏆 결과
        </h2>
      </div>

      {/* Rankings */}
      <div className="flex flex-col gap-3">
        {rankings.map((entry, index) => {
          const medal = MEDALS[index] ?? `${index + 1}위`
          const winRate = entry.total > 0
            ? Math.round((entry.wins / entry.total) * 100)
            : 0

          return (
            <div
              key={entry.id}
              className={cn(
                'flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm',
                index === 0 && 'ring-2 ring-[#FF6038]/30 shadow-md',
              )}
            >
              <span className="text-2xl w-10 text-center shrink-0">
                {medal}
              </span>

              <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-[var(--color-neutral-800)] truncate">
                    {entry.menuName || '이름 없음'}
                  </span>
                  <span className="text-xs font-semibold text-[#FF6038] shrink-0 tabular-nums">
                    {winRate}%
                  </span>
                </div>

                {/* Win rate bar */}
                <div className="h-2 w-full rounded-full bg-[var(--color-neutral-100)]">
                  <div
                    className={cn(
                      'h-2 rounded-full transition-all duration-500',
                      index === 0 ? 'bg-[#FF6038]' : index === 1 ? 'bg-[#FF6038]/70' : 'bg-[#FF6038]/40',
                    )}
                    style={{ width: `${winRate}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Aspect Winners */}
      {aspectWinners.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-[var(--color-neutral-600)]">
            📊 부문별 1위
          </h3>
          <div className="flex flex-wrap gap-2">
            {aspectWinners.map((aw) => (
              <div
                key={aw.aspect}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs shadow-sm"
              >
                <span className="font-medium text-[var(--color-neutral-500)]">{aw.aspect}</span>
                <span className="font-bold text-[var(--color-neutral-800)]">{aw.menuName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* XP Badge */}
      <div className="flex justify-center">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#FF6038]/10 px-3 py-1.5 text-xs font-bold text-[#FF6038]">
          +5 XP 획득!
        </span>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onGoHome}
          className="flex-1 rounded-xl border border-[var(--color-neutral-200)] bg-white py-3 text-sm font-semibold text-[var(--color-neutral-600)] transition-colors hover:bg-[var(--color-neutral-50)]"
        >
          홈으로
        </button>
        <button
          type="button"
          onClick={onPlayAgain}
          className="flex-1 rounded-xl bg-[#FF6038] py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          다시하기
        </button>
      </div>
    </div>
  )
}
