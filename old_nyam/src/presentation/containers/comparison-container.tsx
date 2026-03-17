'use client'

import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/presentation/providers/auth-provider'
import { useComparison, ASPECT_LABELS } from '@/application/hooks/use-comparison'
import { MatchupCard } from '@/presentation/components/comparison/matchup-card'
import { ComparisonResult } from '@/presentation/components/comparison/comparison-result'

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

const CATEGORY_LABEL: Record<string, string> = {
  korean: '한식',
  japanese: '일식',
  chinese: '중식',
  western: '양식',
  cafe: '카페',
  dessert: '디저트',
  wine: '와인',
  seafood: '해산물',
  meat: '고기',
  vegan: '채식',
  street: '분식',
}

export function ComparisonContainer() {
  const router = useRouter()
  const { user: authUser } = useAuthContext()
  const userId = authUser?.id

  const {
    step,
    loading,
    availableCategories,
    currentMatchup,
    results,
    totalMatches,
    completedMatches,
    startComparison,
    pickWinner,
    reset,
  } = useComparison(userId)

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6038]" />
        <p className="text-sm text-[var(--color-neutral-500)]">불러오는 중...</p>
      </div>
    )
  }

  // Category select step
  if (step === 'category-select') {
    return (
      <div className="flex flex-col gap-5 px-4 pt-4 pb-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-neutral-600)] hover:bg-[var(--color-neutral-100)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <h1 className="flex-1 text-center text-lg font-bold text-[var(--color-neutral-800)]">
            맛집 월드컵 🏆
          </h1>
          <div className="h-8 w-8" />
        </div>

        {/* Description */}
        <p className="text-center text-sm text-[var(--color-neutral-500)]">
          카테고리를 선택하고 나만의 맛집 순위를 정해보세요!
        </p>

        {/* Category Grid */}
        {availableCategories.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <span className="text-4xl">📝</span>
            <p className="text-sm text-[var(--color-neutral-500)]">
              같은 카테고리 기록이 4개 이상 필요해요
            </p>
            <button
              type="button"
              onClick={() => router.push('/record')}
              className="rounded-xl bg-[#FF6038] px-6 py-2.5 text-sm font-semibold text-white"
            >
              기록하러 가기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {availableCategories.map(({ category, count }) => {
              const emoji = CATEGORY_EMOJI[category] ?? '🍽️'
              const label = CATEGORY_LABEL[category] ?? category

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => startComparison(category)}
                  className="flex flex-col items-center gap-2 rounded-2xl bg-white p-5 shadow-sm transition-all hover:shadow-md active:scale-[0.97]"
                >
                  <span className="text-3xl">{emoji}</span>
                  <span className="text-sm font-bold text-[var(--color-neutral-800)]">{label}</span>
                  <span className="text-xs text-[var(--color-neutral-400)]">{count}개 기록</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Playing step
  if (step === 'playing' && currentMatchup) {
    const progressPercent = totalMatches > 0
      ? Math.round((completedMatches / totalMatches) * 100)
      : 0

    const aspectLabel = ASPECT_LABELS[currentMatchup.aspect] ?? currentMatchup.aspect

    return (
      <div className="flex flex-col gap-5 px-4 pt-4 pb-8">
        {/* Progress */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-[var(--color-neutral-500)]">
            <span>라운드 {currentMatchup.round}</span>
            <span>{completedMatches}/{totalMatches} 매치</span>
          </div>
          <div className="h-2 w-full rounded-full bg-[var(--color-neutral-100)]">
            <div
              className="h-2 rounded-full bg-[#FF6038] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Aspect Question */}
        <div className="text-center">
          <p className="text-lg font-bold text-[var(--color-neutral-800)]">
            {aspectLabel}은 어디가 더 좋았나요?
          </p>
        </div>

        {/* Matchup Cards */}
        <div className="flex items-stretch gap-3">
          <MatchupCard
            record={currentMatchup.recordA}
            onPick={() => pickWinner(currentMatchup.recordA.id)}
            side="left"
          />

          <div className="flex shrink-0 items-center">
            <span className="text-lg font-black text-[var(--color-neutral-300)]">VS</span>
          </div>

          <MatchupCard
            record={currentMatchup.recordB}
            onPick={() => pickWinner(currentMatchup.recordB.id)}
            side="right"
          />
        </div>
      </div>
    )
  }

  // Result step
  if (step === 'result' && results) {
    return (
      <div className="flex flex-col gap-5 px-4 pt-4 pb-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-neutral-600)] hover:bg-[var(--color-neutral-100)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <h1 className="flex-1 text-center text-lg font-bold text-[var(--color-neutral-800)]">
            맛집 월드컵 🏆
          </h1>
          <div className="h-8 w-8" />
        </div>

        <ComparisonResult
          rankings={results.rankings}
          aspectWinners={results.aspectWinners}
          onPlayAgain={reset}
          onGoHome={() => router.push('/')}
        />
      </div>
    )
  }

  // Fallback loading
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-[#FF6038]" />
    </div>
  )
}
