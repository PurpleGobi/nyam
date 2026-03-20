"use client"

import { useRouter } from "next/navigation"
import { Trophy, Loader2 } from "lucide-react"
import { useAuth } from "@/application/hooks/use-auth"
import { useComparison } from "@/application/hooks/use-comparison"
import { MatchupCard } from "@/presentation/components/comparison/matchup-card"
import { ComparisonResult } from "@/presentation/components/comparison/comparison-result"
import { EmptyState } from "@/presentation/components/ui/empty-state"
import { ROUTES } from "@/shared/constants/routes"

export function ComparisonContainer() {
  const router = useRouter()
  const { user } = useAuth()
  const {
    records,
    currentMatchup,
    round,
    totalRounds,
    selectWinner,
    result,
    isLoading,
    startComparison,
  } = useComparison(user?.id ?? null)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    )
  }

  if (records.length < 2) {
    return (
      <div className="px-4 pt-6 pb-4">
        <EmptyState
          icon={Trophy}
          title="비교 게임"
          description="기록이 2개 이상 필요해요. 맛 기록을 더 남겨보세요!"
          actionLabel="기록하러 가기"
          actionHref={ROUTES.RECORD}
        />
      </div>
    )
  }

  // Not started yet
  if (!currentMatchup && !result) {
    return (
      <div className="flex flex-col items-center gap-5 px-4 pt-6 pb-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
          <Trophy className="h-8 w-8 text-amber-500" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold text-neutral-800">비교 게임</h2>
          <p className="mt-1 text-sm text-neutral-500">
            내 기록 중 최고를 뽑아보세요!
          </p>
          <p className="mt-0.5 text-xs text-neutral-400">
            {records.length}개의 기록으로 토너먼트 시작
          </p>
        </div>
        <button
          type="button"
          onClick={() => startComparison()}
          className="rounded-xl bg-primary-500 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-600 active:scale-[0.98]"
        >
          시작하기
        </button>
      </div>
    )
  }

  // Show result
  if (result) {
    const winnerRecord = records.find((r) => r.id === result.winnerId)
    if (!winnerRecord) return null

    return (
      <div className="px-4 pt-6 pb-4">
        <ComparisonResult
          winner={{
            id: winnerRecord.id,
            title: winnerRecord.menuName ?? "이름 없음",
            thumbnailUrl: winnerRecord.photos[0]?.thumbnailUrl ?? null,
            overallRating: winnerRecord.ratingOverall ?? 0,
          }}
          totalMatchups={Math.ceil(Math.log2(records.length))}
          onViewRecord={(id) => router.push(`/records/${id}`)}
          onPlayAgain={() => startComparison()}
        />
      </div>
    )
  }

  // Show matchup
  if (!currentMatchup) return null

  return (
    <div className="px-4 pt-6 pb-4">
      <MatchupCard
        record1={{
          id: currentMatchup.recordA.id,
          title: currentMatchup.recordA.menuName ?? "이름 없음",
          thumbnailUrl: currentMatchup.recordA.photos[0]?.thumbnailUrl ?? null,
          overallRating: currentMatchup.recordA.ratingOverall ?? 0,
        }}
        record2={{
          id: currentMatchup.recordB.id,
          title: currentMatchup.recordB.menuName ?? "이름 없음",
          thumbnailUrl: currentMatchup.recordB.photos[0]?.thumbnailUrl ?? null,
          overallRating: currentMatchup.recordB.ratingOverall ?? 0,
        }}
        onSelect={selectWinner}
        round={round}
        totalRounds={totalRounds}
      />
    </div>
  )
}
